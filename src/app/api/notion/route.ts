import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getAllTasks, updateTask } from "@/lib/data/tasks";
import { syncTaskToNotion, testNotionConnection, searchNotionDatabases } from "@/lib/notion";
import { getConfig } from "@/lib/data/config";
import { withAuthenticatedUser } from "@/lib/auth-server";
import type { Task } from "@/types";

export async function POST(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { action, apiKey, databaseId, taskId } = await request.json();

      if (action === "test") {
        const result = await testNotionConnection(apiKey, databaseId);
        return NextResponse.json(result);
      }

      if (action === "search-databases") {
        if (!apiKey) {
          return NextResponse.json({ success: false, error: "APIキーが必要です" }, { status: 400 });
        }
        const result = await searchNotionDatabases(apiKey);
        return NextResponse.json(result);
      }


      if (action === "sync-one" && taskId) {
        const tasks = await getAllTasks();
        const task = tasks.find((t) => t.id === taskId);
        if (!task) {
          return NextResponse.json(
            { error: "タスクが見つかりません" },
            { status: 404 }
          );
        }
        const notionPageId = await syncTaskToNotion(task);
        if (notionPageId) {
          await updateTask(task.id, { notionPageId });
          return NextResponse.json({ success: true, notionPageId });
        }
        return NextResponse.json(
          { error: "Notion同期に失敗しました" },
          { status: 500 }
        );
      }

      if (action === "sync-all") {
        const tasks = await getAllTasks();
        const results: { id: string; success: boolean }[] = [];
        for (const task of tasks) {
          const notionPageId = await syncTaskToNotion(task);
          if (notionPageId) {
            await updateTask(task.id, { notionPageId });
            results.push({ id: task.id, success: true });
          } else {
            results.push({ id: task.id, success: false });
          }
        }
        return NextResponse.json({ results });
      }

      return NextResponse.json(
        { error: "無効なアクションです" },
        { status: 400 }
      );
    } catch {
      return NextResponse.json(
        { error: "Notion操作に失敗しました" },
        { status: 500 }
      );
    }
  });
}
