import { supabase } from "../supabase";
import type { SelfAnalysis } from "@/types";

export function rowToSelfAnalysis(row: Record<string, unknown>): SelfAnalysis {
  return {
    id: row.id as string,
    title: (row.title as string) || "",
    content: (row.content as string) || "",
  };
}

export async function getAllSelfAnalysis(): Promise<SelfAnalysis[]> {
  const { data, error } = await supabase
    .from("self_analysis")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(rowToSelfAnalysis);
}

export async function saveSelfAnalysis(
  id: string | null,
  title: string,
  content: string
): Promise<SelfAnalysis> {
  if (id) {
    const { data, error } = await supabase
      .from("self_analysis")
      .update({ title, content, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update self-analysis: ${error?.message}`);
    }
    return rowToSelfAnalysis(data);
  } else {
    const { data, error } = await supabase
      .from("self_analysis")
      .insert({ title, content })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create self-analysis: ${error?.message}`);
    }
    return rowToSelfAnalysis(data);
  }
}

export async function deleteSelfAnalysis(id: string): Promise<boolean> {
  const { error } = await supabase.from("self_analysis").delete().eq("id", id);
  return !error;
}
