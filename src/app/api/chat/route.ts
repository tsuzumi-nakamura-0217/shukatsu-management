import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { withAuthenticatedUser } from "@/lib/auth-server";
import {
  buildConversationTitleFromMessage,
  clearConversationMessages,
  createChatConversation,
  DEFAULT_CHAT_TITLE,
  getChatConversation,
  getChatHistory,
  saveChatHistoryMessages,
  updateChatConversationTitle,
} from "@/lib/data/chat";
import { getChatbotContext } from "@/lib/data/chat-context";
import { GEMINI_MODEL_NAME, generateChatbotAnswer } from "@/lib/gemini";

const MAX_MESSAGE_LENGTH = 2000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 12;

type RateLimitEntry = {
  windowStart: number;
  count: number;
};

const rateLimitMap = new Map<string, RateLimitEntry>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const current = rateLimitMap.get(userId);

  if (!current || now - current.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userId, { windowStart: now, count: 1 });
    return false;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  current.count += 1;

  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now - value.windowStart >= RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.delete(key);
      }
    }
  }

  return false;
}

type ChatRequestBody = {
  message?: unknown;
  conversationId?: unknown;
};

function toConversationId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { searchParams } = new URL(request.url);
      const conversationId = toConversationId(searchParams.get("conversationId"));
      const rawLimit = Number(searchParams.get("limit") || "200");
      const limit = Number.isFinite(rawLimit) ? rawLimit : 200;

      if (!conversationId) {
        return NextResponse.json({ conversationId: null, messages: [] });
      }

      const conversation = await getChatConversation(conversationId);
      if (!conversation) {
        return NextResponse.json(
          { error: "会話が見つかりません" },
          { status: 404 }
        );
      }

      const messages = await getChatHistory(conversationId, limit);

      return NextResponse.json({
        conversationId,
        messages,
      });
    } catch (error) {
      console.error("Chat history GET error:", error);
      return NextResponse.json(
        { error: "会話履歴の取得に失敗しました" },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { searchParams } = new URL(request.url);
      const conversationId = toConversationId(searchParams.get("conversationId"));

      if (!conversationId) {
        return NextResponse.json(
          { error: "conversationId は必須です" },
          { status: 400 }
        );
      }

      const conversation = await getChatConversation(conversationId);
      if (!conversation) {
        return NextResponse.json(
          { error: "会話が見つかりません" },
          { status: 404 }
        );
      }

      const deletedCount = await clearConversationMessages(conversationId);
      const updatedConversation = await getChatConversation(conversationId);

      return NextResponse.json({
        success: true,
        deletedCount,
        conversation: updatedConversation,
      });
    } catch (error) {
      console.error("Chat history DELETE error:", error);
      return NextResponse.json(
        { error: "会話履歴の削除に失敗しました" },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuthenticatedUser(request, async ({ userId }) => {
    try {
      if (isRateLimited(userId)) {
        return NextResponse.json(
          { error: "リクエストが多すぎます。少し待ってから再試行してください。" },
          { status: 429 }
        );
      }

      const body = (await request.json()) as ChatRequestBody;
      const message = typeof body.message === "string" ? body.message.trim() : "";
      const requestedConversationId = toConversationId(body.conversationId);

      if (!message) {
        return NextResponse.json(
          { error: "message は必須です" },
          { status: 400 }
        );
      }

      if (message.length > MAX_MESSAGE_LENGTH) {
        return NextResponse.json(
          { error: `message は ${MAX_MESSAGE_LENGTH} 文字以内で入力してください` },
          { status: 400 }
        );
      }

      let conversation = requestedConversationId
        ? await getChatConversation(requestedConversationId)
        : null;

      if (!conversation) {
        conversation = await createChatConversation();
      }

      if (conversation.title === DEFAULT_CHAT_TITLE) {
        const nextTitle = buildConversationTitleFromMessage(message);
        const renamedConversation = await updateChatConversationTitle(
          conversation.id,
          nextTitle
        );
        if (renamedConversation) {
          conversation = renamedConversation;
        }
      }

      const context = await getChatbotContext();
      const answer = await generateChatbotAnswer(message, context);

      // Keep chat available even when history persistence fails.
      try {
        await saveChatHistoryMessages(conversation.id, [
          { role: "user", content: message },
          { role: "assistant", content: answer },
        ]);
      } catch (historyError) {
        console.error("Chat history save error:", historyError);
      }

      const latestConversation = await getChatConversation(conversation.id);

      return NextResponse.json({
        answer,
        model: GEMINI_MODEL_NAME,
        conversation: latestConversation ?? conversation,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("GEMINI_API_KEY")) {
        return NextResponse.json(
          { error: "Gemini APIキーが設定されていません" },
          { status: 500 }
        );
      }

      console.error("Chat API error:", error);
      return NextResponse.json(
        { error: "チャット応答の生成に失敗しました" },
        { status: 500 }
      );
    }
  });
}
