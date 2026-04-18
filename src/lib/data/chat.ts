import { supabase } from "../supabase";

export type ChatRole = "user" | "assistant";

export const DEFAULT_CHAT_TITLE = "新しいチャット";

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
}

export interface ChatHistoryMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

type ChatConversationRow = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
};

type ChatMessageRow = {
  id: string;
  role: ChatRole;
  content: string;
  conversation_id: string;
  created_at: string;
};

function rowToChatConversation(row: ChatConversationRow): ChatConversation {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
  };
}

function rowToChatHistoryMessage(row: ChatMessageRow): ChatHistoryMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

export function buildConversationTitleFromMessage(message: string): string {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return DEFAULT_CHAT_TITLE;
  }

  const maxLength = 40;
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength)}...`
    : normalized;
}

export async function getChatConversations(limit = 100): Promise<ChatConversation[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 300);

  const { data, error } = await supabase
    .from("chat_conversations")
    .select("id, title, created_at, updated_at, last_message_at")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error || !data) {
    throw new Error(`Failed to fetch conversations: ${error?.message}`);
  }

  return data.map((row) => rowToChatConversation(row as ChatConversationRow));
}

export async function getChatConversation(
  conversationId: string
): Promise<ChatConversation | null> {
  const { data, error } = await supabase
    .from("chat_conversations")
    .select("id, title, created_at, updated_at, last_message_at")
    .eq("id", conversationId)
    .single();

  if (error || !data) {
    return null;
  }

  return rowToChatConversation(data as ChatConversationRow);
}

export async function createChatConversation(
  title = DEFAULT_CHAT_TITLE
): Promise<ChatConversation> {
  const safeTitle = title.trim() || DEFAULT_CHAT_TITLE;

  const { data, error } = await supabase
    .from("chat_conversations")
    .insert({ title: safeTitle })
    .select("id, title, created_at, updated_at, last_message_at")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create conversation: ${error?.message}`);
  }

  return rowToChatConversation(data as ChatConversationRow);
}

export async function updateChatConversationTitle(
  conversationId: string,
  title: string
): Promise<ChatConversation | null> {
  const safeTitle = title.trim();
  if (!safeTitle) {
    return getChatConversation(conversationId);
  }

  const { data, error } = await supabase
    .from("chat_conversations")
    .update({
      title: safeTitle,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .select("id, title, created_at, updated_at, last_message_at")
    .single();

  if (error || !data) {
    return null;
  }

  return rowToChatConversation(data as ChatConversationRow);
}

export async function getChatHistory(
  conversationId: string,
  limit = 200
): Promise<ChatHistoryMessage[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 500);

  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, role, content, conversation_id, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(safeLimit);

  if (error || !data) {
    throw new Error(`Failed to fetch chat history: ${error?.message}`);
  }

  return data.map((row) => rowToChatHistoryMessage(row as ChatMessageRow));
}

export async function saveChatHistoryMessages(
  conversationId: string,
  messages: Array<{ role: ChatRole; content: string }>
): Promise<void> {
  if (messages.length === 0) {
    return;
  }

  const nowIso = new Date().toISOString();
  const insertRows = messages.map((message) => ({
    conversation_id: conversationId,
    role: message.role,
    content: message.content,
  }));

  const { error } = await supabase.from("chat_messages").insert(insertRows);

  if (error) {
    throw new Error(`Failed to save chat history: ${error.message}`);
  }

  const { error: touchError } = await supabase
    .from("chat_conversations")
    .update({ updated_at: nowIso, last_message_at: nowIso })
    .eq("id", conversationId);

  if (touchError) {
    throw new Error(`Failed to update conversation activity: ${touchError.message}`);
  }
}

export async function clearConversationMessages(
  conversationId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("chat_messages")
    .delete({ count: "exact" })
    .eq("conversation_id", conversationId);

  if (error) {
    throw new Error(`Failed to clear chat history: ${error.message}`);
  }

  const { error: updateError } = await supabase
    .from("chat_conversations")
    .update({ updated_at: new Date().toISOString(), last_message_at: null })
    .eq("id", conversationId);

  if (updateError) {
    throw new Error(`Failed to update cleared conversation: ${updateError.message}`);
  }

  return count || 0;
}
