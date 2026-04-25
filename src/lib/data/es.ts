import { supabase } from "../supabase";
import { getSupabaseAdmin } from "../supabase-admin";
import { getCompany } from "./companies";
import type { ESDocument } from "@/types";

function extractCompanyName(companies: unknown): string {
  if (Array.isArray(companies)) {
    const first = companies[0] as { name?: string | null } | undefined;
    return (first?.name || "").trim();
  }

  if (companies && typeof companies === "object") {
    const obj = companies as { name?: string | null };
    return (obj.name || "").trim();
  }

  return "";
}

export function rowToESDocument(row: Record<string, unknown>): ESDocument {
  const companyNameFromJoin = extractCompanyName(row.companies);
  const companyNameFromColumn = ((row.company_name as string) || "").trim();

  return {
    id: row.id as string,
    companyId: (row.company_id as string) || "",
    companySlug: (row.company_slug as string) || "",
    companyName: companyNameFromJoin || companyNameFromColumn,
    title: (row.title as string) || "",
    content: (row.content as string) || "",
    characterLimit: (row.character_limit as number) || undefined,
    characterLimitType: (row.character_limit_type as "程度" | "以下" | "未満" | "") || undefined,
    status: (row.status as any) || "未提出",
    shareToken: (row.share_token as string) || null,
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
        company_name: company?.name || "",
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
      company_name: company?.name || "",
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

// ── Share Token Functions ──

export async function generateShareToken(esDocId: string): Promise<string | null> {
  const token = crypto.randomUUID();
  const { error } = await supabase
    .from("es_documents")
    .update({ share_token: token })
    .eq("id", esDocId);

  if (error) {
    console.error("Failed to generate share token:", error.message);
    return null;
  }
  return token;
}

export async function removeShareToken(esDocId: string): Promise<boolean> {
  const { error } = await supabase
    .from("es_documents")
    .update({ share_token: null })
    .eq("id", esDocId);
  return !error;
}

export async function getShareToken(esDocId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("es_documents")
    .select("share_token")
    .eq("id", esDocId)
    .single();

  if (error || !data) return null;
  return (data.share_token as string) || null;
}

/**
 * Fetch an ES document by its share token.
 * Uses the admin client so that anonymous users can read shared documents.
 */
export async function getESDocumentByShareToken(shareToken: string): Promise<ESDocument | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("es_documents")
    .select("*, companies(name)")
    .eq("share_token", shareToken)
    .single();

  if (error || !data) return null;

  const esDoc = rowToESDocument(data);
  if (esDoc.companyName) {
    return esDoc;
  }

  const companyId = ((data.company_id as string) || "").trim();
  const companySlug = ((data.company_slug as string) || "").trim();
  const ownerUserId = ((data.user_id as string) || "").trim();

  if (companyId) {
    const { data: companyById } = await admin
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .maybeSingle();

    const nameFromId = ((companyById?.name as string) || "").trim();
    if (nameFromId) {
      return { ...esDoc, companyName: nameFromId };
    }
  }

  if (companySlug && ownerUserId) {
    const { data: companyBySlugAndOwner } = await admin
      .from("companies")
      .select("name")
      .eq("slug", companySlug)
      .eq("user_id", ownerUserId)
      .maybeSingle();

    const nameFromSlugAndOwner = ((companyBySlugAndOwner?.name as string) || "").trim();
    if (nameFromSlugAndOwner) {
      return { ...esDoc, companyName: nameFromSlugAndOwner };
    }
  }

  return esDoc;
}

/**
 * Update ES document content via share token (for shared/anonymous users).
 */
export async function updateESDocumentContentByShareToken(
  shareToken: string,
  content: string
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("es_documents")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("share_token", shareToken);
  return !error;
}
