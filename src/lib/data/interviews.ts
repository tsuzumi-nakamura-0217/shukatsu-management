import { supabase } from "../supabase";
import { toISODate } from "./utils";
import { getCompany } from "./companies";
import type { Interview, InterviewCreate } from "@/types";

export function rowToInterview(row: Record<string, unknown>): Interview {
  return {
    id: row.id as string,
    companyId: (row.company_id as string) || "",
    companySlug: (row.company_slug as string) || "",
    type: (row.type as string) || "",
    date: (row.date as string) || "",
    location: (row.location as string) || "",
    result: (row.result as string) || "結果待ち",
    memo: (row.memo as string) || "",
    createdAt: toISODate(row.created_at as string),
    updatedAt: (row.updated_at as string) || "",
  };
}

export async function getAllInterviews(): Promise<Interview[]> {
  const { data, error } = await supabase
    .from("interviews")
    .select("*")
    .order("date", { ascending: false });

  if (error || !data) return [];
  return data.map(rowToInterview);
}

export async function getInterviews(
  companySlug: string
): Promise<Interview[]> {
  const { data, error } = await supabase
    .from("interviews")
    .select("*")
    .eq("company_slug", companySlug)
    .order("date", { ascending: false });

  if (error || !data) return [];
  return data.map(rowToInterview);
}

export async function createInterview(
  companySlug: string,
  input: InterviewCreate
): Promise<Interview> {
  const company = await getCompany(companySlug);

  const row = {
    company_id: company?.id || null,
    company_slug: companySlug,
    type: input.type,
    date: input.date,
    location: input.location || "",
    result: input.result || "結果待ち",
    memo: input.memo || "",
  };

  const { data, error } = await supabase
    .from("interviews")
    .insert(row)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create interview: ${error?.message}`);
  }

  return rowToInterview(data);
}

export async function updateInterview(
  companySlug: string,
  id: string,
  updates: Partial<Interview>
): Promise<Interview | null> {
  const dbUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.date !== undefined) dbUpdates.date = updates.date;
  if (updates.location !== undefined) dbUpdates.location = updates.location;
  if (updates.result !== undefined) dbUpdates.result = updates.result;
  if (updates.memo !== undefined) dbUpdates.memo = updates.memo;

  const { data, error } = await supabase
    .from("interviews")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return null;
  return rowToInterview(data);
}

export async function deleteInterview(
  companySlug: string,
  id: string
): Promise<boolean> {
  const { error } = await supabase.from("interviews").delete().eq("id", id);
  return !error;
}
