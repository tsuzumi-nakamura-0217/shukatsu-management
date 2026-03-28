import { getAllCompanies } from "./companies";
import { getAllTasks } from "./tasks";
import { getAllSelfAnalysis } from "./self-analysis";
import { getConfig } from "./config";
import { getAllInterviews } from "./interviews";
import { getAllESDocuments } from "./es";
import type { Interview, ESDocument } from "@/types";

export async function getExportData() {
  const [
    companies,
    tasks,
    selfAnalysis,
    config,
  ] = await Promise.all([
    getAllCompanies(),
    getAllTasks(),
    getAllSelfAnalysis(),
    getConfig(),
  ]);

  // Gather all interviews and ES documents for all companies
  const [allInterviews, allESDocuments] = await Promise.all([
    getAllInterviews(),
    getAllESDocuments(),
  ]);

  const companyInterviews: Record<string, Interview[]> = {};
  const companyESDocuments: Record<string, ESDocument[]> = {};

  for (const company of companies) {
    companyInterviews[company.slug] = [];
    companyESDocuments[company.slug] = [];
  }

  for (const interview of allInterviews) {
    if (companyInterviews[interview.companySlug]) {
      companyInterviews[interview.companySlug].push(interview);
    }
  }

  for (const es of allESDocuments) {
    if (companyESDocuments[es.companySlug]) {
      companyESDocuments[es.companySlug].push(es);
    }
  }

  return {
    companies: companies.map((c) => ({
      ...c,
      interviews: companyInterviews[c.slug],
      esDocuments: companyESDocuments[c.slug],
    })),
    tasks,
    selfAnalysis,
    config,
    interviews: allInterviews,
    esDocuments: allESDocuments,
  };
}
