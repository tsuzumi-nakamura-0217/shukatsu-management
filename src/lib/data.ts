import fs from "fs";
import path from "path";
import matter from "gray-matter";
import slugify from "slugify";
import { v4 as uuidv4 } from "uuid";
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

const DATA_DIR = path.join(process.cwd(), "data");
const COMPANIES_DIR = path.join(DATA_DIR, "companies");
const TASKS_FILE = path.join(DATA_DIR, "tasks.json");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");
const SELF_ANALYSIS_DIR = path.join(DATA_DIR, "self-analysis");
const TEMPLATES_DIR = path.join(DATA_DIR, "templates");

// ============================================================
// Helper functions
// ============================================================

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function generateSlug(name: string): string {
  // Japanese text: use timestamp-based slug
  const base = slugify(name, { lower: true, strict: true });
  if (!base) {
    return `company-${Date.now()}`;
  }
  return base;
}

function now(): string {
  return new Date().toISOString().split("T")[0];
}

// ============================================================
// Config operations
// ============================================================

export function getConfig(): AppConfig {
  const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
  return JSON.parse(raw);
}

export function updateConfig(config: Partial<AppConfig>): AppConfig {
  const current = getConfig();
  const updated = { ...current, ...config };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), "utf-8");
  return updated;
}

// ============================================================
// Company operations
// ============================================================

export function getAllCompanies(): Company[] {
  ensureDir(COMPANIES_DIR);
  const dirs = fs.readdirSync(COMPANIES_DIR).filter((d) => {
    const fullPath = path.join(COMPANIES_DIR, d);
    return fs.statSync(fullPath).isDirectory();
  });

  return dirs
    .map((slug) => getCompany(slug))
    .filter((c): c is Company => c !== null);
}

export function getCompany(slug: string): Company | null {
  const companyFile = path.join(COMPANIES_DIR, slug, "company.md");
  if (!fs.existsSync(companyFile)) return null;

  const raw = fs.readFileSync(companyFile, "utf-8");
  const { data, content } = matter(raw);

  return {
    slug,
    name: data.name || "",
    industry: data.industry || "",
    url: data.url || "",
    location: data.location || "",
    status: data.status || "未応募",
    priority: data.priority || 3,
    score: data.score || 5,
    tags: data.tags || [],
    stages: data.stages || getConfig().defaultStages,
    createdAt: data.createdAt || now(),
    updatedAt: data.updatedAt || now(),
    memo: content.trim(),
  };
}

export function createCompany(input: CompanyCreate): Company {
  const config = getConfig();
  let slug = generateSlug(input.name);

  // Ensure unique slug
  const companyDir = path.join(COMPANIES_DIR, slug);
  if (fs.existsSync(companyDir)) {
    slug = `${slug}-${Date.now()}`;
  }

  const dir = path.join(COMPANIES_DIR, slug);
  ensureDir(dir);
  ensureDir(path.join(dir, "es"));
  ensureDir(path.join(dir, "interviews"));

  const company: Company = {
    slug,
    name: input.name,
    industry: input.industry || "",
    url: input.url || "",
    location: input.location || "",
    status: input.status || "未応募",
    priority: input.priority || 3,
    score: input.score || 5,
    tags: input.tags || [],
    stages: input.stages || config.defaultStages,
    createdAt: now(),
    updatedAt: now(),
    memo: "",
  };

  saveCompany(company);
  return company;
}

export function saveCompany(company: Company): void {
  const dir = path.join(COMPANIES_DIR, company.slug);
  ensureDir(dir);

  const frontmatter = {
    name: company.name,
    industry: company.industry,
    url: company.url,
    location: company.location,
    status: company.status,
    priority: company.priority,
    score: company.score,
    tags: company.tags,
    stages: company.stages,
    createdAt: company.createdAt,
    updatedAt: now(),
  };

  const content = matter.stringify(company.memo || "", frontmatter);
  fs.writeFileSync(path.join(dir, "company.md"), content, "utf-8");
}

export function deleteCompany(slug: string): boolean {
  const dir = path.join(COMPANIES_DIR, slug);
  if (!fs.existsSync(dir)) return false;
  fs.rmSync(dir, { recursive: true, force: true });

  // Also remove related tasks
  const tasks = getAllTasks().filter((t) => t.companySlug !== slug);
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), "utf-8");

  return true;
}

// ============================================================
// Task operations
// ============================================================

