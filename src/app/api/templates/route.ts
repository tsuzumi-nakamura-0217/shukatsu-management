import { NextRequest, NextResponse } from "next/server";
import { getAllTemplates, saveTemplate, deleteTemplate } from "@/lib/data";

export async function GET() {
  try {
    const templates = getAllTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    return NextResponse.json(
      { error: "テンプレートの取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { filename, title, description, content } = await request.json();
    if (!filename || !title) {
      return NextResponse.json(
        { error: "ファイル名とタイトルは必須です" },
        { status: 400 }
      );
    }
    const template = saveTemplate(
      filename,
      title,
      description || "",
      content || ""
    );
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "テンプレートの作成に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { filename, title, description, content } = await request.json();
    const template = saveTemplate(filename, title, description, content);
    return NextResponse.json(template);
  } catch (error) {
    return NextResponse.json(
      { error: "テンプレートの更新に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { filename } = await request.json();
    const deleted = deleteTemplate(filename);
    if (!deleted) {
      return NextResponse.json(
        { error: "テンプレートが見つかりません" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "テンプレートの削除に失敗しました" },
      { status: 500 }
    );
  }
}
