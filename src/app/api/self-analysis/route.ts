import { NextRequest, NextResponse } from "next/server";
import {
  getAllSelfAnalysis,
  saveSelfAnalysis,
  deleteSelfAnalysis,
} from "@/lib/data";

export async function GET() {
  try {
    const items = getAllSelfAnalysis();
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json(
      { error: "自己分析メモの取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { filename, title, content } = await request.json();
    if (!filename || !title) {
      return NextResponse.json(
        { error: "ファイル名とタイトルは必須です" },
        { status: 400 }
      );
    }
    const item = saveSelfAnalysis(filename, title, content || "");
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "自己分析メモの作成に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { filename, title, content } = await request.json();
    const item = saveSelfAnalysis(filename, title, content);
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json(
      { error: "自己分析メモの更新に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { filename } = await request.json();
    const deleted = deleteSelfAnalysis(filename);
    if (!deleted) {
      return NextResponse.json(
        { error: "ファイルが見つかりません" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "自己分析メモの削除に失敗しました" },
      { status: 500 }
    );
  }
}