export function getAllTasks(): Task[] {
  if (!fs.existsSync(TASKS_FILE)) return [];
  const raw = fs.readFileSync(TASKS_FILE, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getTask(id: string): Task | null {
  const tasks = getAllTasks();
  return tasks.find((t) => t.id === id) || null;
}

export function createTask(input: TaskCreate): Task {
  const tasks = getAllTasks();
  const company = getCompany(input.companySlug);

  const task: Task = {
    id: uuidv4(),
    title: input.title,
    companySlug: input.companySlug,
    companyName: company?.name || "",
    category: input.category || "その他",
    priority: input.priority || "medium",
    deadline: input.deadline || "",
    completed: false,
    memo: input.memo || "",
    createdAt: now(),
    updatedAt: now(),
  };

  tasks.push(task);
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), "utf-8");
  return task;
}

export function updateTask(id: string, updates: Partial<Task>): Task | null {
  const tasks = getAllTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;

  tasks[idx] = { ...tasks[idx], ...updates, updatedAt: now() };
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), "utf-8");
  return tasks[idx];
}

export function deleteTask(id: string): boolean {
  const tasks = getAllTasks();
  const filtered = tasks.filter((t) => t.id !== id);
  if (filtered.length === tasks.length) return false;
  fs.writeFileSync(TASKS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
  return true;
}

// ============================================================
// Interview operations
// ============================================================

export function getInterviews(companySlug: string): Interview[] {
  const dir = path.join(COMPANIES_DIR, companySlug, "interviews");
  ensureDir(dir);

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  return files.map((filename) => {
    const raw = fs.readFileSync(path.join(dir, filename), "utf-8");
    const { data, content } = matter(raw);
    return {
      id: data.id || filename.replace(".md", ""),
      companySlug,
      type: data.type || "",
      date: data.date || "",
      location: data.location || "",
      result: data.result || "結果待ち",
      memo: content.trim(),
      createdAt: data.createdAt || now(),
      updatedAt: data.updatedAt || now(),
    };
  });
}

export function createInterview(
  companySlug: string,
  input: InterviewCreate
): Interview {
  const dir = path.join(COMPANIES_DIR, companySlug, "interviews");
  ensureDir(dir);

  const id = uuidv4();
  const interview: Interview = {
    id,
    companySlug,
    type: input.type,
    date: input.date,
    location: input.location || "",
    result: input.result || "結果待ち",
    memo: input.memo || "",
    createdAt: now(),
    updatedAt: now(),
  };

  const frontmatter = {
    id: interview.id,
    type: interview.type,
    date: interview.date,
    location: interview.location,
    result: interview.result,
    createdAt: interview.createdAt,
    updatedAt: interview.updatedAt,
  };

  const fileContent = matter.stringify(interview.memo, frontmatter);
  const filename = `${interview.date}-${interview.type}.md`.replace(/\//g, "-");
  fs.writeFileSync(path.join(dir, filename), fileContent, "utf-8");

  return interview;
}

export function updateInterview(
  companySlug: string,
  id: string,
  updates: Partial<Interview>
): Interview | null {
  const interviews = getInterviews(companySlug);
  const interview = interviews.find((i) => i.id === id);
  if (!interview) return null;

  // Delete old file
  const dir = path.join(COMPANIES_DIR, companySlug, "interviews");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), "utf-8");
    const { data } = matter(raw);
    if (data.id === id) {
      fs.unlinkSync(path.join(dir, file));
      break;
    }
  }

  const updated: Interview = {
    ...interview,
    ...updates,
    updatedAt: now(),
  };

  const frontmatter = {
    id: updated.id,
    type: updated.type,
    date: updated.date,
    location: updated.location,
    result: updated.result,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };

  const fileContent = matter.stringify(updated.memo, frontmatter);
  const filename = `${updated.date}-${updated.type}.md`.replace(/\//g, "-");
  fs.writeFileSync(path.join(dir, filename), fileContent, "utf-8");

  return updated;
}

export function deleteInterview(companySlug: string, id: string): boolean {
  const dir = path.join(COMPANIES_DIR, companySlug, "interviews");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));

  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), "utf-8");
    const { data } = matter(raw);
    if (data.id === id) {
      fs.unlinkSync(path.join(dir, file));
      return true;
    }
  }
  return false;
}

// ============================================================
// ES Document operations
// ============================================================

export function getESDocuments(companySlug: string): ESDocument[] {
  const dir = path.join(COMPANIES_DIR, companySlug, "es");
  ensureDir(dir);

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  return files.map((filename) => {
    const raw = fs.readFileSync(path.join(dir, filename), "utf-8");
    const { data, content } = matter(raw);
    const stat = fs.statSync(path.join(dir, filename));
    return {
      filename,
      title: data.title || filename.replace(".md", ""),
      content: content.trim(),
      updatedAt: stat.mtime.toISOString().split("T")[0],
    };
  });
}

