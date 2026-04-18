import { NextResponse } from "next/server";
import { getAllInterviews } from "@/lib/data/interviews";

export async function GET() {
  try {
    const interviews = await getAllInterviews();
    return NextResponse.json(interviews);
  } catch {
    return NextResponse.json(
      { error: "面接一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}
