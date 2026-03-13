// 企業情報の型定義
export interface Company {
  id: string;
  slug: string;
  name: string;
  industry: string;
  url: string;
  mypageUrl: string;
  loginId: string;
  password: string;
  location: string;
  status: string;
  priority: number; // 1-5
  stages: string[];
  createdAt: string;
  updatedAt: string;
  memo: string;
}

// 企業作成用
export interface CompanyCreate {
  name: string;
  industry?: string;
  url?: string;
  mypageUrl?: string;
  loginId?: string;
  password?: string;
  location?: string;
  status?: string;
  priority?: number;
  stages?: string[];
}

// タスクの型定義
export interface Task {
  id: string;
  title: string;
  companyId: string;
  companySlug: string;
  companyName?: string;
  category: string;
  priority: "high" | "medium" | "low";
  deadline: string;
  completed: boolean;
  memo: string;
  notionPageId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCreate {
  title: string;
  companySlug: string;
  category?: string;
  priority?: "high" | "medium" | "low";
  deadline?: string;
  memo?: string;
}

// 面接記録の型定義
export interface Interview {
  id: string;
  companyId: string;
  companySlug: string;
  type: string; // "1次面接", "2次面接" etc.
  date: string;
  location: string;
  result: string; // "通過", "不合格", "結果待ち"
  memo: string; // Markdown本文
  createdAt: string;
  updatedAt: string;
}

export interface InterviewCreate {
  type: string;
  date: string;
  location?: string;
  result?: string;
  memo?: string;
}

// ES文書の型定義
export interface ESDocument {
  id: string;
  companyId: string;
  companySlug: string;
  title: string;
  content: string;
  updatedAt: string;
}

// 自己分析メモの型定義
export interface SelfAnalysis {
  id: string;
  title: string;
  content: string;
}

// テンプレートの型定義
export interface Template {
  id: string;
  title: string;
  description: string;
  content: string;
}

// 設定の型定義
export interface AppConfig {
  defaultStages: string[];
  industries: string[];
  taskCategories: string[];
  notion: NotionConfig;
}

export interface NotionConfig {
  apiKey: string;
  databaseId: string;
  enabled: boolean;
}

// 統計の型定義
export interface Stats {
  totalCompanies: number;
  statusCounts: Record<string, number>;
  upcomingDeadlines: Task[];
  upcomingInterviews: (Interview & { companyName: string })[];
  completedTasks: number;
  totalTasks: number;
  passRate: number;
  totalInterviews: number;
  totalESDocuments: number;
  interviewResultCounts: {
    通過: number;
    不合格: number;
    結果待ち: number;
  };
}

// カレンダーイベントの型定義
export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: "interview" | "deadline" | "es";
  companySlug: string;
  companyName: string;
  color: string;
}
