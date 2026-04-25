import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getComments, createComment, updateComment, deleteComment } from "@/lib/data/comments";
import { withAuthenticatedUser } from "@/lib/auth-server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { id } = await params;
      const comments = await getComments(id);
      return NextResponse.json(comments);
    } catch {
      return NextResponse.json(
        { error: "コメントの取得に失敗しました" },
        { status: 500 }
      );
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { id } = await params;
      const { content, highlightedText, positionFrom, positionTo } = await request.json();
      if (!content) {
        return NextResponse.json(
          { error: "コメント本文は必須です" },
          { status: 400 }
        );
      }
      const comment = await createComment(id, content, highlightedText || "", positionFrom || 0, positionTo || 0);
      return NextResponse.json(comment, { status: 201 });
    } catch {
      return NextResponse.json(
        { error: "コメントの作成に失敗しました" },
        { status: 500 }
      );
    }
  });
}

export async function PUT(
  request: NextRequest,
) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { commentId, content, resolved } = await request.json();
      if (!commentId) {
        return NextResponse.json(
          { error: "コメントIDは必須です" },
          { status: 400 }
        );
      }
      const comment = await updateComment(commentId, { content, resolved });
      return NextResponse.json(comment);
    } catch {
      return NextResponse.json(
        { error: "コメントの更新に失敗しました" },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { commentId } = await request.json();
      if (!commentId) {
        return NextResponse.json(
          { error: "コメントIDは必須です" },
          { status: 400 }
        );
      }
      const deleted = await deleteComment(commentId);
      if (!deleted) {
        return NextResponse.json(
          { error: "コメントが見つかりません" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json(
        { error: "コメントの削除に失敗しました" },
        { status: 500 }
      );
    }
  });
}
