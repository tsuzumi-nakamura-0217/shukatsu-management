import { supabase } from "../supabase";
import type { AppConfig } from "@/types";

export async function getConfig(): Promise<AppConfig> {
  const { data, error } = await supabase
    .from("config")
    .select("user_id, key, value");

  if (error || !data) {
    // Return default config on error
    return {
      defaultStages: [],
      industries: [],
      taskCategories: [],
      interviewStatuses: ["通過", "結果待ち", "不合格"],
      testCenterId: "",
      notion: { apiKey: "", databaseId: "", enabled: false },
    };
  }

  const globalConfigMap: Record<string, unknown> = {};
  const userConfigMap: Record<string, unknown> = {};

  for (const row of data as Array<{
    user_id: string | null;
    key: string;
    value: unknown;
  }>) {
    if (row.user_id) {
      userConfigMap[row.key] = row.value;
      continue;
    }
    globalConfigMap[row.key] = row.value;
  }

  // Shared defaults are applied to all users, and user-specific values override them.
  const configMap: Record<string, unknown> = {
    ...globalConfigMap,
    ...userConfigMap,
  };

  return {
    defaultStages: (configMap.defaultStages as string[]) || [],
    industries: (configMap.industries as string[]) || [],
    taskCategories: (configMap.taskCategories as string[]) || [],
    interviewStatuses: (configMap.interviewStatuses as string[]) || ["通過", "結果待ち", "不合格"],
    testCenterId: (configMap.testCenterId as string) || "",
    notion: (configMap.notion as AppConfig["notion"]) || {
      apiKey: "",
      databaseId: "",
      enabled: false,
    },
  };
}

export async function updateConfig(
  config: Partial<AppConfig>
): Promise<AppConfig> {
  const current = await getConfig();
  const updated = { ...current, ...config };

  // Upsert each key
  const entries: { key: string; value: unknown }[] = [
    { key: "defaultStages", value: updated.defaultStages },
    { key: "industries", value: updated.industries },
    { key: "taskCategories", value: updated.taskCategories },
    { key: "interviewStatuses", value: updated.interviewStatuses },
    { key: "testCenterId", value: updated.testCenterId },
    { key: "notion", value: updated.notion },
  ];

  for (const entry of entries) {
    await supabase
      .from("config")
      .upsert({ key: entry.key, value: entry.value }, { onConflict: "user_id,key" });
  }

  return updated;
}
