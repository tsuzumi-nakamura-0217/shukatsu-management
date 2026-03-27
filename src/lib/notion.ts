import { Client } from "@notionhq/client";
import { getConfig } from "./data";
import type { Task } from "@/types";

const STATUS_MAP: Record<string, string> = {
  "Done": "完了",
  "完了": "完了",
  "In progress": "進行中",
  "進行中": "進行中",
  "Not started": "未着手",
  "未着手": "未着手",
  "ToDo": "未着手",
};

async function getNotionClient(): Promise<Client | null> {
  const config = await getConfig();
  if (!config.notion.enabled || !config.notion.apiKey) return null;
  return new Client({ auth: config.notion.apiKey });
}

export async function syncTaskToNotion(task: Task): Promise<string | null> {
  const client = await getNotionClient();
  if (!client) return null;

  const config = await getConfig();
  const databaseId = config.notion.databaseId;
  if (!databaseId) return null;

  try {
    if (task.notionPageId) {
      // Update existing page
      await client.pages.update({
        page_id: task.notionPageId,
        properties: {
          title: {
            title: [{ text: { content: task.title } }],
          },
          "企業名": {
            rich_text: [{ text: { content: task.companyName || "" } }],
          },
          "カテゴリ": {
            select: { name: task.category },
          },
          "日付": task.executionDate
            ? { date: { start: task.executionDate } }
            : { date: null },
          "締切": task.deadline
            ? { date: { start: task.deadline } }
            : { date: null },
          "ステータス": {
            status: { name: task.status },
          },
          "メモ": {
            rich_text: [{ text: { content: task.memo || "" } }],
          },
        },
      });
      return task.notionPageId;
    } else {
      // Create new page
      const databaseType = config.notion.databaseType || "database";
      const parent: any = {};
      if (databaseType === "data_source") {
        parent.type = "data_source_id";
        parent.data_source_id = databaseId;
      } else {
        parent.type = "database_id";
        parent.database_id = databaseId;
      }

      const response = await client.pages.create({
        parent,
        properties: {
          title: {
            title: [{ text: { content: task.title } }],
          },
          "企業名": {
            rich_text: [{ text: { content: task.companyName || "" } }],
          },
          "カテゴリ": {
            select: { name: task.category },
          },
          "日付": task.executionDate
            ? { date: { start: task.executionDate } }
            : { date: null },
          "締切": task.deadline
            ? { date: { start: task.deadline } }
            : { date: null },
          "ステータス": {
            status: { name: task.status },
          },
          "メモ": {
            rich_text: [{ text: { content: task.memo || "" } }],
          },
        },
      });
      return response.id;
    }
  } catch (error: any) {
    console.error("Notion sync error:", {
      message: error.message,
      code: error.code,
      body: error.body,
    });
    return null;
  }
}

export async function deleteTaskFromNotion(pageId: string, apiKey: string): Promise<boolean> {
  try {
    const client = new Client({ auth: apiKey });
    await client.pages.update({
      page_id: pageId,
      archived: true,
    });
    return true;
  } catch (error: any) {
    console.error("Notion delete error:", {
      message: error.message,
      code: error.code,
    });
    return false;
  }
}

export async function fetchTasksFromNotion(
  apiKey: string,
  databaseId: string
): Promise<{ success: boolean; tasks?: Partial<Task>[]; error?: string }> {
  try {
    const client = new Client({ auth: apiKey });
    let results: any[] = [];
    let hasMore = true;
    let nextCursor: string | undefined = undefined;
    let iterations = 0;

    while (hasMore && iterations < 50) { // Limit to 5000 items (50 pages)
      const queryParams: any = {
        data_source_id: databaseId,
        filter: {
          property: "企業名",
          rich_text: {
            is_not_empty: true
          }
        }
      };
      if (nextCursor) queryParams.start_cursor = nextCursor;

      const response: any = await client.dataSources.query(queryParams);

      results = [...results, ...response.results];
      hasMore = response.has_more;
      nextCursor = response.next_cursor || undefined;
      iterations++;
    }

    const tasks = results.map((page: any) => {
      const props = page.properties;

      // Flexible property lookup
      const findProp = (names: string[]) => {
        for (const name of names) {
          const lowerName = name.toLowerCase();
          const match = Object.keys(props).find(k => k.toLowerCase().trim() === lowerName);
          if (match) return props[match];
        }
        return null;
      };

      // Safety map for different property types
      const getString = (p: any) => p?.rich_text?.[0]?.plain_text || p?.title?.[0]?.plain_text || "";
      const getDate = (p: any) => p?.date?.start || "";
      const getStatus = (p: any) => p?.status?.name || p?.select?.name || "";

      const rawStatus = getStatus(findProp(["ステータス", "Status"]));
      const normalizedStatus = STATUS_MAP[rawStatus] || rawStatus;

      // Debug log for the first page
      if (results.length > 0 && page.id === results[0].id) {
        console.log("Sample Notion Page Properties:", JSON.stringify(props, null, 2));
        console.log(`Mapped Status: Raw="${rawStatus}", Normalized="${normalizedStatus}"`);
      }

      return {
        notionPageId: page.id,
        title: getString(findProp(["title", "Name", "タイトル", "名前"])),
        companyName: getString(findProp(["企業名", "Company"])),
        category: getStatus(findProp(["カテゴリ", "Category"])),
        executionDate: getDate(findProp(["日付", "Date"])),
        deadline: getDate(findProp(["締切", "Deadline"])),
        status: (normalizedStatus as any) || "未着手",
        memo: getString(findProp(["メモ", "Memo", "Notes"])),
      };
    }) as Partial<Task>[];

    return { success: true, tasks };
  } catch (error: any) {
    console.error("Notion fetch error:", error);
    return { success: false, error: error.message };
  }
}

export async function testNotionConnection(
  apiKey: string,
  databaseId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const client = new Client({ auth: apiKey });
    // Since databases are now data_sources in the new API, we need to test if the API key can talk to Notion
    // and if the data_source can be found. The easiest way is via search.
    const searchRes = await client.search({
      filter: { property: "object", value: "data_source" },
    });
    const found = searchRes.results.find((r: any) => r.id === databaseId);
    if (found) {
      return {
        success: true,
        message: `接続成功: " ${(found as any).title?.[0]?.plain_text || "Untitled"}" に接続しました`,
      };
    } else {
      return {
        success: true,
        message: "接続成功。ただし指定されたIDが検索で見つかりませんでした（権限を確認してください）。",
      };
    }
  } catch (error) {
    console.error("Notion connection test error:", error);
    return {
      success: false,
      message: `接続失敗: ${error instanceof Error ? error.message : "不明なエラー"}`,
    };
  }
}

export async function searchNotionDatabases(
  apiKey: string
): Promise<{ success: boolean; databases?: { id: string; title: string; type: string }[]; error?: string }> {
  try {
    const client = new Client({ auth: apiKey });
    // Fetch both legacy databases and new data sources by not filtering at the API level
    // and instead filtering the results in implementation.
    const response = await client.search({
      page_size: 100,
    });

    const databases = response.results
      .filter((item: any) => item.object === "database" || item.object === "data_source")
      .map((db: any) => ({
        id: db.id,
        title: db.title?.[0]?.plain_text || "Untitled",
        type: db.object, // "database" or "data_source"
      }));

    return { success: true, databases };
  } catch (error) {
    console.error("Notion search error:", error);
    return { success: false, error: error instanceof Error ? error.message : "取得失敗" };
  }
}
