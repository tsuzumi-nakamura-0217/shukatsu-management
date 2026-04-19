import { NextRequest, NextResponse } from "next/server";
import { runWithSupabaseAccessToken, verifySupabaseAccessToken } from "@/lib/supabase";

function normalizeToken(token: string | null | undefined): string | null {
  if (!token) {
    return null;
  }

  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

function extractSupabaseAuthCookieToken(request: NextRequest): string | null {
  const supabaseCookie = request.cookies
    .getAll()
    .find(
      (cookie) =>
        cookie.name.startsWith("sb-") &&
        cookie.name.endsWith("-auth-token")
    );

  if (!supabaseCookie?.value) {
    return null;
  }

  const normalizedValue = normalizeToken(supabaseCookie.value);
  if (!normalizedValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(normalizedValue) as unknown;

    if (Array.isArray(parsed) && typeof parsed[0] === "string") {
      return normalizeToken(parsed[0]);
    }

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "access_token" in parsed &&
      typeof (parsed as { access_token?: unknown }).access_token === "string"
    ) {
      return normalizeToken((parsed as { access_token: string }).access_token);
    }
  } catch {
    return null;
  }

  return null;
}

function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return normalizeToken(authHeader.slice(7));
  }

  const cookieToken = normalizeToken(request.cookies.get("sb-access-token")?.value);
  if (cookieToken) {
    return cookieToken;
  }

  return extractSupabaseAuthCookieToken(request);
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
