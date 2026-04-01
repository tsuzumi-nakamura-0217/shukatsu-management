import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getExportData } from "@/lib/data/export";
import { withAuthenticatedUser } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const data = await getExportData();
      return NextResponse.json(data);
    } catch (error) {
      console.error("Export error:", error);
      return NextResponse.json(
        { error: "Failed to export data" },
        { status: 500 }
      );
    }
  });
}
