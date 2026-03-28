import { NextRequest, NextResponse } from "next/server";
import {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask,
} from "@/lib/data/tasks";
import { getConfig } from "@/lib/data/config";
import { syncTaskToNotion, deleteTaskFromNotion } from "@/lib/notion";
import { withAuthenticatedUser } from "@/lib/auth-server";
import { normalizeDateOnly, normalizeDateTime } from "@/lib/data/utils";
import type { TaskCreate } from "@/types";

function sanitizeTaskInput(input: Record<string, unknown>): { payload: Record<string, unknown>; error?: string } {
  const payload = { ...input };

  if (Object.prototype.hasOwnProperty.call(payload, "executionDate")) {
    const normalizedExecutionDate = normalizeDateOnly(payload.executionDate);
    if (payload.executionDate !== "" && payload.executionDate != null && !normalizedExecutionDate) {
      return { payload, error: "executionDate must be YYYY-MM-DD" };
    }
    payload.executionDate = normalizedExecutionDate ?? "";
  }

  if (Object.prototype.hasOwnProperty.call(payload, "deadline")) {
    const normalizedDeadline = normalizeDateTime(payload.deadline);
    if (payload.deadline !== "" && payload.deadline != null && !normalizedDeadline) {
      return { payload, error: "deadline must be a valid datetime" };
    }
    payload.deadline = normalizedDeadline ?? "";
  }

  return { payload };
}

export async function GET(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const tasks = await getAllTasks();
      const { searchParams } = new URL(request.url);
      const companySlug = searchParams.get("companySlug");
      const category = searchParams.get("category");
      const status = searchParams.get("status");

      let filtered = tasks;

      if (companySlug) {
        filtered = filtered.filter((t) => t.companySlug === companySlug);
      }
      if (category) {
        filtered = filtered.filter((t) => t.category === category);
      }
      if (status) {
        filtered = filtered.filter((t) => t.status === status);
      }

      return NextResponse.json(filtered);
    } catch {
      return NextResponse.json(
        { error: "タスクの取得に失敗しました" },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const body = await request.json();
      if (!body.title || !body.companySlug) {
        return NextResponse.json(
          { error: "タイトルと企業は必須です" },
          { status: 400 }
        );
      }

      const { payload, error } = sanitizeTaskInput(body as Record<string, unknown>);
      if (error) {
        return NextResponse.json({ error }, { status: 400 });
      }

      const taskInput: TaskCreate = {
        title: String(payload.title ?? ""),
        companySlug: String(payload.companySlug ?? ""),
        category: typeof payload.category === "string" ? payload.category : undefined,
        executionDate: typeof payload.executionDate === "string" ? payload.executionDate : undefined,
        deadline: typeof payload.deadline === "string" ? payload.deadline : undefined,
        status:
          payload.status === "未着手" || payload.status === "進行中" || payload.status === "完了"
            ? payload.status
            : undefined,
        memo: typeof payload.memo === "string" ? payload.memo : undefined,
      };

      const task = await createTask(taskInput);

      const config = await getConfig();
      if (config.notion.enabled) {
        // Notion同期をバックグラウンドで実行（レスポンスを待たせない）
        syncTaskToNotion(task).then(async (notionPageId) => {
          if (notionPageId) {
            await updateTask(task.id, { notionPageId });
          }
        }).catch(err => console.error("Background Notion sync failed:", err));
      }

      return NextResponse.json(task, { status: 201 });
    } catch {
      return NextResponse.json(
        { error: "タスクの作成に失敗しました" },
        { status: 500 }
      );
    }
  });
}

export async function PUT(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const body = await request.json();

      if (!body.id || typeof body.id !== "string") {
        return NextResponse.json(
          { error: "id は必須です" },
          { status: 400 }
        );
      }

      const { id, ...rawUpdates } = body;
      const { payload: updates, error } = sanitizeTaskInput(rawUpdates as Record<string, unknown>);
      if (error) {
        return NextResponse.json({ error }, { status: 400 });
      }

      const task = await updateTask(id, updates);
      if (!task) {
        return NextResponse.json(
          { error: "タスクが見つかりません" },
          { status: 404 }
        );
      }

      const config = await getConfig();
      if (config.notion.enabled) {
        // Notion同期をバックグラウンドで実行（レスポンスを待たせない）
        syncTaskToNotion(task).then(async (notionPageId) => {
          if (notionPageId && notionPageId !== task.notionPageId) {
            await updateTask(task.id, { notionPageId });
          }
        }).catch(err => console.error("Background Notion sync failed:", err));
      }

      return NextResponse.json(task);
    } catch {
      return NextResponse.json(
        { error: "タスクの更新に失敗しました" },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { id } = await request.json();
      
      // Fetch task before deletion to get Notion Page ID
      const tasks = await getAllTasks();
      const task = tasks.find(t => t.id === id);
      
      const deleted = await deleteTask(id);
      if (!deleted) {
        return NextResponse.json(
          { error: "タスクが見つかりません" },
          { status: 404 }
        );
      }

      // Sync deletion to Notion if enabled and page exists
      if (task?.notionPageId) {
        const config = await getConfig();
        if (config.notion.enabled) {
          await deleteTaskFromNotion(task.notionPageId, config.notion.apiKey);
        }
      }

      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json(
        { error: "タスクの削除に失敗しました" },
        { status: 500 }
      );
    }
  });
}
