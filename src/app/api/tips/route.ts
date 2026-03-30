import { NextRequest, NextResponse } from "next/server";
import {
  getAllTips,
  saveTip,
  deleteTip,
} from "@/lib/data/tips";
import { withAuthenticatedUser } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const items = await getAllTips();
      return NextResponse.json(items);
    } catch {
      return NextResponse.json(
        { error: "Tipsの取得に失敗しました" },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { title, category, content } = await request.json();
      if (!title) {
        return NextResponse.json(
          { error: "タイトルは必須です" },
          { status: 400 }
        );
      }
      const item = await saveTip(null, title, category || "その他", content || "");
      return NextResponse.json(item, { status: 201 });
    } catch {
      return NextResponse.json(
        { error: "Tipsの作成に失敗しました" },
        { status: 500 }
      );
    }
  });
}

export async function PUT(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { id, title, category, content } = await request.json();
      const item = await saveTip(id, title, category, content);
      return NextResponse.json(item);
    } catch {
      return NextResponse.json(
        { error: "Tipsの更新に失敗しました" },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { id } = await request.json();
      const deleted = await deleteTip(id);
      if (!deleted) {
        return NextResponse.json(
          { error: "ファイルが見つかりません" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json(
        { error: "Tipsの削除に失敗しました" },
        { status: 500 }
      );
    }
  });
}
