import { NextRequest, NextResponse } from "next/server";
import { runWithSupabaseAccessToken, verifySupabaseAccessToken } from "@/lib/supabase";

function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const cookieToken = request.cookies.get("sb-access-token")?.value;
  return cookieToken || null;
}

export async function withAuthenticatedUser(
  request: NextRequest,
  handler: (context: { userId: string }) => Promise<NextResponse>
): Promise<NextResponse> {
  const accessToken = extractBearerToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const user = await verifySupabaseAccessToken(accessToken);
  if (!user) {
    return NextResponse.json({ error: "認証情報が無効です" }, { status: 401 });
  }

  return runWithSupabaseAccessToken(accessToken, () =>
    handler({ userId: user.id })
  );
}
