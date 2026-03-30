import { supabase } from "../supabase";
import type { Tip } from "@/types";

export function rowToTip(row: Record<string, unknown>): Tip {
  return {
    id: row.id as string,
    title: (row.title as string) || "",
    category: (row.category as string) || "その他",
    content: (row.content as string) || "",
  };
}

export async function getAllTips(): Promise<Tip[]> {
  const { data, error } = await supabase
    .from("tips")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(rowToTip);
}

export async function saveTip(
  id: string | null,
  title: string,
  category: string,
  content: string
): Promise<Tip> {
  if (id) {
    const { data, error } = await supabase
      .from("tips")
      .update({ title, category, content, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update tip: ${error?.message}`);
    }
    return rowToTip(data);
  } else {
    const { data, error } = await supabase
      .from("tips")
      .insert({ title, category, content })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create tip: ${error?.message}`);
    }
    return rowToTip(data);
  }
}

export async function deleteTip(id: string): Promise<boolean> {
  const { error } = await supabase.from("tips").delete().eq("id", id);
  return !error;
}
