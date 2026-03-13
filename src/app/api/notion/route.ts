import { NextRequest, NextResponse } from "next/server";
import { getAllTasks, updateTask } from "@/lib/data";
import { syncTaskToNotion, testNotionConnection } from "@/lib/notion";

export async function POST(request: NextRequest) {
  try {
    const { action, apiKey, databaseId, taskId } = await request.json();

    if (action === "test") {
      const result = await testNotionConnection(apiKey, databaseId);
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
  } catch (error) {
    return NextResponse.json(
      { error: "Notion操作に失敗しました" },
      { status: 500 }
    );
  }
}
