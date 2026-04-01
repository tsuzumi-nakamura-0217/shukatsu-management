import { supabase } from "../supabase";
import { getCompany } from "./companies";
import type { ESDocument } from "@/types";

export function rowToESDocument(row: Record<string, unknown>): ESDocument {
  const companyData = row.companies as { name: string } | undefined;

  return {
    id: row.id as string,
    companyId: (row.company_id as string) || "",
    companySlug: (row.company_slug as string) || "",
    companyName: companyData?.name || "",
    title: (row.title as string) || "",
    content: (row.content as string) || "",
    characterLimit: (row.character_limit as number) || undefined,
    characterLimitType: (row.character_limit_type as "程度" | "以下" | "未満" | "") || undefined,
    status: (row.status as any) || "未提出",
    updatedAt: (row.updated_at as string) || "",
  };
}

export async function getAllESDocuments(): Promise<ESDocument[]> {
  const { data, error } = await supabase
    .from("es_documents")
    .select("*, companies(name)")
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return data.map(rowToESDocument);
}

export async function getESDocuments(
  companySlug: string
): Promise<ESDocument[]> {
  const { data, error } = await supabase
    .from("es_documents")
    .select("*, companies(name)")
    .eq("company_slug", companySlug)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return data.map(rowToESDocument);
}

export async function saveESDocument(
  companySlug: string,
  id: string | null,
  title: string,
  content: string,
  characterLimit?: number,
  characterLimitType?: string,
  status?: string

): Promise<ESDocument> {
  const company = await getCompany(companySlug);

  if (id) {
    // Update existing
    const { data, error } = await supabase
      .from("es_documents")
      .update({
        title,
        content,
        character_limit: characterLimit || null,
        character_limit_type: characterLimitType || null,
        status: status || "未提出",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*, companies(name)")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update ES document: ${error?.message}`);
    }
    return rowToESDocument(data);
  } else {
    // Create new
    const row = {
      company_id: company?.id || null,
      company_slug: companySlug,
      title,
      content,
      character_limit: characterLimit || null,
      character_limit_type: characterLimitType || null,
      status: status || "未提出",
    };

    const { data, error } = await supabase
      .from("es_documents")
      .insert(row)
      .select("*, companies(name)")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create ES document: ${error?.message}`);
    }
    return rowToESDocument(data);
  }
}

export async function deleteESDocument(
  companySlug: string,
  id: string
): Promise<boolean> {
  const { error } = await supabase.from("es_documents").delete().eq("id", id);
  return !error;
}
