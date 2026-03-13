import { supabase } from "./supabase";
import slugify from "slugify";
import {
  decryptCompanyPassword,
  encryptCompanyPassword,
} from "./company-credentials";
import type {
  Company,
  CompanyCreate,
  Task,
  TaskCreate,
  Interview,
  InterviewCreate,
  ESDocument,
  SelfAnalysis,
  Template,
  AppConfig,
} from "@/types";

// ============================================================
// Helper functions
// ============================================================

function generateSlug(name: string): string {
  const base = slugify(name, { lower: true, strict: true });
  if (!base) {
    return `company-${Date.now()}`;
  }
  return base;
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function toISODate(d: string | null | undefined): string {
  if (!d) return "";
  return typeof d === "string" ? d.split("T")[0] : "";
}

// Convert Supabase snake_case row to camelCase Company
function rowToCompany(row: Record<string, unknown>): Company {
  let decryptedPassword = "";
  try {
    decryptedPassword = decryptCompanyPassword(
      (row.password_encrypted as string) || ""
    );
  } catch {
    decryptedPassword = "";
  }

  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    industry: (row.industry as string) || "",
    url: (row.url as string) || "",
    mypageUrl: (row.mypage_url as string) || "",
    loginId: (row.login_id as string) || "",
    password: decryptedPassword,
    location: (row.location as string) || "",
    status: (row.status as string) || "未応募",
    priority: (row.priority as number) || 3,
    stages: (row.stages as string[]) || [],
    createdAt: toISODate(row.created_at as string),
    updatedAt: toISODate(row.updated_at as string),
    memo: (row.memo as string) || "",
  };
}

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    companyId: (row.company_id as string) || "",
    companySlug: (row.company_slug as string) || "",
    companyName: (row.company_name as string) || "",
    category: (row.category as string) || "その他",
    priority: (row.priority as "high" | "medium" | "low") || "medium",
    deadline: toISODate(row.deadline as string),
    completed: (row.completed as boolean) || false,
    memo: (row.memo as string) || "",
    notionPageId: (row.notion_page_id as string) || undefined,
    createdAt: toISODate(row.created_at as string),
    updatedAt: toISODate(row.updated_at as string),
  };
}

function rowToInterview(row: Record<string, unknown>): Interview {
  return {
    id: row.id as string,
    companyId: (row.company_id as string) || "",
    companySlug: (row.company_slug as string) || "",
    type: (row.type as string) || "",
    date: toISODate(row.date as string),
    location: (row.location as string) || "",
    result: (row.result as string) || "結果待ち",
    memo: (row.memo as string) || "",
    createdAt: toISODate(row.created_at as string),
    updatedAt: toISODate(row.updated_at as string),
  };
}

function rowToESDocument(row: Record<string, unknown>): ESDocument {
  return {
    id: row.id as string,
    companyId: (row.company_id as string) || "",
    companySlug: (row.company_slug as string) || "",
    title: (row.title as string) || "",
    content: (row.content as string) || "",
    updatedAt: toISODate(row.updated_at as string),
  };
}

function rowToSelfAnalysis(row: Record<string, unknown>): SelfAnalysis {
  return {
    id: row.id as string,
    title: (row.title as string) || "",
    content: (row.content as string) || "",
  };
}

function rowToTemplate(row: Record<string, unknown>): Template {
  return {
    id: row.id as string,
    title: (row.title as string) || "",
    description: (row.description as string) || "",
    content: (row.content as string) || "",
  };
}

// ============================================================
// Config operations
// ============================================================

export async function getConfig(): Promise<AppConfig> {
  const { data, error } = await supabase.from("config").select("key, value");

  if (error || !data) {
    // Return default config on error
    return {
      defaultStages: [],
      industries: [],
      taskCategories: [],
      notion: { apiKey: "", databaseId: "", enabled: false },
    };
  }

  const configMap: Record<string, unknown> = {};
  for (const row of data) {
    configMap[row.key] = row.value;
  }

  return {
    defaultStages: (configMap.defaultStages as string[]) || [],
    industries: (configMap.industries as string[]) || [],
    taskCategories: (configMap.taskCategories as string[]) || [],
    notion: (configMap.notion as AppConfig["notion"]) || {
      apiKey: "",
      databaseId: "",
      enabled: false,
    },
  };
}

export async function updateConfig(
  config: Partial<AppConfig>
): Promise<AppConfig> {
  const current = await getConfig();
  const updated = { ...current, ...config };

  // Upsert each key
  const entries: { key: string; value: unknown }[] = [
    { key: "defaultStages", value: updated.defaultStages },
    { key: "industries", value: updated.industries },
    { key: "taskCategories", value: updated.taskCategories },
    { key: "notion", value: updated.notion },
  ];

  for (const entry of entries) {
    await supabase
      .from("config")
      .upsert({ key: entry.key, value: entry.value }, { onConflict: "key" });
  }

  return updated;
}

// ============================================================
// Company operations
// ============================================================

