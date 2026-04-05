import { NextRequest, NextResponse } from "next/server";
import { getAllEvents } from "@/lib/data/events";
import { withAuthenticatedUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const events = await getAllEvents();
      return NextResponse.json(events);
    } catch {
      return NextResponse.json(
        { error: "イベントの取得に失敗しました" },
        { status: 500 }
      );
    }
  });
}
