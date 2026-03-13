import { NextResponse } from "next/server";
import { getCalendarEvents } from "@/lib/data";

export async function GET() {
  try {
    const events = getCalendarEvents();
    return NextResponse.json(events);
  } catch (error) {
    return NextResponse.json(
      { error: "カレンダーイベントの取得に失敗しました" },
      { status: 500 }
    );
  }
}
