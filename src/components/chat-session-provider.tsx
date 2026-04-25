"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
}

type ChatSessionContextValue = {
  conversations: ChatConversation[];
  activeConversationId: string | null;
  messages: ChatMessage[];
  isLoadingConversations: boolean;
  isLoadingHistory: boolean;
  isSending: boolean;
  selectConversation: (conversationId: string) => void;
  createConversation: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => Promise<void>;
};

const ChatSessionContext = createContext<ChatSessionContextValue | null>(null);

type ChatApiResponse = {
  answer?: string;
  conversation?: ChatConversation;
  error?: string;
};

type ChatHistoryApiResponse = {
  conversationId?: string | null;
  messages?: ChatMessage[];
  error?: string;
};

type ConversationsApiResponse = {
  conversations?: ChatConversation[];
  conversation?: ChatConversation;
  error?: string;
};

type ChatDeleteApiResponse = {
  success?: boolean;
  conversation?: ChatConversation | null;
  error?: string;
};

function createMessage(role: ChatRole, content: string): ChatMessage {
  return {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export function ChatSessionProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const pathname = usePathname();
  const isPublicPath = pathname?.startsWith("/share") || pathname === "/login";

  const upsertConversation = useCallback((conversation: ChatConversation) => {
    setConversations((prev) => [conversation, ...prev.filter((item) => item.id !== conversation.id)]);
  }, []);

  const loadConversations = useCallback(async () => {
    if (isPublicPath) {
      setIsLoadingConversations(false);
      return;
    }

    setIsLoadingConversations(true);

    try {
      const response = await fetch("/api/chat/conversations?limit=100", {
        method: "GET",
      });
      const data = (await response.json().catch(() => ({}))) as ConversationsApiResponse;

      if (!response.ok) {
        throw new Error(data.error || "会話一覧の取得に失敗しました");
      }

      const nextConversations = Array.isArray(data.conversations)
        ? data.conversations
        : [];

      setConversations(nextConversations);
      setActiveConversationId((previousConversationId) => {
        if (
          previousConversationId &&
          nextConversations.some((conversation) => conversation.id === previousConversationId)
        ) {
          return previousConversationId;
        }
        return nextConversations[0]?.id ?? null;
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "会話一覧の取得に失敗しました";
      toast.error(errorMessage);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [isPublicPath]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    let active = true;

    const loadHistory = async () => {
      if (!activeConversationId) {
        setMessages([]);
        setIsLoadingHistory(false);
        return;
      }

      setIsLoadingHistory(true);

      try {
        const response = await fetch(
          `/api/chat?conversationId=${encodeURIComponent(activeConversationId)}&limit=200`,
          { method: "GET" }
        );
        const data = (await response.json().catch(() => ({}))) as ChatHistoryApiResponse;

        if (!active) {
          return;
        }

        if (!response.ok) {
          throw new Error(data.error || "会話履歴の取得に失敗しました");
        }

        setMessages(Array.isArray(data.messages) ? data.messages : []);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "会話履歴の取得に失敗しました";
        setMessages([]);
        toast.error(errorMessage);
      } finally {
        if (active) {
          setIsLoadingHistory(false);
        }
      }
    };

    void loadHistory();

    return () => {
      active = false;
    };
  }, [activeConversationId]);

  const selectConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
  }, []);

  const createConversation = useCallback(async () => {
    if (isSending) {
      return;
    }

    try {
      const response = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const data = (await response.json().catch(() => ({}))) as ConversationsApiResponse;

      if (!response.ok || !data.conversation) {
        throw new Error(data.error || "新しい会話の作成に失敗しました");
      }

      upsertConversation(data.conversation);
      setActiveConversationId(data.conversation.id);
      setMessages([]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "新しい会話の作成に失敗しました";
      toast.error(errorMessage);
    }
  }, [isSending, upsertConversation]);

  const sendMessage = useCallback(async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || isSending) {
      return;
    }

    setMessages((prev) => [...prev, createMessage("user", message)]);
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, conversationId: activeConversationId }),
      });

      const data = (await response.json().catch(() => ({}))) as ChatApiResponse;

      if (!response.ok || !data.answer) {
        throw new Error(data.error || "チャット応答の取得に失敗しました");
      }

      setMessages((prev) => [...prev, createMessage("assistant", data.answer || "")]);

      if (data.conversation) {
        upsertConversation(data.conversation);
        if (activeConversationId !== data.conversation.id) {
          setActiveConversationId(data.conversation.id);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "チャット応答の取得に失敗しました";
      setMessages((prev) => [
        ...prev,
        createMessage(
          "assistant",
          `エラーが発生しました。時間をおいて再試行してください。\n詳細: ${errorMessage}`
        ),
      ]);
      toast.error(errorMessage);
    } finally {
      setIsSending(false);
    }
  }, [activeConversationId, isSending, upsertConversation]);

  const clearMessages = useCallback(async () => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    const previous = messages;
    setMessages([]);

    try {
      const response = await fetch(
        `/api/chat?conversationId=${encodeURIComponent(activeConversationId)}`,
        {
        method: "DELETE",
        }
      );
      const data = (await response.json().catch(() => ({}))) as ChatDeleteApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error || "会話履歴の削除に失敗しました");
      }

      if (data.conversation) {
        upsertConversation(data.conversation);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "会話履歴の削除に失敗しました";
      setMessages(previous);
      toast.error(errorMessage);
    }
  }, [activeConversationId, messages, upsertConversation]);

  const value = useMemo<ChatSessionContextValue>(() => {
    return {
      conversations,
      activeConversationId,
      messages,
      isLoadingConversations,
      isLoadingHistory,
      isSending,
      selectConversation,
      createConversation,
      sendMessage,
      clearMessages,
    };
  }, [
    conversations,
    activeConversationId,
    messages,
    isLoadingConversations,
    isLoadingHistory,
    isSending,
    selectConversation,
    createConversation,
    sendMessage,
    clearMessages,
  ]);

  return <ChatSessionContext.Provider value={value}>{children}</ChatSessionContext.Provider>;
}

export function useChatSession(): ChatSessionContextValue {
  const context = useContext(ChatSessionContext);
  if (!context) {
    throw new Error("useChatSession must be used within ChatSessionProvider");
  }

  return context;
}
