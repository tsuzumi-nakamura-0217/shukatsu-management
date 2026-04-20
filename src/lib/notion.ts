import { Client } from "@notionhq/client";
import { getConfig } from "./data/config";
import type { Task } from "@/types";
import { getPlainText } from "./utils";

const NOTION_TIME_ZONE = "Asia/Tokyo";
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const NOTION_RICH_TEXT_LIMIT = 1800;

function formatDateTimeForTimeZone(value: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  const hour = getPart("hour");
  const minute = getPart("minute");
  const second = getPart("second");

  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

function toNotionDateValue(value: string | null | undefined): { start: string; time_zone?: string } | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (DATE_ONLY_PATTERN.test(trimmed)) {
    return { start: trimmed };
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return {
    start: formatDateTimeForTimeZone(parsed, NOTION_TIME_ZONE),
    time_zone: NOTION_TIME_ZONE,
  };
}

function chunkText(value: string, maxLength: number): string[] {
  if (value.length <= maxLength) return [value];

  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += maxLength) {
    chunks.push(value.slice(index, index + maxLength));
  }

  return chunks;
}

function toNotionRichText(value: string | null | undefined): Array<{ text: { content: string } }> {
  const plainText = getPlainText(value || "").trim();
  if (!plainText) {
    return [];
  }

  return chunkText(plainText, NOTION_RICH_TEXT_LIMIT).map((content) => ({
    text: { content },
  }));
}

function buildTaskProperties(task: Task) {
  return {
    title: {
      title: [{ text: { content: task.title } }],
    },
    "企業名": {
      rich_text: [{ text: { content: task.companyName || "" } }],
    },
    "カテゴリ": {
      select: { name: task.category },
    },
    "日付": {
      date: toNotionDateValue(task.executionDate),
    },
    "締切": {
      date: toNotionDateValue(task.deadline),
    },
    "ステータス": {
      status: { name: task.status },
    },
    "メモ": {
      rich_text: toNotionRichText(task.memo),
    },
  };
}

function getNotionTitle(entity: { title?: Array<{ plain_text?: string }> } | undefined): string {
  return entity?.title?.[0]?.plain_text || "Untitled";
}

function getErrorMeta(error: unknown): { message?: string; code?: string; body?: unknown } {
  if (typeof error !== "object" || error === null) {
    return {};
  }

  const record = error as Record<string, unknown>;
  return {
    message: typeof record.message === "string" ? record.message : undefined,
    code: typeof record.code === "string" ? record.code : undefined,
    body: record.body,
  };
}


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
        properties: buildTaskProperties(task),
      });
      return task.notionPageId;
    } else {
      // Create new page
      const databaseType = config.notion.databaseType || "database";
      const parent =
        databaseType === "data_source"
          ? { type: "data_source_id" as const, data_source_id: databaseId }
          : { type: "database_id" as const, database_id: databaseId };

      const response = await client.pages.create({
        parent,
        properties: buildTaskProperties(task),
      });
      return response.id;
    }
  } catch (error: unknown) {
    const meta = getErrorMeta(error);
    console.error("Notion sync error:", {
      message: meta.message,
      code: meta.code,
      body: meta.body,
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
  } catch (error: unknown) {
    const meta = getErrorMeta(error);
    console.error("Notion delete error:", {
      message: meta.message,
      code: meta.code,
    });
    return false;
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
    const found = searchRes.results.find((r) => r.id === databaseId);
    if (found) {
      return {
        success: true,
        message: `接続成功: " ${getNotionTitle(found as { title?: Array<{ plain_text?: string }> })}" に接続しました`,
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
      .filter((item) => {
        const objectType = (item as { object: string }).object;
        return objectType === "database" || objectType === "data_source";
      })
      .map((db) => ({
        id: db.id,
        title: getNotionTitle(db as { title?: Array<{ plain_text?: string }> }),
        type: (db as { object: string }).object, // "database" or "data_source"
      }));

    return { success: true, databases };
  } catch (error) {
    console.error("Notion search error:", error);
    return { success: false, error: error instanceof Error ? error.message : "取得失敗" };
  }
}
