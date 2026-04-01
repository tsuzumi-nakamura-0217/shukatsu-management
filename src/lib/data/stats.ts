import { getAllCompanies } from "./companies";
import { getAllTasks } from "./tasks";
import { getAllInterviews } from "./interviews";
import { getAllESDocuments } from "./es";
import { todayStr } from "./utils";
import type { Stats, Interview } from "@/types";

export async function getStats(): Promise<Stats> {
  // Fetch all data sources in parallel for maximum speed
  const [companies, tasks, rawAllInterviews, rawAllESDocuments] = await Promise.all([
    getAllCompanies(),
    getAllTasks(),
    getAllInterviews(),
    getAllESDocuments(),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const company of companies) {
    statusCounts[company.status] = (statusCounts[company.status] || 0) + 1;
  }

  const today = todayStr();
  const now = new Date();
  const upcomingDeadlines = tasks
    .filter((t) => {
      if (t.status === "完了" || !t.deadline) return false;
      const deadline = new Date(t.deadline);
      return !Number.isNaN(deadline.getTime()) && deadline >= now;
    })
    .sort((a, b) => {
      const aDate = new Date(a.deadline).getTime();
      const bDate = new Date(b.deadline).getTime();
      return aDate - bDate;
    })
    .slice(0, 5);

  const allInterviews: (Interview & { companyName: string })[] = [];
  const interviewResultCounts: Record<string, number> = {};  const companyMap = new Map(companies.map(c => [c.slug, c]));

  const validInterviews = rawAllInterviews.filter(i => companyMap.has(i.companySlug));
  const validESDocuments = rawAllESDocuments.filter(es => companyMap.has(es.companySlug));

  const totalInterviews = validInterviews.length;
  const totalESDocuments = validESDocuments.length;

  for (const interview of validInterviews) {
    const company = companyMap.get(interview.companySlug)!;

    const result = interview.result || "結果待ち";
    interviewResultCounts[result] = (interviewResultCounts[result] || 0) + 1;

    if (interview.date >= today) {
      allInterviews.push({ ...interview, companyName: company.name });
    }
  }
  allInterviews.sort((a, b) => a.date.localeCompare(b.date));

  const passedStatuses = ["1次面接", "2次面接", "最終面接", "内定"];
  const failedStatuses = ["不合格"];
  const passedCount = companies.filter((c) =>
    passedStatuses.includes(c.status)
  ).length;
  const failedCount = companies.filter((c) =>
    failedStatuses.includes(c.status)
  ).length;
  const totalDecided = passedCount + failedCount;

  return {
    totalCompanies: companies.length,
    statusCounts,
    upcomingDeadlines,
    upcomingInterviews: allInterviews.slice(0, 5),
    completedTasks: tasks.filter((t) => t.status === "完了").length,
    totalTasks: tasks.length,
    totalInterviews,
    totalESDocuments,
    interviewResultCounts,
    passRate:
      totalDecided > 0
        ? Math.round((passedCount / totalDecided) * 100)
        : 0,
  };
}
