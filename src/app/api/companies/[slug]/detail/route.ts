import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getCompany } from "@/lib/data/companies";
import { getAllTasks } from "@/lib/data/tasks";
import { getInterviews } from "@/lib/data/interviews";
import { getESDocuments } from "@/lib/data/es";
import { getConfig } from "@/lib/data/config";
import { getEvents } from "@/lib/data/events";
import { withAuthenticatedUser } from "@/lib/auth-server";

/**
 * Unified detail API — fetches company, tasks, interviews, ES docs, and config
 * in a single request with one auth check instead of 5 separate API calls.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { slug } = await params;
      const company = await getCompany(slug);
      if (!company) {
        return NextResponse.json(
          { error: "企業が見つかりません" },
          { status: 404 }
        );
      }

      // Fetch all related data in parallel
      const [tasks, interviews, esDocs, config, events] = await Promise.all([
        getAllTasks().then((all) =>
          all.filter((t) => t.companySlug === slug)
        ),
        getInterviews(slug),
        getESDocuments(slug),
        getConfig(),
        getEvents(slug),
      ]);

      return NextResponse.json({
        company,
        tasks,
        interviews,
        esDocs,
        events,
        config,
      });
    } catch {
      return NextResponse.json(
        { error: "企業詳細の取得に失敗しました" },
        { status: 500 }
      );
    }
  });
}
