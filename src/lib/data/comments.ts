import { supabase } from "../supabase";
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
    createdAt: (row.created_at as string) || "",
    updatedAt: (row.updated_at as string) || "",
  };
}

export async function getComments(esDocumentId: string): Promise<ESComment[]> {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
    .from("es_comments")
    .insert({
      es_document_id: esDocumentId,
      content,
      highlighted_text: highlightedText,
      position_from: positionFrom,
      position_to: positionTo,
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
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.content !== undefined) {
    updateData.content = updates.content;
  }
  if (updates.resolved !== undefined) {
    updateData.resolved = updates.resolved;
  }

  const { data, error } = await supabase
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
  const { error } = await supabase.from("es_comments").delete().eq("id", id);
  return !error;
}
