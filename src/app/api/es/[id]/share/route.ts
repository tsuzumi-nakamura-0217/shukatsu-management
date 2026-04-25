import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { generateShareToken, removeShareToken, getShareToken } from "@/lib/data/es";
import { withAuthenticatedUser } from "@/lib/auth-server";

/**
 * POST /api/es/[id]/share — Generate a share token for an ES document
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { id } = await params;
      
      // Check if a token already exists
      const existingToken = await getShareToken(id);
      if (existingToken) {
        return NextResponse.json({ shareToken: existingToken });
      }

      const token = await generateShareToken(id);
      if (!token) {
        return NextResponse.json(
          { error: "共有トークンの生成に失敗しました" },
          { status: 500 }
        );
      }
      return NextResponse.json({ shareToken: token }, { status: 201 });
    } catch {
      return NextResponse.json(
        { error: "共有トークンの生成に失敗しました" },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/es/[id]/share — Remove the share token (disable sharing)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { id } = await params;
      const success = await removeShareToken(id);
      if (!success) {
        return NextResponse.json(
          { error: "共有の停止に失敗しました" },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json(
        { error: "共有の停止に失敗しました" },
        { status: 500 }
      );
    }
  });
}
