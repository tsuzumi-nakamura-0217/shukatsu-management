import { supabase } from "../supabase";
import { normalizeDateTime, toISODate, toISODateTime } from "./utils";
import { getCompany } from "./companies";
import type { Task, TaskCreate } from "@/types";

export function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    companyId: (row.company_id as string) || "",
    companySlug: (row.company_slug as string) || "",
    companyName: (row.company_name as string) || "",
    category: (row.category as string) || "その他",
    executionDate: toISODate(row.execution_date as string),
    deadline: toISODateTime(row.deadline as string),
    status: (row.status as "未着手" | "進行中" | "完了") || "未着手",
    memo: (row.memo as string) || "",
    notionPageId: (row.notion_page_id as string) || undefined,
    createdAt: toISODate(row.created_at as string),
    updatedAt: (row.updated_at as string) || "",
  };
}

export async function getAllTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(rowToTask);
}

export async function getTask(id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return rowToTask(data);
}

export async function createTask(input: TaskCreate): Promise<Task> {
  const company = await getCompany(input.companySlug);

  const row = {
    company_id: company?.id || null,
    company_slug: input.companySlug,
    company_name: company?.name || "",
    title: input.title,
    category: input.category || "その他",
    execution_date: input.executionDate || null,
    deadline: normalizeDateTime(input.deadline) || null,
    status: input.status || "未着手",
    memo: input.memo || "",
  };

  const { data, error } = await supabase
    .from("tasks")
    .insert(row)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create task: ${error?.message}`);
  }

  return rowToTask(data);
}

export async function updateTask(
  id: string,
  updates: Partial<Task>
): Promise<Task | null> {
  // Convert camelCase to snake_case for DB
  const dbUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.executionDate !== undefined)
    dbUpdates.execution_date = updates.executionDate?.trim() || null;
  if (updates.deadline !== undefined)
    dbUpdates.deadline = normalizeDateTime(updates.deadline) || null;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.memo !== undefined) dbUpdates.memo = updates.memo;
  if (updates.notionPageId !== undefined)
    dbUpdates.notion_page_id = updates.notionPageId;
  if (updates.companySlug !== undefined) {
    dbUpdates.company_slug = updates.companySlug;
    const company = await getCompany(updates.companySlug);
    if (company) {
      dbUpdates.company_id = company.id;
      dbUpdates.company_name = company.name;
    }
  }
  if (updates.companyName !== undefined)
    dbUpdates.company_name = updates.companyName;

  const { data, error } = await supabase
    .from("tasks")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return null;
  return rowToTask(data);
}

export async function deleteTask(id: string): Promise<boolean> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  return !error;
}
