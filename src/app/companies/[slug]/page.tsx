"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  Trash2,
  Plus,
  Save,
  FileText,
  MessageSquare,
  CheckSquare,
  BookOpen,
  Edit,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { FlexibleDateInput } from "@/components/ui/flexible-date-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge, statusColors } from "@/components/badges";
import { cn } from "@/lib/utils";
// Markdown components were replaced by NotionEditor
import dynamic from "next/dynamic";
const NotionEditor = dynamic(() => import("@/components/notion-editor").then(mod => mod.NotionEditor), { ssr: false });
import { countCharacters, formatDate, getSectionCharacterCounts, getPlainText, isFuzzyDatePassed } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useCompanyDetail, invalidateStats, invalidateAllTasks } from "@/hooks/use-api";
import type { Company, Task, Interview, ESDocument, AppConfig } from "@/types";

function normalizeDateTimeForCompare(value: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
}

function hasTaskChanges(current: Task | null, original?: Task): boolean {
  if (!current || !original) return false;

  return (
    current.title !== original.title ||
    current.companySlug !== original.companySlug ||
    (current.companyName || "") !== (original.companyName || "") ||
    current.category !== original.category ||
    current.executionDate !== original.executionDate ||
    normalizeDateTimeForCompare(current.deadline) !== normalizeDateTimeForCompare(original.deadline) ||
    current.status !== original.status ||
    current.memo !== original.memo
  );
}

