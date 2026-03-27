import { NextRequest, NextResponse } from "next/server";
import { getAllESDocuments } from "@/lib/data";
import { withAuthenticatedUser } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const esDocs = await getAllESDocuments();
      return NextResponse.json(esDocs);
    } catch (error) {
      console.error("Failed to fetch ES documents:", error);
      return NextResponse.json({ error: "Failed to fetch ES documents" }, { status: 500 });
    }
  });
}
