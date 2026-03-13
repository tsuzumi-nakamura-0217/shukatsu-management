import { NextRequest, NextResponse } from "next/server";
import { getConfig, updateConfig } from "@/lib/data";

export async function GET() {
  try {
    const config = getConfig();
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: "設定の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const config = updateConfig(body);
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: "設定の更新に失敗しました" },
      { status: 500 }
    );
  }
}
