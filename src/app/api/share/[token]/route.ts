import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getESDocumentByShareToken } from "@/lib/data/es";
import { getCommentsByShareToken } from "@/lib/data/comments";

/**
 * GET /api/share/[token] — Fetch a shared ES document (no auth required)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const esDoc = await getESDocumentByShareToken(token);
    if (!esDoc) {
      return NextResponse.json(
        { error: "共有リンクが無効です" },
        { status: 404 }
      );
    }

    const comments = await getCommentsByShareToken(token);
    const companyName = esDoc.companyName?.trim() || "企業名不明";

    // Return document info without sensitive data
    return NextResponse.json({
      id: esDoc.id,
      title: esDoc.title,
      content: esDoc.content,
      companyName,
      companySlug: esDoc.companySlug,
      characterLimit: esDoc.characterLimit,
      characterLimitType: esDoc.characterLimitType,
      status: esDoc.status,
      updatedAt: esDoc.updatedAt,
      comments,
    });
  } catch {
    return NextResponse.json(
      { error: "共有ドキュメントの取得に失敗しました" },
      { status: 500 }
    );
  }
}
