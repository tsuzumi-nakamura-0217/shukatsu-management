import { NextResponse } from "next/server";
import { getExportData } from "@/lib/data";

export async function GET() {
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
}
