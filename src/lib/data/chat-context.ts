import { getAllCompanies } from "./companies";
import { getAllTasks } from "./tasks";
import { getAllInterviews } from "./interviews";
import { getAllESDocuments } from "./es";
import { getAllSelfAnalysis } from "./self-analysis";
import { getAllTips } from "./tips";
import { getAllEvents } from "./events";
import { getConfig } from "./config";
import type {
  AppConfig,
  Company,
  CompanyEvent,
  ESDocument,
  Interview,
  SelfAnalysis,
  Task,
  Tip,
} from "@/types";

type SanitizedCompany = Omit<Company, "loginId" | "password" | "examId"> & {
  hasLoginId: boolean;
  hasPassword: boolean;
  hasExamId: boolean;
};

type SanitizedConfig = Omit<AppConfig, "notion"> & {
  notion: {
    enabled: boolean;
  };
};

export interface ChatbotContext {
  generatedAt: string;
  companies: SanitizedCompany[];
  tasks: Task[];
  interviews: Interview[];
  esDocuments: ESDocument[];
  selfAnalysis: SelfAnalysis[];
  tips: Tip[];
  events: CompanyEvent[];
  config: SanitizedConfig;
}

function sanitizeCompanies(companies: Company[]): SanitizedCompany[] {
  return companies.map((company) => ({
    id: company.id,
    slug: company.slug,
    name: company.name,
    industry: company.industry,
    url: company.url,
    mypageUrl: company.mypageUrl,
    location: company.location,
    status: company.status,
    priority: company.priority,
    stages: company.stages,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
    memo: company.memo,
    expectedResultPeriod: company.expectedResultPeriod,
    hasLoginId: company.loginId.trim().length > 0,
    hasPassword: company.password.trim().length > 0,
    hasExamId: company.examId.trim().length > 0,
  }));
}

function sanitizeConfig(config: AppConfig): SanitizedConfig {
  return {
    defaultStages: config.defaultStages,
    industries: config.industries,
    taskCategories: config.taskCategories,
    interviewStatuses: config.interviewStatuses,
    testCenterId: config.testCenterId,
    notion: {
      enabled: config.notion.enabled,
    },
  };
}

export async function getChatbotContext(): Promise<ChatbotContext> {
  const [
    companies,
    tasks,
    interviews,
    esDocuments,
    selfAnalysis,
    tips,
    events,
    config,
  ] = await Promise.all([
    getAllCompanies(),
    getAllTasks(),
    getAllInterviews(),
    getAllESDocuments(),
    getAllSelfAnalysis(),
    getAllTips(),
    getAllEvents(),
    getConfig(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    companies: sanitizeCompanies(companies),
    tasks,
    interviews,
    esDocuments,
    selfAnalysis,
    tips,
    events,
    config: sanitizeConfig(config),
  };
}
