import { NextResponse } from "next/server";
import { getStats } from "@/lib/data";

export async function GET() {
  try {
    const stats = await getStats();
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: "統計データの取得に失敗しました" },
      { status: 500 }
    );
  }
}
