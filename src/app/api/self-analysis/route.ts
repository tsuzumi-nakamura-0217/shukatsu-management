import { NextRequest, NextResponse } from "next/server";
import {
  getAllSelfAnalysis,
  saveSelfAnalysis,
  deleteSelfAnalysis,
} from "@/lib/data/self-analysis";
import { withAuthenticatedUser } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const items = await getAllSelfAnalysis();
      return NextResponse.json(items);
    } catch {
      return NextResponse.json(
        { error: "自己分析メモの取得に失敗しました" },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { title, content } = await request.json();
      if (!title) {
        return NextResponse.json(
          { error: "タイトルは必須です" },
          { status: 400 }
        );
      }
      const item = await saveSelfAnalysis(null, title, content || "");
      return NextResponse.json(item, { status: 201 });
    } catch {
      return NextResponse.json(
        { error: "自己分析メモの作成に失敗しました" },
        { status: 500 }
      );
    }
  });
}

export async function PUT(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { id, title, content } = await request.json();
      const item = await saveSelfAnalysis(id, title, content);
      return NextResponse.json(item);
    } catch {
      return NextResponse.json(
        { error: "自己分析メモの更新に失敗しました" },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { id } = await request.json();
      const deleted = await deleteSelfAnalysis(id);
      if (!deleted) {
        return NextResponse.json(
          { error: "ファイルが見つかりません" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json(
        { error: "自己分析メモの削除に失敗しました" },
        { status: 500 }
      );
    }
  });
}
