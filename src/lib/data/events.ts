import { supabase } from "../supabase";
import { toISODate } from "./utils";
import { getCompany } from "./companies";
import type { CompanyEvent, CompanyEventCreate } from "@/types";

export function rowToEvent(row: Record<string, unknown>): CompanyEvent {
  return {
    id: row.id as string,
    companyId: (row.company_id as string) || "",
    companySlug: (row.company_slug as string) || "",
    title: (row.title as string) || "",
    type: (row.type as string) || "説明会",
    date: (row.date as string) || "",
    endDate: (row.end_date as string) || "",
    location: (row.location as string) || "",
    memo: (row.memo as string) || "",
    createdAt: toISODate(row.created_at as string),
    updatedAt: (row.updated_at as string) || "",
  };
}

export async function getAllEvents(): Promise<CompanyEvent[]> {
  const { data, error } = await supabase
    .from("company_events")
    .select("*")
    .order("date", { ascending: false });

  if (error || !data) return [];
  return data.map(rowToEvent);
}

export async function getEvents(companySlug: string): Promise<CompanyEvent[]> {
  const { data, error } = await supabase
    .from("company_events")
    .select("*")
    .eq("company_slug", companySlug)
    .order("date", { ascending: false });

  if (error || !data) return [];
  return data.map(rowToEvent);
}

export async function createEvent(
  companySlug: string,
  input: CompanyEventCreate
): Promise<CompanyEvent> {
  const company = await getCompany(companySlug);

  const row = {
    company_id: company?.id || null,
    company_slug: companySlug,
    title: input.title,
    type: input.type || "説明会",
    date: input.date,
    end_date: input.endDate || null,
    location: input.location || "",
    memo: input.memo || "",
  };

  const { data, error } = await supabase
    .from("company_events")
    .insert(row)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create event: ${error?.message}`);
  }

  return rowToEvent(data);
}

export async function updateEvent(
  companySlug: string,
  id: string,
  updates: Partial<CompanyEvent>
): Promise<CompanyEvent | null> {
  const dbUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.date !== undefined) dbUpdates.date = updates.date;
  if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
  if (updates.location !== undefined) dbUpdates.location = updates.location;
  if (updates.memo !== undefined) dbUpdates.memo = updates.memo;

  const { data, error } = await supabase
    .from("company_events")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return null;
  return rowToEvent(data);
}

export async function deleteEvent(
  companySlug: string,
  id: string
): Promise<boolean> {
  const { error } = await supabase.from("company_events").delete().eq("id", id);
  return !error;
}
