import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { updateESDocumentContentByShareToken } from "@/lib/data/es";

/**
 * PUT /api/share/[token]/content — Update ES document content (no auth required)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { content } = await request.json();

    if (content === undefined) {
      return NextResponse.json(
        { error: "本文は必須です" },
        { status: 400 }
      );
    }

    const success = await updateESDocumentContentByShareToken(token, content);
    if (!success) {
      return NextResponse.json(
        { error: "本文の更新に失敗しました" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "本文の更新に失敗しました" },
      { status: 500 }
    );
  }
}
