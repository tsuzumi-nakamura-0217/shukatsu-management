import { Client } from "@notionhq/client";
import { getConfig } from "./data";
import type { Task } from "@/types";

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
          "優先度": {
            select: { name: task.priority },
          },
          "締切": task.deadline
            ? { date: { start: task.deadline } }
            : { date: null },
          "完了": {
            checkbox: task.completed,
          },
          "メモ": {
            rich_text: [{ text: { content: task.memo || "" } }],
          },
        },
      });
      return task.notionPageId;
    } else {
      // Create new page
      const response = await client.pages.create({
        parent: { database_id: databaseId },
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
          "優先度": {
            select: { name: task.priority },
          },
          "締切": task.deadline
            ? { date: { start: task.deadline } }
            : { date: null },
          "完了": {
            checkbox: task.completed,
          },
          "メモ": {
            rich_text: [{ text: { content: task.memo || "" } }],
          },
        },
      });
      return response.id;
    }
  } catch (error) {
    console.error("Notion sync error:", error);
    return null;
  }
}

export async function testNotionConnection(
  apiKey: string,
  databaseId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const client = new Client({ auth: apiKey });
    const db = await client.databases.retrieve({ database_id: databaseId });
    return {
      success: true,
      message: `接続成功: "${(db as unknown as { title: { plain_text: string }[] }).title?.[0]?.plain_text || "Untitled"}" データベースに接続しました`,
    };
  } catch (error) {
    return {
      success: false,
      message: `接続失敗: ${error instanceof Error ? error.message : "不明なエラー"}`,
    };
  }
}