export default function CompanyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "es";
  const {
    company, tasks, interviews, esDocs, config,
    mutate: mutateDetail, revalidate,
  } = useCompanyDetail(slug);
  // Local state for tasks/interviews to allow optimistic updates
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [localInterviews, setLocalInterviews] = useState<Interview[]>([]);
  const [localEsDocs, setLocalEsDocs] = useState<ESDocument[]>([]);
  useEffect(() => { setLocalTasks(tasks); }, [tasks]);
  useEffect(() => { setLocalInterviews(interviews); }, [interviews]);
  useEffect(() => { setLocalEsDocs(esDocs); }, [esDocs]);
  const [editMode, setEditMode] = useState(false);
  const [memoContent, setMemoContent] = useState("");
  const [editingCompany, setEditingCompany] = useState<Partial<Company>>({});
  const [showPassword, setShowPassword] = useState(false);

  // Dialogs
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newInterviewOpen, setNewInterviewOpen] = useState(false);
  const [newEsOpen, setNewEsOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isCreatingInterview, setIsCreatingInterview] = useState(false);
  const [isCreatingEs, setIsCreatingEs] = useState(false);
  const [editEsDoc, setEditEsDoc] = useState<ESDocument | null>(null);
  const [expandedEsIds, setExpandedEsIds] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [expandedInterviewIds, setExpandedInterviewIds] = useState<Set<string>>(new Set());
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const [isSavingEs, setIsSavingEs] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [isSavingInterview, setIsSavingInterview] = useState(false);

  // New item forms
  const [newTask, setNewTask] = useState<{ title: string; category: string; executionDate: string; deadline: string; memo: string; status: "未着手" | "進行中" | "完了" }>({ title: "", category: "その他", executionDate: "", deadline: "", memo: "", status: "未着手" });
  const [newInterview, setNewInterview] = useState({ type: "", date: "", location: "", result: "結果待ち", memo: "" });
  const [newEs, setNewEs] = useState({ title: "", content: "", characterLimit: undefined as number | undefined, characterLimitType: "" as "程度" | "以下" | "未満" | "", status: "未提出" as "未提出" | "提出済" | "結果待ち" | "通過" | "落選" | "" });

  // Keep memoContent/editingCompany in sync with SWR data
  useEffect(() => {
    if (company) {
      setMemoContent(company.memo || "");
      setEditingCompany(company);
    }
  }, [company]);

  const handleSaveCompany = async () => {
    if (isSavingMemo) return;
    setIsSavingMemo(true);
    try {
      const res = await fetch(`/api/companies/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editingCompany, memo: memoContent }),
      });
      if (res.ok) {
        // Optimistic update via SWR
        mutateDetail((current) => current ? {
          ...current,
          company: { ...current.company, ...editingCompany, memo: memoContent } as Company,
        } : current, { revalidate: false });
      }
    } finally {
      setIsSavingMemo(false);
    }
  };

  useAutoSave({
    enabled: !!company,
    hasChanges: !!company && (memoContent !== company.memo || JSON.stringify(editingCompany) !== JSON.stringify(company)),
    onSave: handleSaveCompany,
    delay: 1500,
    deps: [memoContent, editingCompany, company?.id],
  });

  const handleDeleteCompany = async () => {
    if (!confirm("この企業を削除しますか？関連するタスクも削除されます。")) return;
    const res = await fetch(`/api/companies/${slug}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("企業を削除しました");
      router.push("/companies");
    }
  };

  const handleUpdateStatus = async (status: string) => {
    const res = await fetch(`/api/companies/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success("ステータスを更新しました");
      revalidate();
    }
  };

  const handleCreateTask = async () => {
    if (isCreatingTask) return;
    setIsCreatingTask(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newTask, companySlug: slug }),
      });
      if (res.ok) {
        toast.success("タスクを追加しました");
        setNewTaskOpen(false);
        setNewTask({ title: "", category: "その他", executionDate: "", deadline: "", memo: "", status: "未着手" });
        revalidate();
      }
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleStatusChangeTask = async (task: Task, newStatus: "未着手" | "進行中" | "完了") => {
    const oldStatus = task.status;

    // 楽観的アップデート: UIを即座に更新
    setLocalTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update task status");
      }

      // 成功時は最新データをバックグラウンドで取得
      revalidate();
    } catch (error) {
      // エラー時は元のステータスに戻す
      setLocalTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: oldStatus } : t));
      toast.error("タスクの更新に失敗しました");
      console.error(error);
    }
  };

  const handleSaveTask = async (taskToSave?: Task) => {
    const target = taskToSave || editingTask;
    if (!target || isSavingTask) return;
    setIsSavingTask(true);
    try {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target),
      });
      if (!taskToSave) {
        // toast.success("タスクを更新しました");
        // setEditingTask(null);
      }
      revalidate();
    } finally {
      setIsSavingTask(false);
    }
  };

  const originalEditingTask = editingTask ? localTasks.find((t) => t.id === editingTask.id) : undefined;

  useAutoSave({
    enabled: !!editingTask,
    hasChanges: hasTaskChanges(editingTask, originalEditingTask),
    onSave: () => handleSaveTask(),
    delay: 1500,
    deps: [editingTask, originalEditingTask],
  });

  const handleDeleteTask = async (id: string) => {
    if (!confirm("このタスクを削除しますか？")) return;
    await fetch("/api/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    toast.success("タスクを削除しました");
    revalidate();
  };

  const handleCreateInterview = async () => {
    if (isCreatingInterview) return;
    setIsCreatingInterview(true);
    try {
      const res = await fetch(`/api/companies/${slug}/interviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newInterview),
      });
      if (res.ok) {
        toast.success("面接記録を追加しました");
        setNewInterviewOpen(false);
        setNewInterview({ type: "", date: "", location: "", result: "結果待ち", memo: "" });
        revalidate();
      }
    } finally {
      setIsCreatingInterview(false);
    }
  };

  const handleSaveInterview = async (interviewToSave?: Interview) => {
    const target = interviewToSave || editingInterview;
    if (!target || isSavingInterview) return;
    setIsSavingInterview(true);
    try {
      await fetch(`/api/companies/${slug}/interviews`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target),
      });
      if (!interviewToSave) {
        // toast.success("面接記録を更新しました");
        // setEditingInterview(null);
      }
      revalidate();
    } finally {
      setIsSavingInterview(false);
    }
  };

  useAutoSave({
    enabled: !!editingInterview,
    hasChanges: !!editingInterview && JSON.stringify(editingInterview) !== JSON.stringify(localInterviews.find(i => i.id === editingInterview.id)),
    onSave: () => handleSaveInterview(),
    delay: 1500,
    deps: [editingInterview],
  });

  const handleDeleteInterview = async (id: string) => {
    if (!confirm("この面接記録を削除しますか？")) return;
    await fetch(`/api/companies/${slug}/interviews`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    toast.success("面接記録を削除しました");
    revalidate();
  };

  const handleCreateEs = async () => {
    if (isCreatingEs) return;
    setIsCreatingEs(true);
    try {
      const res = await fetch(`/api/companies/${slug}/es`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEs),
      });
      if (res.ok) {
        toast.success("文書を作成しました");
        setNewEsOpen(false);
        setNewEs({ title: "", content: "", characterLimit: undefined, characterLimitType: "", status: "未提出" });
        revalidate();
      }
    } finally {
      setIsCreatingEs(false);
    }
  };

  const handleSaveEs = async (docToSave?: ESDocument) => {
    const doc = docToSave || editEsDoc;
    if (!doc || isSavingEs) return;
    setIsSavingEs(true);
    try {
      await fetch(`/api/companies/${slug}/es`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: doc.id,
          title: doc.title,
          content: doc.content,
          characterLimit: doc.characterLimit,
          characterLimitType: doc.characterLimitType,
          status: doc.status
        }),
      });
      revalidate();
    } finally {
      setIsSavingEs(false);
    }
  };

  const handleDeleteEs = async (id: string) => {
    if (!confirm("この文書を削除しますか？")) return;
    const res = await fetch(`/api/companies/${slug}/es`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      toast.success("文書を削除しました");
      if (editEsDoc?.id === id) setEditEsDoc(null);
      revalidate();
    }
  };

  const handleDuplicateEs = async (doc: ESDocument) => {
    const duplicatedTitle = `[コピー] ${doc.title}`;
    try {
      const res = await fetch(`/api/companies/${slug}/es`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: duplicatedTitle,
          content: doc.content,
          characterLimit: doc.characterLimit,
          characterLimitType: doc.characterLimitType,
          status: doc.status
        }),
      });
      if (res.ok) {
        toast.success("文書を複製しました");
        revalidate();
      } else {
        toast.error("文書の複製に失敗しました");
      }
    } catch (error) {
      toast.error("文書の複製に失敗しました");
    }
  };

  useAutoSave({
    enabled: !!editEsDoc,
    hasChanges: !!editEsDoc && (
      editEsDoc.content !== localEsDocs.find(d => d.id === editEsDoc.id)?.content ||
      editEsDoc.title !== localEsDocs.find(d => d.id === editEsDoc.id)?.title ||
      editEsDoc.characterLimit !== localEsDocs.find(d => d.id === editEsDoc.id)?.characterLimit ||
      editEsDoc.characterLimitType !== localEsDocs.find(d => d.id === editEsDoc.id)?.characterLimitType ||
      editEsDoc.status !== localEsDocs.find(d => d.id === editEsDoc.id)?.status
    ),
    onSave: () => handleSaveEs(),
    delay: 1500,
    deps: [editEsDoc],
  });

  const toggleEsExpand = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setExpandedEsIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Collapsing: exit edit mode if this doc was being edited
        if (editEsDoc?.id === id) {
          setEditEsDoc(null);
        }
      } else {
        next.add(id);
        // Expanding: automatically enter edit mode
        const doc = localEsDocs.find(d => d.id === id);
        if (doc) {
          setEditEsDoc(doc);
        }
      }
      return next;
    });
  };

  const toggleInterviewExpand = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setExpandedInterviewIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Collapsing: exit edit mode if this interview was being edited
        if (editingInterview?.id === id) {
          setEditingInterview(null);
        }
      } else {
        next.add(id);
        // Expanding: automatically enter edit mode
        const interview = localInterviews.find(i => i.id === id);
        if (interview) {
          setEditingInterview(interview);
        }
      }
      return next;
    });
  };


  if (!company) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">読み込み中...</p></div>;
  }

  const stages = config?.defaultStages || company.stages || [];
  const currentStageIndex = stages.indexOf(company.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/companies")} className="transition-all">
          <ArrowLeft className="mr-2 h-4 w-4" /> 企業一覧
        </Button>
      </div>

      {/* Company Info Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-muted-foreground">
            {company.industry && <span>{company.industry}</span>}
            {company.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {company.location}
              </span>
            )}
            <div className="flex items-center gap-1 ml-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border text-[10px] font-bold">
              <span className="text-muted-foreground mr-1 uppercase tracking-tighter">Priority</span>
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 w-2.5 rounded-full",
                    i < company.priority
                      ? (company.priority >= 4 ? "bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]" : "bg-primary")
                      : "bg-slate-300 dark:bg-slate-700"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
          {company.url && (
            <Button variant="outline" size="sm" asChild className="h-8 border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300">
              <a href={company.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Webサイト
              </a>
            </Button>
          )}
          {company.mypageUrl && (
            <Button variant="outline" size="sm" asChild className="h-8 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300">
              <a href={company.mypageUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> マイページ
              </a>
            </Button>
          )}
          {isSavingMemo && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Saving</span>
            </div>
          )}
          <div className="h-4 w-[1px] bg-border mx-1 hidden sm:block" />
          <Button variant="outline" size="sm" onClick={() => setEditMode(!editMode)} className="transition-all h-8">
            <Edit className="mr-2 h-4 w-4" /> {editMode ? "キャンセル" : "編集"}
          </Button>
          {editMode && (
            <Button size="sm" onClick={() => { handleSaveCompany(); setEditMode(false); }} className="transition-all h-8">
              <Save className="mr-2 h-4 w-4" /> 完了
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={handleDeleteCompany} className="transition-all h-8">
            <Trash2 className="mr-2 h-4 w-4" /> 削除
          </Button>
        </div>
      </div>

      <Card className="px-4 py-3">
        <div className="space-y-3">
          <CardTitle className="text-sm font-semibold">選考パイプライン</CardTitle>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {stages.map((stage, i) => {
              const isCurrent = stage === company.status;
              const isPast = i < currentStageIndex;
              return (
                <button
                  key={stage}
                  onClick={() => handleUpdateStatus(stage)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${isCurrent
                    ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                    : isPast
                      ? "bg-green-100 text-green-800 hover:bg-green-200"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                >
                  {stage}
                </button>
              );
            })}
          </div>

          <div className="mt-1 pt-2 border-t border-border/50 flex flex-col gap-1.5 sm:flex-row sm:items-center">
            <div className={cn(
              "flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider shrink-0 mr-1 transition-all",
              isFuzzyDatePassed(editingCompany.expectedResultPeriod) ? "text-muted-foreground/50" : "text-muted-foreground"
            )}>
              <Clock className={cn("h-3.5 w-3.5", isFuzzyDatePassed(editingCompany.expectedResultPeriod) ? "text-muted-foreground/30" : "text-primary")} />
              <span>結果通知予定</span>
            </div>
            <FlexibleDateInput
              value={editingCompany.expectedResultPeriod || ""}
              onChange={(val) => setEditingCompany({ ...editingCompany, expectedResultPeriod: val })}
              placeholder="例: 2/17"
              className="w-full sm:w-64"
            />
          </div>
        </div>
      </Card>

      {/* Edit Mode - Company Info */}
      {editMode && (
        <Card>
          <CardHeader>
            <CardTitle>企業情報編集</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>企業名</Label>
                <Input value={editingCompany.name || ""} onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })} />
              </div>
              <div>
                <Label>業界</Label>
                <Select
                  value={editingCompany.industry || ""}
                  onValueChange={(value) =>
                    setEditingCompany({ ...editingCompany, industry: value })
                  }
                >
                  <SelectTrigger className="transition-all duration-200 hover:shadow-md cursor-pointer">
                    <SelectValue placeholder="業界を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {(config?.industries || []).map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>URL</Label>
                <Input value={editingCompany.url || ""} onChange={(e) => setEditingCompany({ ...editingCompany, url: e.target.value })} />
              </div>
              <div>
                <Label>マイページURL</Label>
                <Input
                  value={editingCompany.mypageUrl || ""}
                  onChange={(e) =>
                    setEditingCompany({
                      ...editingCompany,
                      mypageUrl: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>ログインID</Label>
                <Input
                  value={editingCompany.loginId || ""}
                  onChange={(e) =>
                    setEditingCompany({
                      ...editingCompany,
                      loginId: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>パスワード</Label>
                <div className="flex gap-2">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={editingCompany.password || ""}
                    onChange={(e) =>
                      setEditingCompany({
                        ...editingCompany,
                        password: e.target.value,
                      })
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label="パスワード表示切替"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <Label>所在地</Label>
                <Input value={editingCompany.location || ""} onChange={(e) => setEditingCompany({ ...editingCompany, location: e.target.value })} />
              </div>
              <div>
                <Label>優先度 (1-5)</Label>
                <Select
                  value={(editingCompany.priority || 3).toString()}
                  onValueChange={(value) =>
                    setEditingCompany({ ...editingCompany, priority: parseInt(value) })
                  }
                >
                  <SelectTrigger className="w-full transition-all duration-200 hover:shadow-md cursor-pointer">
                    <SelectValue placeholder="優先度を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map((p) => (
                      <SelectItem key={p} value={p.toString()}>
                        {p} {p === 5 ? "(最高)" : p === 1 ? "(最低)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue={initialTab} className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="es" className="gap-2 cursor-pointer hover:bg-muted/80 hover:text-foreground transition-all">
            <FileText className="h-4 w-4" /> ES・志望動機
          </TabsTrigger>
          <TabsTrigger value="interviews" className="gap-2 cursor-pointer hover:bg-muted/80 hover:text-foreground transition-all">
            <MessageSquare className="h-4 w-4" /> 面接記録
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2 cursor-pointer hover:bg-muted/80 hover:text-foreground transition-all">
            <CheckSquare className="h-4 w-4" /> タスク
          </TabsTrigger>
          <TabsTrigger value="memo" className="gap-2 cursor-pointer hover:bg-muted/80 hover:text-foreground transition-all">
            <BookOpen className="h-4 w-4" /> 企業研究メモ
          </TabsTrigger>
        </TabsList>

        {/* ES Tab */}
        <TabsContent value="es" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold">ES・志望動機</h3>
            <Dialog open={newEsOpen} onOpenChange={setNewEsOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="transition-all"><Plus className="mr-2 h-4 w-4" /> 新規作成</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新しい文書を作成</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>タイトル</Label>
                    <Input value={newEs.title} onChange={(e) => setNewEs({ ...newEs, title: e.target.value })} placeholder="エントリーシート" />
                  </div>
                  <div>
                    <Label>字数指定（目標字数）</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        className="flex-1"
                        value={newEs.characterLimit || ""}
                        onChange={(e) => setNewEs({ ...newEs, characterLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="400"
                      />
                      <Select
                        value={newEs.characterLimitType}
                        onValueChange={(val: any) => setNewEs({ ...newEs, characterLimitType: val })}
                      >
                        <SelectTrigger className="w-[100px] transition-all duration-200 hover:shadow-md cursor-pointer">
                          <SelectValue placeholder="種別" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=" ">指定なし</SelectItem>
                          <SelectItem value="程度">程度</SelectItem>
                          <SelectItem value="以下">以下</SelectItem>
                          <SelectItem value="未満">未満</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreateEs}
                    disabled={isCreatingEs}
                    className="transition-transform active:scale-95"
                  >
                    {isCreatingEs ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        作成中...
                      </>
                    ) : (
                      "作成"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {localEsDocs.length === 0 ? (
            <Card><CardContent className="py-8"><p className="text-center text-muted-foreground">まだ文書がありません</p></CardContent></Card>
          ) : (
            <div className="space-y-4">
              {localEsDocs.map((doc) => (
                <Card
                  key={doc.id}
                  className={cn(
                    "overflow-hidden transition-all duration-200 border",
                    editEsDoc?.id === doc.id
                      ? "ring-1 ring-primary/30 border-primary/30 shadow-md bg-accent/5"
                      : "hover:shadow-md hover:border-primary/20",
                    editEsDoc?.id !== doc.id && "cursor-pointer"
                  )}
                  onClick={(e) => {
                    toggleEsExpand(doc.id, e);
                  }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1 flex-1">
                        {editEsDoc?.id === doc.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              className="text-base font-semibold h-8 flex-1"
                              value={editEsDoc.title}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => setEditEsDoc({ ...editEsDoc, title: e.target.value })}
                            />
                            <Select
                              value={editEsDoc.status || "未提出"}
                              onValueChange={(val: any) => setEditEsDoc({ ...editEsDoc, status: val })}
                            >
                              <SelectTrigger className="w-[110px] h-8 text-xs font-medium" onClick={(e) => e.stopPropagation()}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="未提出">未提出</SelectItem>
                                <SelectItem value="提出済">提出済</SelectItem>
                                <SelectItem value="結果待ち">結果待ち</SelectItem>
                                <SelectItem value="通過">通過</SelectItem>
                                <SelectItem value="落選">落選</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{doc.title}</CardTitle>
                            {doc.status && (
                              <Badge variant="outline" className={cn(
                                "text-[10px] px-2 py-0",
                                doc.status === "通過" && "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400",
                                doc.status === "落選" && "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400",
                                doc.status === "結果待ち" && "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400",
                                doc.status === "提出済" && "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                              )}>
                                {doc.status}
                              </Badge>
                            )}
                          </div>
                        )}
                        <CardDescription className="flex flex-col gap-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>更新: {new Date(doc.updatedAt).toLocaleString("ja-JP")}</span>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded-sm text-xs font-medium",
                              doc.characterLimit
                                ? (countCharacters(editEsDoc?.id === doc.id ? editEsDoc.content : doc.content) > doc.characterLimit ? "bg-red-100 text-red-800" : "bg-muted text-muted-foreground")
                                : "bg-muted text-muted-foreground"
                            )}>
                              {countCharacters(editEsDoc?.id === doc.id ? editEsDoc.content : doc.content)}
                              {doc.characterLimit ? ` / ${doc.characterLimit}文字${doc.characterLimitType || ""}` : "文字"}
                            </span>
                          </div>
                          {getSectionCharacterCounts(editEsDoc?.id === doc.id ? editEsDoc.content : doc.content).length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              {getSectionCharacterCounts(editEsDoc?.id === doc.id ? editEsDoc.content : doc.content).map((section, idx) => (
                                <div key={idx} className="flex items-center gap-1 text-[10px] bg-muted/50 px-1.5 py-0.5 rounded-sm border border-transparent">
                                  <span className="font-medium truncate max-w-[120px] text-muted-foreground" title={section.title}>{section.title}</span>
                                  <span className="tabular-nums text-muted-foreground font-semibold">{section.count}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                        {isSavingEs && editEsDoc?.id === doc.id && (
                          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-primary/5 border border-primary/10 mr-1">
                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Saving</span>
                          </div>
                        )}
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDuplicateEs(doc); }} className="transition-all">
                          <Copy className="mr-1 h-3 w-3" /> 複製
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-all" onClick={(e) => { e.stopPropagation(); handleDeleteEs(doc.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="ml-2 w-8 h-8 p-0" onClick={(e) => toggleEsExpand(doc.id, e)}>
                          {expandedEsIds.has(doc.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {expandedEsIds.has(doc.id) && (
                    <CardContent className="pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                      {doc.content || editEsDoc?.id === doc.id ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs whitespace-nowrap">字数指定:</Label>
                            <Input
                              type="number"
                              className="h-8 text-xs w-20"
                              value={(editEsDoc?.id === doc.id ? editEsDoc.characterLimit : doc.characterLimit) || ""}
                              onChange={(e) => {
                                const esDoc = editEsDoc?.id === doc.id ? editEsDoc : doc;
                                setEditEsDoc({ ...esDoc, characterLimit: e.target.value ? parseInt(e.target.value) : undefined });
                              }}
                              placeholder="制限なし"
                            />
                            <Select
                              value={(editEsDoc?.id === doc.id ? editEsDoc.characterLimitType : doc.characterLimitType) || ""}
                              onValueChange={(val: any) => {
                                const esDoc = editEsDoc?.id === doc.id ? editEsDoc : doc;
                                setEditEsDoc({ ...esDoc, characterLimitType: val === " " ? "" : val });
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs w-24 transition-all duration-200 hover:shadow-md cursor-pointer">
                                <SelectValue placeholder="種別" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value=" ">指定なし</SelectItem>
                                <SelectItem value="程度">程度</SelectItem>
                                <SelectItem value="以下">以下</SelectItem>
                                <SelectItem value="未満">未満</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <NotionEditor
                            content={editEsDoc?.id === doc.id ? editEsDoc.content : doc.content}
                            onChange={(val) => {
                              const esDoc = editEsDoc?.id === doc.id ? editEsDoc : doc;
                              setEditEsDoc({ ...esDoc, content: val });
                            }}
                          />

                          {/* Section Character Counts */}
                          <div className="mt-4 pt-4 border-t border-dashed">
                            <h4 className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-widest">セクション別文字数</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {getSectionCharacterCounts(editEsDoc?.id === doc.id ? editEsDoc.content : doc.content).map((section, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 rounded-md bg-muted/30 text-xs border border-transparent hover:border-muted-foreground/20 transition-all">
                                  <span className="font-medium truncate mr-2" title={section.title}>{section.title}</span>
                                  <span className="font-bold tabular-nums whitespace-nowrap">{section.count} 文字</span>
                                </div>
                              ))}
                              {getSectionCharacterCounts(editEsDoc?.id === doc.id ? editEsDoc.content : doc.content).length === 0 && (
                                <p className="text-[10px] text-muted-foreground italic col-span-2">
                                  * 見出し1〜3を追加すると、セクションごとの文字数がここに表示されます。
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground italic py-4">
                          本文がありません
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Interviews Tab */}
        <TabsContent value="interviews" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold">面接記録</h3>
            <Dialog open={newInterviewOpen} onOpenChange={setNewInterviewOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="transition-all"><Plus className="mr-2 h-4 w-4" /> 面接を追加</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>面接記録を追加</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>面接タイプ *</Label>
                    <Input value={newInterview.type} onChange={(e) => setNewInterview({ ...newInterview, type: e.target.value })} placeholder="1次面接" />
                  </div>
                  <div>
                    <Label>日時 *</Label>
                    <DateTimePicker
                      date={newInterview.date ? new Date(newInterview.date) : undefined}
                      onChange={(d) => setNewInterview({ ...newInterview, date: d ? d.toISOString() : "" })}
                    />
                  </div>
                  <div>
                    <Label>場所</Label>
                    <Input value={newInterview.location} onChange={(e) => setNewInterview({ ...newInterview, location: e.target.value })} placeholder="オンライン / 本社" />
                  </div>
                  <div>
                    <Label>ステータス</Label>
                    <Select
                      value={newInterview.result}
                      onValueChange={(value) =>
                        setNewInterview({ ...newInterview, result: value })
                      }
                    >
                      <SelectTrigger className={cn(statusColors[newInterview.result] || "bg-gray-100 text-gray-800", "transition-all duration-200 hover:shadow-md cursor-pointer")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(config?.interviewStatuses || ["結果待ち", "通過", "不合格"]).map(status => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>メモ</Label>
                    <Textarea value={newInterview.memo} onChange={(e) => setNewInterview({ ...newInterview, memo: e.target.value })} placeholder="聞かれたこと、感想など" />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreateInterview}
                    disabled={isCreatingInterview}
                    className="transition-transform active:scale-95"
                  >
                    {isCreatingInterview ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        追加中...
                      </>
                    ) : (
                      "追加"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {localInterviews.length === 0 ? (
            <Card><CardContent className="py-8"><p className="text-center text-muted-foreground">まだ面接記録がありません</p></CardContent></Card>
          ) : (
            <div className="space-y-4">
              {localInterviews.sort((a, b) => b.date.localeCompare(a.date)).map((interview) => (
                <Card
                  key={interview.id}
                  className={cn(
                    "overflow-hidden transition-all duration-200 border",
                    editingInterview?.id === interview.id
                      ? "ring-1 ring-primary/30 border-primary/30 shadow-md bg-accent/5"
                      : "hover:shadow-md hover:border-primary/20",
                    editingInterview?.id !== interview.id && "cursor-pointer"
                  )}
                  onClick={(e) => {
                    toggleInterviewExpand(interview.id, e);
                  }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        {editingInterview?.id === interview.id ? (
                          <Input
                            className="text-base font-semibold h-8 flex-1"
                            value={editingInterview.type}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditingInterview({ ...editingInterview, type: e.target.value })}
                          />
                        ) : (
                          <CardTitle className="text-base">{interview.type}</CardTitle>
                        )}
                        <StatusBadge status={interview.result} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span className="text-sm text-muted-foreground mr-2">{formatDate(interview.date)}</span>
                        <Button variant="outline" size="sm" onClick={(e) => { toggleInterviewExpand(interview.id, e); }} className="transition-all">
                          <Edit className="mr-1 h-3 w-3" /> {expandedInterviewIds.has(interview.id) ? "完了" : "編集"}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-all font-bold" onClick={(e) => { e.stopPropagation(); handleDeleteInterview(interview.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="ml-2 w-8 h-8 p-0" onClick={(e) => toggleInterviewExpand(interview.id, e)}>
                          {expandedInterviewIds.has(interview.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    {interview.location && !expandedInterviewIds.has(interview.id) && (
                      <CardDescription>📍 {interview.location}</CardDescription>
                    )}
                  </CardHeader>

                  {expandedInterviewIds.has(interview.id) && (
                    <CardContent className="pt-2 border-t space-y-4" onClick={(e) => e.stopPropagation()}>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-2">

                        <div>
                          <Label className="text-xs">日時</Label>
                          <DateTimePicker
                            date={new Date((editingInterview?.id === interview.id ? editingInterview.date : interview.date) || "")}
                            onChange={(d) => {
                              const target = editingInterview?.id === interview.id ? editingInterview : interview;
                              setEditingInterview({ ...target, date: d ? d.toISOString() : "" });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">場所</Label>
                          <Input
                            value={editingInterview?.id === interview.id ? editingInterview.location : interview.location}
                            onChange={(e) => {
                              const target = editingInterview?.id === interview.id ? editingInterview : interview;
                              setEditingInterview({ ...target, location: e.target.value });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">ステータス</Label>
                          <Select
                            value={editingInterview?.id === interview.id ? editingInterview.result : interview.result}
                            onValueChange={(value) => {
                              const target = editingInterview?.id === interview.id ? editingInterview : interview;
                              setEditingInterview({ ...target, result: value });
                            }}
                          >
                            <SelectTrigger className={cn(statusColors[editingInterview?.id === interview.id ? editingInterview.result : interview.result] || "bg-gray-100 text-gray-800", "transition-all duration-200 hover:shadow-md cursor-pointer")}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(config?.interviewStatuses || ["結果待ち", "通過", "不合格"]).map(status => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="min-h-[150px]">
                        <Label className="text-xs">メモ</Label>
                        <NotionEditor
                          content={editingInterview?.id === interview.id ? editingInterview.memo : interview.memo}
                          onChange={(val) => {
                            const target = editingInterview?.id === interview.id ? editingInterview : interview;
                            setEditingInterview({ ...target, memo: val });
                          }}
                        />
                      </div>
                      <div className="flex justify-end items-center gap-3">
                        {isSavingInterview && editingInterview?.id === interview.id && (
                          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-primary/5 border border-primary/10">
                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Saving</span>
                          </div>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => toggleInterviewExpand(interview.id)} className="transition-all">
                          閉じる
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold">タスク</h3>
            <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="transition-all"><Plus className="mr-2 h-4 w-4" /> タスク追加</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>タスクを追加</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>タイトル *</Label>
                    <Input value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} placeholder="ES提出" />
                  </div>
                  <div>
                    <Label>カテゴリ</Label>
                    <Select value={newTask.category} onValueChange={(v) => setNewTask({ ...newTask, category: v })}>
                      <SelectTrigger className="transition-all duration-200 hover:shadow-md cursor-pointer"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(config?.taskCategories || []).map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>実施日</Label>
                    <DatePicker
                      date={newTask.executionDate ? new Date(newTask.executionDate) : undefined}
                      onChange={(d) => setNewTask((prev) => ({ ...prev, executionDate: d ? format(d, "yyyy-MM-dd") : "" }))}
                    />
                  </div>
                  <div>
                    <Label>締切</Label>
                    <DateTimePicker
                      date={newTask.deadline ? new Date(newTask.deadline) : undefined}
                      onChange={(d) => setNewTask((prev) => ({ ...prev, deadline: d ? d.toISOString() : "" }))}
                    />
                  </div>
                  <div>
                    <Label>メモ</Label>
                    <Textarea value={newTask.memo} onChange={(e) => setNewTask({ ...newTask, memo: e.target.value })} />
                  </div>
                  <div className="space-y-2 pt-2">
                    <Label>ステータス</Label>
                    <Select value={newTask.status} onValueChange={(v: any) => setNewTask({ ...newTask, status: v })}>
                      <SelectTrigger className={cn(statusColors[newTask.status], "transition-all duration-200 hover:shadow-md cursor-pointer")}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="未着手">未着手</SelectItem>
                        <SelectItem value="進行中">進行中</SelectItem>
                        <SelectItem value="完了">完了</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreateTask}
                    disabled={isCreatingTask}
                    className="transition-transform active:scale-95"
                  >
                    {isCreatingTask ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        追加中...
                      </>
                    ) : (
                      "追加"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {localTasks.length === 0 ? (
            <Card><CardContent className="py-8"><p className="text-center text-muted-foreground">まだタスクがありません</p></CardContent></Card>
          ) : (
            <div className="space-y-2">
              {localTasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center transition-all duration-200",
                    editingTask?.id === task.id
                      ? "ring-1 ring-primary/30 border-primary/30 shadow-md bg-accent/5"
                      : "hover:shadow-md hover:border-primary/20 cursor-pointer"
                  )}
                  onClick={() => {
                    if (editingTask?.id !== task.id) {
                      setEditingTask(task);
                    }
                  }}
                >
                  {editingTask?.id === task.id ? (
                    <div className="flex-1 space-y-3" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={editingTask.title}
                        onChange={(e) =>
                          setEditingTask({ ...editingTask, title: e.target.value })
                        }
                        placeholder="タイトル"
                      />
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                        <Select
                          value={editingTask.category}
                          onValueChange={(value) =>
                            setEditingTask({ ...editingTask, category: value })
                          }
                        >
                          <SelectTrigger className="transition-all duration-200 hover:shadow-md cursor-pointer">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(config?.taskCategories || []).map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <DatePicker
                          date={editingTask.executionDate ? new Date(editingTask.executionDate) : undefined}
                          onChange={(d) =>
                            setEditingTask((prev) =>
                              prev
                                ? {
                                  ...prev,
                                  executionDate: d ? format(d, "yyyy-MM-dd") : "",
                                }
                                : prev
                            )
                          }
                        />
                        <DateTimePicker
                          date={editingTask.deadline ? new Date(editingTask.deadline) : undefined}
                          onChange={(d) =>
                            setEditingTask((prev) =>
                              prev
                                ? {
                                  ...prev,
                                  deadline: d ? d.toISOString() : "",
                                }
                                : prev
                            )
                          }
                        />
                      </div>
                      <div className="min-h-[150px]">
                        <NotionEditor
                          content={editingTask.memo || ""}
                          onChange={(val) =>
                            setEditingTask({ ...editingTask, memo: val })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="w-32">
                          <Select
                            value={editingTask.status}
                            onValueChange={(v: any) =>
                              setEditingTask({
                                ...editingTask,
                                status: v,
                              })
                            }
                          >
                            <SelectTrigger className={cn("h-9 transition-all duration-200 hover:shadow-md cursor-pointer", statusColors[editingTask.status])}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="未着手">未着手</SelectItem>
                              <SelectItem value="進行中">進行中</SelectItem>
                              <SelectItem value="完了">完了</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2 items-center">
                          {isSavingTask && (
                            <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-primary/5 border border-primary/10">
                              <Loader2 className="h-3 w-3 animate-spin text-primary" />
                              <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Saving</span>
                            </div>
                          )}
                          <Button variant="outline" size="sm" onClick={() => setEditingTask(null)} className="transition-all">
                            完了
                          </Button>
                          <Button size="sm" onClick={() => handleSaveTask()} className="transition-all">保存</Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-24" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={task.status}
                          onValueChange={(v: any) => handleStatusChangeTask(task, v)}
                        >
                          <SelectTrigger className={cn("h-8 text-xs transition-all duration-200 hover:shadow-md cursor-pointer", statusColors[task.status])}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="未着手">未着手</SelectItem>
                            <SelectItem value="進行中">進行中</SelectItem>
                            <SelectItem value="完了">完了</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${task.status === "完了" ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                        {task.memo && <p className="text-xs text-muted-foreground">{getPlainText(task.memo)}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{task.category}</Badge>
                        {task.executionDate && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground border rounded-full px-2 py-0.5 bg-background">
                            <span className="font-medium text-[10px] uppercase text-slate-400">実施</span>
                            <span>{formatDate(task.executionDate)}</span>
                          </div>
                        )}
                        {task.deadline && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground border rounded-full px-2 py-0.5 bg-background">
                            <span className="font-medium text-[10px] uppercase text-rose-400">締切</span>
                            <span>{formatDate(task.deadline)}</span>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTask(task);
                          }}
                        >
                          <Edit className="mr-1 h-3 w-3" /> 編集
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTask(task.id);
                          }}
                        >
                          <Trash2 className="mr-1 h-3 w-3" /> 削除
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Memo Tab */}
        <TabsContent value="memo" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold">企業研究メモ</h3>
            <div className="flex items-center gap-3">
              {isSavingMemo && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Saving</span>
                </div>
              )}
              <Button size="sm" onClick={() => handleSaveCompany()} disabled={isSavingMemo} className="transition-all">
                <Save className="mr-2 h-4 w-4" /> 保存
              </Button>
            </div>
          </div>
          <div className="min-h-[400px]">
            <NotionEditor content={memoContent} onChange={setMemoContent} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
