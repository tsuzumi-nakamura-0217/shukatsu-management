import { NextRequest, NextResponse } from "next/server";
import {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask,
  getConfig,
} from "@/lib/data";
import { syncTaskToNotion, deleteTaskFromNotion } from "@/lib/notion";
import { withAuthenticatedUser } from "@/lib/auth-server";

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
      const task = await createTask(body);

      const config = await getConfig();
      if (config.notion.enabled) {
        const notionPageId = await syncTaskToNotion(task);
        if (notionPageId) {
          await updateTask(task.id, { notionPageId });
          task.notionPageId = notionPageId;
        }
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
      const { id, ...updates } = body;
      const task = await updateTask(id, updates);
      if (!task) {
        return NextResponse.json(
          { error: "タスクが見つかりません" },
          { status: 404 }
        );
      }

      const config = await getConfig();
      if (config.notion.enabled) {
        const notionPageId = await syncTaskToNotion(task);
        if (notionPageId && notionPageId !== task.notionPageId) {
          await updateTask(task.id, { notionPageId });
          task.notionPageId = notionPageId;
        }
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
