import { NextRequest, NextResponse } from "next/server";
import { getCalendarEvents } from "@/lib/data/calendar";
import { withAuthenticatedUser } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const includeCompleted = request.nextUrl.searchParams.get("includeCompleted") === "true";
      const events = await getCalendarEvents({ includeCompleted });
      return NextResponse.json(events);
    } catch {
      return NextResponse.json(
        { error: "カレンダーイベントの取得に失敗しました" },
        { status: 500 }
      );
    }
  });
}