export async function getAllCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("priority", { ascending: false });

  if (error || !data) return [];
  return data.map(rowToCompany);
}

export async function getCompany(slug: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return rowToCompany(data);
}

export async function createCompany(input: CompanyCreate): Promise<Company> {
  const config = await getConfig();
  let slug = generateSlug(input.name);

  // Ensure unique slug
  const { data: existing } = await supabase
    .from("companies")
    .select("slug")
    .eq("slug", slug)
    .single();

  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }

  const row = {
    slug,
    name: input.name,
    industry: input.industry || "",
    url: input.url || "",
    mypage_url: input.mypageUrl || "",
    login_id: input.loginId || "",
    password_encrypted: encryptCompanyPassword(input.password || ""),
    location: input.location || "",
    status: input.status || "未応募",
    priority: input.priority || 3,
    stages: input.stages || config.defaultStages,
    memo: "",
  };

  const { data, error } = await supabase
    .from("companies")
    .insert(row)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create company: ${error?.message}`);
  }

  return rowToCompany(data);
}

export async function saveCompany(company: Company): Promise<void> {
  await supabase
    .from("companies")
    .update({
      name: company.name,
      industry: company.industry,
      url: company.url,
      mypage_url: company.mypageUrl,
      login_id: company.loginId,
      password_encrypted: encryptCompanyPassword(company.password),
      location: company.location,
      status: company.status,
      priority: company.priority,
      stages: company.stages,
      memo: company.memo,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", company.slug);
}

export async function deleteCompany(slug: string): Promise<boolean> {
  const { error } = await supabase
    .from("companies")
    .delete()
    .eq("slug", slug);

  return !error;
}

// ============================================================
// Task operations
// ============================================================

export async function getAllTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(rowToTask);
}

export async function getTask(id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return rowToTask(data);
}

export async function createTask(input: TaskCreate): Promise<Task> {
  const company = await getCompany(input.companySlug);

  const row = {
    company_id: company?.id || null,
    company_slug: input.companySlug,
    company_name: company?.name || "",
    title: input.title,
    category: input.category || "その他",
    priority: input.priority || "medium",
    deadline: input.deadline || null,
    completed: false,
    memo: input.memo || "",
  };

  const { data, error } = await supabase
    .from("tasks")
    .insert(row)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create task: ${error?.message}`);
  }

  return rowToTask(data);
}

export async function updateTask(
  id: string,
  updates: Partial<Task>
): Promise<Task | null> {
  // Convert camelCase to snake_case for DB
  const dbUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.deadline !== undefined)
    dbUpdates.deadline = updates.deadline || null;
  if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
  if (updates.memo !== undefined) dbUpdates.memo = updates.memo;
  if (updates.notionPageId !== undefined)
    dbUpdates.notion_page_id = updates.notionPageId;
  if (updates.companySlug !== undefined) {
    dbUpdates.company_slug = updates.companySlug;
    const company = await getCompany(updates.companySlug);
    if (company) {
      dbUpdates.company_id = company.id;
      dbUpdates.company_name = company.name;
    }
  }
  if (updates.companyName !== undefined)
    dbUpdates.company_name = updates.companyName;

  const { data, error } = await supabase
    .from("tasks")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return null;
  return rowToTask(data);
}

export async function deleteTask(id: string): Promise<boolean> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  return !error;
}

// ============================================================
// Interview operations
// ============================================================

export async function getInterviews(
  companySlug: string
): Promise<Interview[]> {
  const { data, error } = await supabase
    .from("interviews")
    .select("*")
    .eq("company_slug", companySlug)
    .order("date", { ascending: false });

  if (error || !data) return [];
  return data.map(rowToInterview);
}

