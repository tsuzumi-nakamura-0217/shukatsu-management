import { NextRequest, NextResponse } from "next/server";
import { getExportData } from "@/lib/data";
import { withAuthenticatedUser } from "@/lib/auth-server";
import fs from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  // Only allow local synchronization in development mode
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Local synchronization is only available in development mode" },
      { status: 403 }
    );
  }

  return withAuthenticatedUser(request, async () => {
    try {
      const data = await getExportData();
      
      const syncDir = path.join(process.cwd(), "data", "sync");
      
      // Ensure the sync directory exists
      await fs.mkdir(syncDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = path.join(syncDir, `backup-${timestamp}.json`);
      const latestPath = path.join(syncDir, "latest.json");
      
      // Write the full backup
      await fs.writeFile(backupPath, JSON.stringify(data, null, 2));
      
      // Update the 'latest' symlink or file
      await fs.writeFile(latestPath, JSON.stringify(data, null, 2));

      // Also write individual files for easier browsing
      await fs.writeFile(path.join(syncDir, "companies.json"), JSON.stringify(data.companies, null, 2));
      await fs.writeFile(path.join(syncDir, "tasks.json"), JSON.stringify(data.tasks, null, 2));
      await fs.writeFile(path.join(syncDir, "self-analysis.json"), JSON.stringify(data.selfAnalysis, null, 2));
      await fs.writeFile(path.join(syncDir, "templates.json"), JSON.stringify(data.templates, null, 2));
      await fs.writeFile(path.join(syncDir, "interviews.json"), JSON.stringify(data.interviews, null, 2));
      await fs.writeFile(path.join(syncDir, "es-documents.json"), JSON.stringify(data.esDocuments, null, 2));

      return NextResponse.json({ 
        message: "Local synchronization successful",
        path: syncDir,
        timestamp 
      });
    } catch (error) {
      console.error("Local sync error:", error);
      return NextResponse.json(
        { error: "Failed to perform local synchronization" },
        { status: 500 }
      );
    }
  });
}
