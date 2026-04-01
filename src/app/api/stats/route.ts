import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getStats } from "@/lib/data/stats";
import { withAuthenticatedUser } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const stats = await getStats();
      return NextResponse.json(stats);
    } catch {
      return NextResponse.json(
        { error: "統計データの取得に失敗しました" },
        { status: 500 }
      );
    }
  });
}