export function saveESDocument(
  companySlug: string,
  filename: string,
  title: string,
  content: string
): ESDocument {
  const dir = path.join(COMPANIES_DIR, companySlug, "es");
  ensureDir(dir);

  const fname = filename.endsWith(".md") ? filename : `${filename}.md`;
  const fileContent = matter.stringify(content, { title });
  fs.writeFileSync(path.join(dir, fname), fileContent, "utf-8");

  return {
    filename: fname,
    title,
    content,
    updatedAt: now(),
  };
}

export function deleteESDocument(
  companySlug: string,
  filename: string
): boolean {
  const filePath = path.join(COMPANIES_DIR, companySlug, "es", filename);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

// ============================================================
// Self-analysis operations
// ============================================================

export function getAllSelfAnalysis(): SelfAnalysis[] {
  ensureDir(SELF_ANALYSIS_DIR);
  const customDir = path.join(SELF_ANALYSIS_DIR, "custom");
  ensureDir(customDir);

  const results: SelfAnalysis[] = [];

  // Main files
  const mainFiles = fs
    .readdirSync(SELF_ANALYSIS_DIR)
    .filter((f) => f.endsWith(".md"));
  for (const filename of mainFiles) {
    const raw = fs.readFileSync(
      path.join(SELF_ANALYSIS_DIR, filename),
      "utf-8"
    );
    const { data, content } = matter(raw);
    results.push({
      filename,
      title: data.title || filename.replace(".md", ""),
      content: content.trim(),
    });
  }

  // Custom files
  const customFiles = fs
    .readdirSync(customDir)
    .filter((f) => f.endsWith(".md"));
  for (const filename of customFiles) {
    const raw = fs.readFileSync(path.join(customDir, filename), "utf-8");
    const { data, content } = matter(raw);
    results.push({
      filename: `custom/${filename}`,
      title: data.title || filename.replace(".md", ""),
      content: content.trim(),
    });
  }

  return results;
}

export function saveSelfAnalysis(
  filename: string,
  title: string,
  content: string
): SelfAnalysis {
  const filePath = path.join(SELF_ANALYSIS_DIR, filename);
  const dir = path.dirname(filePath);
  ensureDir(dir);

  const fileContent = matter.stringify(content, { title });
  fs.writeFileSync(filePath, fileContent, "utf-8");

  return { filename, title, content };
}

export function deleteSelfAnalysis(filename: string): boolean {
  const filePath = path.join(SELF_ANALYSIS_DIR, filename);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

// ============================================================
// Template operations
// ============================================================

export function getAllTemplates(): Template[] {
  ensureDir(TEMPLATES_DIR);

  const files = fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith(".md"));
  return files.map((filename) => {
    const raw = fs.readFileSync(path.join(TEMPLATES_DIR, filename), "utf-8");
    const { data, content } = matter(raw);
    return {
      filename,
      title: data.title || filename.replace(".md", ""),
      description: data.description || "",
      content: content.trim(),
    };
  });
}

export function saveTemplate(
  filename: string,
  title: string,
  description: string,
  content: string
): Template {
  const fname = filename.endsWith(".md") ? filename : `${filename}.md`;
  const fileContent = matter.stringify(content, { title, description });
  fs.writeFileSync(path.join(TEMPLATES_DIR, fname), fileContent, "utf-8");

  return { filename: fname, title, description, content };
}

export function deleteTemplate(filename: string): boolean {
  const filePath = path.join(TEMPLATES_DIR, filename);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

// ============================================================
// Stats operations
// ============================================================

export function getStats() {
  const companies = getAllCompanies();
  const tasks = getAllTasks();

  const statusCounts: Record<string, number> = {};
  for (const company of companies) {
    statusCounts[company.status] = (statusCounts[company.status] || 0) + 1;
  }

  const todayStr = now();
  const upcomingDeadlines = tasks
    .filter((t) => !t.completed && t.deadline && t.deadline >= todayStr)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 5);

  // Gather upcoming interviews from all companies
  const allInterviews: (Interview & { companyName: string })[] = [];
  for (const company of companies) {
    const interviews = getInterviews(company.slug);
    for (const interview of interviews) {
      if (interview.date >= todayStr) {
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
    passRate: totalDecided > 0 ? Math.round((passedCount / totalDecided) * 100) : 0,
  };
}

// ============================================================
// Calendar event operations
// ============================================================

export function getCalendarEvents(): {
  id: string;
  title: string;
  date: string;
  type: string;
  companySlug: string;
  companyName: string;
  color: string;
}[] {
  const companies = getAllCompanies();
  const tasks = getAllTasks();
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
    const interviews = getInterviews(company.slug);
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
