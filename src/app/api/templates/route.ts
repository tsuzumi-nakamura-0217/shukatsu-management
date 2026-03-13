import { NextRequest, NextResponse } from "next/server";
import { getAllTemplates, saveTemplate, deleteTemplate } from "@/lib/data";
import { withAuthenticatedUser } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const templates = await getAllTemplates();
      return NextResponse.json(templates);
    } catch {
      return NextResponse.json(
        { error: "テンプレートの取得に失敗しました" },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { title, description, content } = await request.json();
      if (!title) {
        return NextResponse.json(
          { error: "タイトルは必須です" },
          { status: 400 }
        );
      }
      const template = await saveTemplate(
        null,
        title,
        description || "",
        content || ""
      );
      return NextResponse.json(template, { status: 201 });
    } catch {
      return NextResponse.json(
        { error: "テンプレートの作成に失敗しました" },
        { status: 500 }
      );
    }
  });
}

export async function PUT(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { id, title, description, content } = await request.json();
      const template = await saveTemplate(id, title, description, content);
      return NextResponse.json(template);
    } catch {
      return NextResponse.json(
        { error: "テンプレートの更新に失敗しました" },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { id } = await request.json();
      const deleted = await deleteTemplate(id);
      if (!deleted) {
        return NextResponse.json(
          { error: "テンプレートが見つかりません" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json(
        { error: "テンプレートの削除に失敗しました" },
        { status: 500 }
      );
    }
  });
}
