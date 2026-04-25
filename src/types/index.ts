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
  examId: string; // Add this
  location: string;
  status: string;
  priority: number; // 1-5
  stages: string[];
  createdAt: string;
  updatedAt: string;
  memo: string;
  expectedResultPeriod?: string;
}

// 企業作成用
export interface CompanyCreate {
  name: string;
  industry?: string;
  url?: string;
  mypageUrl?: string;
  loginId?: string;
  password?: string;
  examId?: string; // Add this
  location?: string;
  status?: string;
  priority?: number;
  stages?: string[];
  expectedResultPeriod?: string;
}

// タスクの型定義
export interface Task {
  id: string;
  title: string;
  companyId: string;
  companySlug: string;
  companyName?: string;
  category: string;
  executionDate: string;
  deadline: string;
  status: "未着手" | "進行中" | "完了";
  memo: string;
  notionPageId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCreate {
  title: string;
  companySlug: string;
  category?: string;
  executionDate?: string;
  deadline?: string;
  status?: "未着手" | "進行中" | "完了";
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

// イベント記録の型定義
export interface CompanyEvent {
  id: string;
  companyId: string;
  companySlug: string;
  title: string;
  type: string; // "説明会", "サマーインターン", etc.
  date: string;
  endDate?: string;
  location: string;
  memo: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyEventCreate {
  title: string;
  type: string;
  date: string;
  endDate?: string;
  location?: string;
  memo?: string;
}

// ES文書の型定義
export interface ESDocument {
  id: string;
  companyId: string;
  companySlug: string;
  companyName?: string;
  title: string;
  content: string;
  updatedAt: string;
  charCount?: number;
  characterLimit?: number;
  characterLimitType?: "程度" | "以下" | "未満" | "";
  status?: "未提出" | "提出済" | "結果待ち" | "通過" | "落選" | "";
  shareToken?: string | null;
}

// ESコメントの型定義
export interface ESComment {
  id: string;
  esDocumentId: string;
  content: string;
  highlightedText: string;
  positionFrom: number;
  positionTo: number;
  resolved: boolean;
  authorName?: string | null;
  createdAt: string;
  updatedAt: string;
}

// 自己分析メモの型定義
export interface SelfAnalysis {
  id: string;
  title: string;
  content: string;
}

// Tipsの型定義
export interface Tip {
  id: string;
  title: string;
  category: string;
  content: string;
}

// 設定の型定義
export interface AppConfig {
  defaultStages: string[];
  industries: string[];
  taskCategories: string[];
  interviewStatuses: string[];
  testCenterId: string;
  notion: NotionConfig;
}

export interface NotionConfig {
  apiKey: string;
  databaseId: string;
  databaseType?: "database" | "data_source";
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
  interviewResultCounts: Record<string, number>;
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
