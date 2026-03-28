import { NextRequest, NextResponse } from "next/server";
import { getConfig, updateConfig } from "@/lib/data/config";
import { withAuthenticatedUser } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const config = await getConfig();
      return NextResponse.json(config);
    } catch {
      return NextResponse.json(
        { error: "設定の取得に失敗しました" },
        { status: 500 }
      );
    }
  });
}

export async function PUT(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const body = await request.json();
      const config = await updateConfig(body);
      return NextResponse.json(config);
    } catch {
      return NextResponse.json(
        { error: "設定の更新に失敗しました" },
        { status: 500 }
      );
    }
  });
}
