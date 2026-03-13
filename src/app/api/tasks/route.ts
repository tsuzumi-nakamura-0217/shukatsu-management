import { NextRequest, NextResponse } from "next/server";
import {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask,
  getConfig,
} from "@/lib/data";
import { syncTaskToNotion } from "@/lib/notion";

export async function GET(request: NextRequest) {
  try {
    const tasks = getAllTasks();
    const { searchParams } = new URL(request.url);
    const companySlug = searchParams.get("companySlug");
    const category = searchParams.get("category");
    const priority = searchParams.get("priority");
    const completed = searchParams.get("completed");

    let filtered = tasks;

    if (companySlug) {
      filtered = filtered.filter((t) => t.companySlug === companySlug);
    }
    if (category) {
      filtered = filtered.filter((t) => t.category === category);
    }
    if (priority) {
      filtered = filtered.filter((t) => t.priority === priority);
    }
    if (completed !== null && completed !== undefined) {
      filtered = filtered.filter(
        (t) => t.completed === (completed === "true")
      );
    }

    return NextResponse.json(filtered);
  } catch (error) {
    return NextResponse.json(
      { error: "タスクの取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.title || !body.companySlug) {
      return NextResponse.json(
        { error: "タイトルと企業は必須です" },
        { status: 400 }
      );
    }
    const task = createTask(body);

    // Sync to Notion if enabled
    const config = getConfig();
    if (config.notion.enabled) {
      const notionPageId = await syncTaskToNotion(task);
      if (notionPageId) {
        updateTask(task.id, { notionPageId });
        task.notionPageId = notionPageId;
      }
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "タスクの作成に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const task = updateTask(id, updates);
    if (!task) {
      return NextResponse.json(
        { error: "タスクが見つかりません" },
        { status: 404 }
      );
    }

    // Sync to Notion if enabled
    const config = getConfig();
    if (config.notion.enabled) {
      await syncTaskToNotion(task);
    }

    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json(
      { error: "タスクの更新に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    const deleted = deleteTask(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "タスクが見つかりません" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "タスクの削除に失敗しました" },
      { status: 500 }
    );
  }
}