export async function createInterview(
  companySlug: string,
  input: InterviewCreate
): Promise<Interview> {
  const company = await getCompany(companySlug);

  const row = {
    company_id: company?.id || null,
    company_slug: companySlug,
    type: input.type,
    date: input.date,
    location: input.location || "",
    result: input.result || "結果待ち",
    memo: input.memo || "",
  };

  const { data, error } = await supabase
    .from("interviews")
    .insert(row)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create interview: ${error?.message}`);
  }

  return rowToInterview(data);
}

export async function updateInterview(
  companySlug: string,
  id: string,
  updates: Partial<Interview>
): Promise<Interview | null> {
  const dbUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.date !== undefined) dbUpdates.date = updates.date;
  if (updates.location !== undefined) dbUpdates.location = updates.location;
  if (updates.result !== undefined) dbUpdates.result = updates.result;
  if (updates.memo !== undefined) dbUpdates.memo = updates.memo;

  const { data, error } = await supabase
    .from("interviews")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return null;
  return rowToInterview(data);
}

export async function deleteInterview(
  companySlug: string,
  id: string
): Promise<boolean> {
  const { error } = await supabase.from("interviews").delete().eq("id", id);
  return !error;
}

// ============================================================
// ES Document operations
// ============================================================

export async function getESDocuments(
  companySlug: string
): Promise<ESDocument[]> {
  const { data, error } = await supabase
    .from("es_documents")
    .select("*")
    .eq("company_slug", companySlug)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return data.map(rowToESDocument);
}

export async function saveESDocument(
  companySlug: string,
  id: string | null,
  title: string,
  content: string
): Promise<ESDocument> {
  const company = await getCompany(companySlug);

  if (id) {
    // Update existing
    const { data, error } = await supabase
      .from("es_documents")
      .update({
        title,
        content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update ES document: ${error?.message}`);
    }
    return rowToESDocument(data);
  } else {
    // Create new
    const row = {
      company_id: company?.id || null,
      company_slug: companySlug,
      title,
      content,
    };

    const { data, error } = await supabase
      .from("es_documents")
      .insert(row)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create ES document: ${error?.message}`);
    }
    return rowToESDocument(data);
  }
}

export async function deleteESDocument(
  companySlug: string,
  id: string
): Promise<boolean> {
  const { error } = await supabase.from("es_documents").delete().eq("id", id);
  return !error;
}

// ============================================================
// Self-analysis operations
// ============================================================

export async function getAllSelfAnalysis(): Promise<SelfAnalysis[]> {
  const { data, error } = await supabase
    .from("self_analysis")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(rowToSelfAnalysis);
}

export async function saveSelfAnalysis(
  id: string | null,
  title: string,
  content: string
): Promise<SelfAnalysis> {
  if (id) {
    const { data, error } = await supabase
      .from("self_analysis")
      .update({ title, content, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update self-analysis: ${error?.message}`);
    }
    return rowToSelfAnalysis(data);
  } else {
    const { data, error } = await supabase
      .from("self_analysis")
      .insert({ title, content })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create self-analysis: ${error?.message}`);
    }
    return rowToSelfAnalysis(data);
  }
}

export async function deleteSelfAnalysis(id: string): Promise<boolean> {
  const { error } = await supabase.from("self_analysis").delete().eq("id", id);
  return !error;
}

// ============================================================
// Template operations
// ============================================================

export async function getAllTemplates(): Promise<Template[]> {
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(rowToTemplate);
}

export async function saveTemplate(
  id: string | null,
  title: string,
  description: string,
  content: string
): Promise<Template> {
  if (id) {
    const { data, error } = await supabase
      .from("templates")
      .update({
        title,
        description,
        content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update template: ${error?.message}`);
    }
    return rowToTemplate(data);
  } else {
    const { data, error } = await supabase
      .from("templates")
      .insert({ title, description, content })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create template: ${error?.message}`);
    }
    return rowToTemplate(data);
  }
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const { error } = await supabase.from("templates").delete().eq("id", id);
  return !error;
}

// ============================================================
// Stats operations
// ============================================================

export async function getStats() {
  const companies = await getAllCompanies();
  const tasks = await getAllTasks();

  const statusCounts: Record<string, number> = {};
  for (const company of companies) {
    statusCounts[company.status] = (statusCounts[company.status] || 0) + 1;
  }

  const today = todayStr();
  const upcomingDeadlines = tasks
    .filter((t) => !t.completed && t.deadline && t.deadline >= today)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 5);

  // Gather upcoming interviews from all companies
  const allInterviews: (Interview & { companyName: string })[] = [];
  for (const company of companies) {
    const interviews = await getInterviews(company.slug);
    for (const interview of interviews) {
      if (interview.date >= today) {
        allInterviews.push({ ...interview, companyName: company.name });
      }
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
    completedTasks: tasks.filter((t) => t.completed).length,
    totalTasks: tasks.length,
    passRate:
      totalDecided > 0
        ? Math.round((passedCount / totalDecided) * 100)
        : 0,
  };
}

// ============================================================
// Calendar event operations
// ============================================================

export async function getCalendarEvents(): Promise<
  {
    id: string;
    title: string;
    date: string;
    type: string;
    companySlug: string;
    companyName: string;
    color: string;
  }[]
> {
  const companies = await getAllCompanies();
  const tasks = await getAllTasks();
  const events: {
    id: string;
    title: string;
    date: string;
    type: string;
    companySlug: string;
    companyName: string;
    color: string;
  }[] = [];

  // Interviews
  for (const company of companies) {
    const interviews = await getInterviews(company.slug);
    for (const interview of interviews) {
      events.push({
        id: interview.id,
        title: `${company.name} - ${interview.type}`,
        date: interview.date,
        type: "interview",
        companySlug: company.slug,
        companyName: company.name,
        color: "#3b82f6", // blue
      });
    }
  }

  // Task deadlines
  for (const task of tasks) {
    if (task.deadline && !task.completed) {
      events.push({
        id: task.id,
        title: `${task.companyName || ""} - ${task.title}`,
        date: task.deadline,
        type: task.category === "ES" ? "es" : "deadline",
        companySlug: task.companySlug,
        companyName: task.companyName || "",
        color: task.category === "ES" ? "#eab308" : "#ef4444", // yellow / red
      });
    }
  }

  return events;
}
