import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import {
  getCommentsByShareToken,
  createCommentByShareToken,
  updateCommentByShareToken,
  deleteCommentByShareToken,
} from "@/lib/data/comments";

/**
 * GET /api/share/[token]/comments — Fetch comments for a shared document
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const comments = await getCommentsByShareToken(token);
    return NextResponse.json(comments);
  } catch {
    return NextResponse.json(
      { error: "コメントの取得に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/share/[token]/comments — Add a comment to a shared document
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { content, highlightedText, positionFrom, positionTo, authorName } =
      await request.json();

    if (!content) {
      return NextResponse.json(
        { error: "コメント本文は必須です" },
        { status: 400 }
      );
    }

    const comment = await createCommentByShareToken(
      token,
      content,
      highlightedText || "",
      positionFrom || 0,
      positionTo || 0,
      authorName
    );
    return NextResponse.json(comment, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "コメントの作成に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/share/[token]/comments — Update a comment on a shared document
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { commentId, content, resolved } = await request.json();

    if (!commentId) {
      return NextResponse.json(
        { error: "コメントIDは必須です" },
        { status: 400 }
      );
    }

    const comment = await updateCommentByShareToken(token, commentId, {
      content,
      resolved,
    });
    return NextResponse.json(comment);
  } catch {
    return NextResponse.json(
      { error: "コメントの更新に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/share/[token]/comments — Delete a comment from a shared document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { commentId } = await request.json();

    if (!commentId) {
      return NextResponse.json(
        { error: "コメントIDは必須です" },
        { status: 400 }
      );
    }

    const deleted = await deleteCommentByShareToken(token, commentId);
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
}
