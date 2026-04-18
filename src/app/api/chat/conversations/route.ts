import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { withAuthenticatedUser } from "@/lib/auth-server";
import { createChatConversation, getChatConversations } from "@/lib/data/chat";

type ConversationCreateBody = {
  title?: unknown;
};

export async function GET(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { searchParams } = new URL(request.url);
      const rawLimit = Number(searchParams.get("limit") || "100");
      const limit = Number.isFinite(rawLimit) ? rawLimit : 100;

      const conversations = await getChatConversations(limit);
      return NextResponse.json({ conversations });
    } catch (error) {
      console.error("Conversations GET error:", error);
      return NextResponse.json(
        { error: "会話一覧の取得に失敗しました" },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as ConversationCreateBody;
      const title = typeof body.title === "string" ? body.title.trim() : "";

      const conversation = await createChatConversation(title);
      return NextResponse.json({ conversation }, { status: 201 });
    } catch (error) {
      console.error("Conversations POST error:", error);
      return NextResponse.json(
        { error: "新しい会話の作成に失敗しました" },
        { status: 500 }
      );
    }
  });
}
