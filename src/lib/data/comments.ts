import { supabase } from "../supabase";
import { getSupabaseAdmin } from "../supabase-admin";
import type { ESComment } from "@/types";

function rowToESComment(row: Record<string, unknown>): ESComment {
  return {
    id: row.id as string,
    esDocumentId: (row.es_document_id as string) || "",
    content: (row.content as string) || "",
    highlightedText: (row.highlighted_text as string) || "",
    positionFrom: (row.position_from as number) || 0,
    positionTo: (row.position_to as number) || 0,
    resolved: (row.resolved as boolean) || false,
    authorName: (row.author_name as string) || null,
    createdAt: (row.created_at as string) || "",
    updatedAt: (row.updated_at as string) || "",
  };
}

export async function getComments(esDocumentId: string): Promise<ESComment[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = getSupabaseAdmin();
  const { data: esDoc } = await admin
    .from("es_documents")
    .select("user_id")
    .eq("id", esDocumentId)
    .single();

  if (!esDoc || esDoc.user_id !== user.id) return [];

  const { data, error } = await admin
    .from("es_comments")
    .select("*")
    .eq("es_document_id", esDocumentId)
    .order("position_from", { ascending: true });

  if (error || !data) return [];
  return data.map(rowToESComment);
}

export async function createComment(
  esDocumentId: string,
  content: string,
  highlightedText: string,
  positionFrom: number,
  positionTo: number
): Promise<ESComment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const admin = getSupabaseAdmin();
  const { data: esDoc } = await admin
    .from("es_documents")
    .select("user_id")
    .eq("id", esDocumentId)
    .single();

  if (!esDoc || esDoc.user_id !== user.id) throw new Error("Unauthorized");

  const { data, error } = await admin
    .from("es_comments")
    .insert({
      es_document_id: esDocumentId,
      content,
      highlighted_text: highlightedText,
      position_from: positionFrom,
      position_to: positionTo,
      user_id: user.id,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create comment: ${error?.message}`);
  }
  return rowToESComment(data);
}

export async function updateComment(
  id: string,
  updates: { content?: string; resolved?: boolean }
): Promise<ESComment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const admin = getSupabaseAdmin();
  const { data: comment } = await admin
    .from("es_comments")
    .select("es_document_id")
    .eq("id", id)
    .single();

  if (!comment) throw new Error("Comment not found");

  const { data: esDoc } = await admin
    .from("es_documents")
    .select("user_id")
    .eq("id", comment.es_document_id)
    .single();

  if (!esDoc || esDoc.user_id !== user.id) throw new Error("Unauthorized");

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.content !== undefined) {
    updateData.content = updates.content;
  }
  if (updates.resolved !== undefined) {
    updateData.resolved = updates.resolved;
  }

  const { data, error } = await admin
    .from("es_comments")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to update comment: ${error?.message}`);
  }
  return rowToESComment(data);
}

export async function deleteComment(id: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const admin = getSupabaseAdmin();
  const { data: comment } = await admin
    .from("es_comments")
    .select("es_document_id")
    .eq("id", id)
    .single();

  if (!comment) return false;

  const { data: esDoc } = await admin
    .from("es_documents")
    .select("user_id")
    .eq("id", comment.es_document_id)
    .single();

  if (!esDoc || esDoc.user_id !== user.id) return false;

  const { error } = await admin.from("es_comments").delete().eq("id", id);
  return !error;
}

// ── Shared (Anonymous) Comment Functions ──
// These use the admin client to bypass user-based RLS.

export async function getCommentsByShareToken(shareToken: string): Promise<ESComment[]> {
  const admin = getSupabaseAdmin();
  // First get the ES document ID from the share token
  const { data: esDoc } = await admin
    .from("es_documents")
    .select("id")
    .eq("share_token", shareToken)
    .single();

  if (!esDoc) return [];

  const { data, error } = await admin
    .from("es_comments")
    .select("*")
    .eq("es_document_id", esDoc.id)
    .order("position_from", { ascending: true });

  if (error || !data) return [];
  return data.map(rowToESComment);
}

export async function createCommentByShareToken(
  shareToken: string,
  content: string,
  highlightedText: string,
  positionFrom: number,
  positionTo: number,
  authorName?: string
): Promise<ESComment> {
  const admin = getSupabaseAdmin();
  const { data: esDoc } = await admin
    .from("es_documents")
    .select("id")
    .eq("share_token", shareToken)
    .single();

  if (!esDoc) throw new Error("Shared document not found");

  const { data, error } = await admin
    .from("es_comments")
    .insert({
      es_document_id: esDoc.id,
      content,
      highlighted_text: highlightedText,
      position_from: positionFrom,
      position_to: positionTo,
      author_name: authorName || null,
      user_id: null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create shared comment: ${error?.message}`);
  }
  return rowToESComment(data);
}

export async function updateCommentByShareToken(
  shareToken: string,
  commentId: string,
  updates: { content?: string; resolved?: boolean }
): Promise<ESComment> {
  const admin = getSupabaseAdmin();
  // Verify the comment belongs to a shared document
  const { data: esDoc } = await admin
    .from("es_documents")
    .select("id")
    .eq("share_token", shareToken)
    .single();

  if (!esDoc) throw new Error("Shared document not found");

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.content !== undefined) updateData.content = updates.content;
  if (updates.resolved !== undefined) updateData.resolved = updates.resolved;

  const { data, error } = await admin
    .from("es_comments")
    .update(updateData)
    .eq("id", commentId)
    .eq("es_document_id", esDoc.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to update shared comment: ${error?.message}`);
  }
  return rowToESComment(data);
}

export async function deleteCommentByShareToken(
  shareToken: string,
  commentId: string
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { data: esDoc } = await admin
    .from("es_documents")
    .select("id")
    .eq("share_token", shareToken)
    .single();

  if (!esDoc) return false;

  const { error } = await admin
    .from("es_comments")
    .delete()
    .eq("id", commentId)
    .eq("es_document_id", esDoc.id);
  return !error;
}
