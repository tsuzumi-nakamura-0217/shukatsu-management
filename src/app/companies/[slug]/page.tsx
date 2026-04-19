"use client";

import { Fragment, useEffect, useState, useCallback, use, useRef, useMemo } from "react";
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
  Calendar as CalendarIcon,
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
import { StatusBadge, statusColors, taskStatusStyles } from "@/components/badges";
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
import type { Company, Task, Interview, ESDocument, AppConfig, CompanyEvent } from "@/types";

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

function normalizeStageList(stages: unknown): string[] {
  if (!Array.isArray(stages)) return [];

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const value of stages) {
    if (typeof value !== "string") continue;
    const stage = value.trim();
    if (!stage || seen.has(stage)) continue;
    seen.add(stage);
    normalized.push(stage);
  }

  return normalized;
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
  const initialTaskId = searchParams.get("taskId");
  const {
    company, tasks, interviews, esDocs, events, config,
    mutate: mutateDetail, revalidate,
  } = useCompanyDetail(slug);
  // Local state for tasks/interviews to allow optimistic updates
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [localInterviews, setLocalInterviews] = useState<Interview[]>([]);
  const [localEsDocs, setLocalEsDocs] = useState<ESDocument[]>([]);
  const [localEvents, setLocalEvents] = useState<CompanyEvent[]>([]);
  useEffect(() => { setLocalTasks(tasks); }, [tasks]);
  useEffect(() => { setLocalInterviews(interviews); }, [interviews]);
  useEffect(() => { setLocalEsDocs(esDocs); }, [esDocs]);
  useEffect(() => { setLocalEvents(events); }, [events]);
  const [editMode, setEditMode] = useState(false);
  const [memoContent, setMemoContent] = useState("");
  const [editingCompany, setEditingCompany] = useState<Partial<Company>>({});
  const [showPassword, setShowPassword] = useState(false);

  // Dialogs
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newInterviewOpen, setNewInterviewOpen] = useState(false);
  const [newEsOpen, setNewEsOpen] = useState(false);
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isCreatingInterview, setIsCreatingInterview] = useState(false);
  const [isCreatingEs, setIsCreatingEs] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [editEsDoc, setEditEsDoc] = useState<ESDocument | null>(null);
  const [expandedEsIds, setExpandedEsIds] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [editingEvent, setEditingEvent] = useState<CompanyEvent | null>(null);
  const [expandedInterviewIds, setExpandedInterviewIds] = useState<Set<string>>(new Set());
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set());
  const [isMemoExpanded, setIsMemoExpanded] = useState(true);
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const [isSavingEs, setIsSavingEs] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [isSavingInterview, setIsSavingInterview] = useState(false);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [pipelineStages, setPipelineStages] = useState<string[]>([]);
  const [newPipelineStage, setNewPipelineStage] = useState("");
  const [isSavingPipeline, setIsSavingPipeline] = useState(false);
  const [isPipelineEditorOpen, setIsPipelineEditorOpen] = useState(false);

  // New item forms
  const [newTask, setNewTask] = useState<{ title: string; category: string; executionDate: string; deadline: string; memo: string; status: "未着手" | "進行中" | "完了" }>({ title: "", category: "その他", executionDate: "", deadline: "", memo: "", status: "未着手" });
  const [newInterview, setNewInterview] = useState({ type: "", date: "", location: "", result: "結果待ち", memo: "" });
  const [newEs, setNewEs] = useState({ title: "", content: "", characterLimit: undefined as number | undefined, characterLimitType: "" as "程度" | "以下" | "未満" | "", status: "未提出" as "未提出" | "提出済" | "結果待ち" | "通過" | "落選" | "" });
  const [newEvent, setNewEvent] = useState({ title: "", type: "説明会", date: "", endDate: "", location: "", memo: "" });

  const initializedCompanyId = useRef<string | null>(null);
  const focusedTaskIdRef = useRef<string | null>(null);
  const pipelineInputComposingRef = useRef(false);
  const defaultStages = useMemo(() => normalizeStageList(config?.defaultStages), [config?.defaultStages]);
  const currentCompanyStages = useMemo(() => {
    const companyStages = normalizeStageList(company?.stages);
    return companyStages.length > 0 ? companyStages : defaultStages;
  }, [company?.stages, defaultStages]);
  const currentCompanyStagesKey = useMemo(
    () => currentCompanyStages.join("\u0001"),
    [currentCompanyStages]
  );
  const currentCompanyStagesForSync = useMemo(
    () => currentCompanyStages,
    [currentCompanyStagesKey]
  );
  const editablePipelineStages = useMemo(
    () => normalizeStageList(pipelineStages),
    [pipelineStages]
  );
  const editablePipelineStagesKey = useMemo(
    () => editablePipelineStages.join("\u0001"),
    [editablePipelineStages]
  );

  // Keep memoContent/editingCompany in sync with SWR data initially
  useEffect(() => {
    if (company && initializedCompanyId.current !== company.id) {
      setMemoContent(company.memo || "");
      setEditingCompany(company);
      initializedCompanyId.current = company.id;
    }
  }, [company]);

  useEffect(() => {
    if (!company) return;
    setPipelineStages(currentCompanyStagesForSync);
  }, [company?.id, currentCompanyStagesForSync]);

  useEffect(() => {
    if (!initialTaskId) {
      focusedTaskIdRef.current = null;
      return;
    }

    if (focusedTaskIdRef.current === initialTaskId) {
      return;
    }

    const targetTask = localTasks.find((task) => task.id === initialTaskId);
    if (!targetTask) {
      return;
    }

    setEditingTask(targetTask);
    focusedTaskIdRef.current = initialTaskId;

    requestAnimationFrame(() => {
      const element = document.getElementById(`task-${initialTaskId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [initialTaskId, localTasks]);

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
    if (!company) return;

    const previousStatus = company.status;

    // 楽観的アップデートを行い、AutoSaveによる巻き戻りを防ぐ
    setEditingCompany(prev => ({ ...prev, status }));
    mutateDetail(
      (current) => current ? { ...current, company: { ...current.company, status } as Company } : current,
      { revalidate: false }
    );

    try {
      const res = await fetch(`/api/companies/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await res.json().catch(() => null);

      if (res.ok) {
        toast.success("ステータスを更新しました");
        revalidate();
        return;
      }

      setEditingCompany(prev => ({ ...prev, status: previousStatus }));
      mutateDetail(
        (current) => current ? { ...current, company: { ...current.company, status: previousStatus } as Company } : current,
        { revalidate: false }
      );
      toast.error(payload?.error || "ステータスの更新に失敗しました");
    } catch {
      setEditingCompany(prev => ({ ...prev, status: previousStatus }));
      mutateDetail(
        (current) => current ? { ...current, company: { ...current.company, status: previousStatus } as Company } : current,
        { revalidate: false }
      );
      toast.error("ステータスの更新に失敗しました");
    }
  };

  const handleAddPipelineStage = () => {
    const stage = newPipelineStage.trim();
    if (!stage) return;

    setPipelineStages((prev) => {
      const normalized = normalizeStageList(prev);
      if (normalized.includes(stage)) {
        toast.error("同じステージが既に存在します");
        return normalized;
      }
      return [...normalized, stage];
    });
    setNewPipelineStage("");
  };

  const handleMovePipelineStage = (index: number, direction: -1 | 1) => {
    setPipelineStages((prev) => {
      const normalized = normalizeStageList(prev);
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= normalized.length) {
        return normalized;
      }

      const next = [...normalized];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const handleRemovePipelineStage = (index: number) => {
    setPipelineStages((prev) => {
      const normalized = normalizeStageList(prev);
      return normalized.filter((_, currentIndex) => currentIndex !== index);
    });
  };

  const handleSavePipelineStages = async () => {
    if (!company || isSavingPipeline) return;

    const normalized = normalizeStageList(pipelineStages);
    if (normalized.length === 0) {
      toast.error("選考パイプラインを1件以上設定してください");
      return;
    }

    setIsSavingPipeline(true);
    try {
      const res = await fetch(`/api/companies/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stages: normalized }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(payload?.error || "選考パイプラインの保存に失敗しました");
        return;
      }

      const savedStages = normalizeStageList(payload?.stages);
      const nextStages = savedStages.length > 0 ? savedStages : normalized;

      setPipelineStages(nextStages);
      setEditingCompany((prev) => ({ ...prev, stages: nextStages }));
      mutateDetail(
        (current) =>
          current
            ? { ...current, company: { ...current.company, stages: nextStages } as Company }
            : current,
        { revalidate: false }
      );
      toast.success("選考パイプラインを保存しました");
      revalidate();
    } catch {
      toast.error("選考パイプラインの保存に失敗しました");
    } finally {
      setIsSavingPipeline(false);
    }
  };

  const handleMypageClick = async () => {
    if (!company) return;
    
    const loginId = company.loginId || "";
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(loginId);
        if (loginId) {
          toast.success("ログインIDをコピーしました");
        }
      }
    } catch (err) {
      console.error("Failed to copy login ID:", err);
    }
    
    if (company.mypageUrl) {
      window.open(company.mypageUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleCopyExamId = async () => {
    if (!company?.examId) return;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(company.examId);
        toast.success("受験IDをコピーしました");
      } else {
        toast.error("この接続環境ではクリップボードへのコピーが制限されています（HTTPSまたはlocalhostが必要です）");
      }
    } catch (err) {
      console.error("Failed to copy exam ID:", err);
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

  const handleSaveTask = async (taskToSave?: Task): Promise<boolean> => {
    const target = taskToSave || editingTask;
    if (!target || isSavingTask) return false;
    setIsSavingTask(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target),
      });
      if (!res.ok) {
        throw new Error("Failed to save task");
      }
      if (!taskToSave) {
        // toast.success("タスクを更新しました");
        // setEditingTask(null);
      }
      revalidate();
      return true;
    } catch {
      toast.error("タスクの保存に失敗しました");
      return false;
    } finally {
      setIsSavingTask(false);
    }
  };

  const originalEditingTask = editingTask ? localTasks.find((t) => t.id === editingTask.id) : undefined;
  const hasEditingTaskChanges = hasTaskChanges(editingTask, originalEditingTask);

  useAutoSave({
    enabled: !!editingTask,
    hasChanges: hasTaskChanges(editingTask, originalEditingTask),
    onSave: async () => {
      await handleSaveTask();
    },
    delay: 1500,
    deps: [editingTask, originalEditingTask],
  });

  const handleDeleteTask = async (id: string) => {
    if (!confirm("このタスクを削除しますか？")) return;
    try {
      const res = await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        throw new Error("Failed to delete task");
      }
      toast.success("タスクを削除しました");
      revalidate();
    } catch {
      toast.error("タスクの削除に失敗しました");
    }
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

  const handleCreateEvent = async () => {
    if (isCreatingEvent) return;
    setIsCreatingEvent(true);
    try {
      const res = await fetch(`/api/companies/${slug}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEvent),
      });
      if (res.ok) {
        toast.success("イベントを追加しました");
        setNewEventOpen(false);
        setNewEvent({ title: "", type: "説明会", date: "", endDate: "", location: "", memo: "" });
        revalidate();
      }
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleSaveEvent = async (eventToSave?: CompanyEvent) => {
    const target = eventToSave || editingEvent;
    if (!target || isSavingEvent) return;
    setIsSavingEvent(true);
    try {
      await fetch(`/api/companies/${slug}/events/${target.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target),
      });
      revalidate();
    } finally {
      setIsSavingEvent(false);
    }
  };

  useAutoSave({
    enabled: !!editingEvent,
    hasChanges: !!editingEvent && JSON.stringify(editingEvent) !== JSON.stringify(localEvents.find(e => e.id === editingEvent.id)),
    onSave: () => handleSaveEvent(),
    delay: 1500,
    deps: [editingEvent],
  });

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("このイベントを削除しますか？")) return;
    const res = await fetch(`/api/companies/${slug}/events/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("イベントを削除しました");
      if (editingEvent?.id === id) setEditingEvent(null);
      revalidate();
    }
  };

  const toggleEventExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedEventIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (editingEvent?.id === id) setEditingEvent(null);
      } else {
        next.add(id);
        const ev = localEvents.find(event => event.id === id);
        if (ev) setEditingEvent(ev);
      }
      return next;
    });
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

  const stages = currentCompanyStages;
  const currentStageIndex = stages.indexOf(company.status);
  const hasPipelineChanges = editablePipelineStagesKey !== currentCompanyStagesKey;

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
            <Button variant="outline" size="sm" onClick={handleMypageClick} className="h-8 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> マイページ
            </Button>
          )}
          {company.examId && (
            <Button variant="outline" size="sm" onClick={handleCopyExamId} className="h-8 border-amber-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300">
              <Copy className="mr-1.5 h-3.5 w-3.5" /> 受験IDコピー
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
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold">選考パイプライン</CardTitle>
            <div className="flex items-center gap-1.5">
              {hasPipelineChanges && (
                <span className="text-[10px] font-medium text-amber-600">未保存</span>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[10px]"
                onClick={() => setIsPipelineEditorOpen((prev) => !prev)}
              >
                {isPipelineEditorOpen ? "閉じる" : "編集"}
                <ChevronDown
                  className={cn(
                    "ml-1 h-3 w-3 transition-transform",
                    isPipelineEditorOpen && "rotate-180"
                  )}
                />
              </Button>
            </div>
          </div>
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

          {isPipelineEditorOpen && (
            <div className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={handleSavePipelineStages}
                    disabled={isSavingPipeline || editablePipelineStages.length === 0 || !hasPipelineChanges}
                  >
                    {isSavingPipeline ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                    保存
                  </Button>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={newPipelineStage}
                    onChange={(e) => setNewPipelineStage(e.target.value)}
                    placeholder="ステージを追加"
                    className="h-8 text-xs"
                    onCompositionStart={() => {
                      pipelineInputComposingRef.current = true;
                    }}
                    onCompositionEnd={() => {
                      pipelineInputComposingRef.current = false;
                    }}
                    onKeyDown={(e) => {
                      const isImeComposing =
                        pipelineInputComposingRef.current ||
                        e.nativeEvent.isComposing ||
                        e.keyCode === 229;
                      if (isImeComposing) {
                        return;
                      }

                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddPipelineStage();
                      }
                    }}
                  />
                  <Button size="sm" variant="secondary" className="h-8 px-3 text-xs" onClick={handleAddPipelineStage}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> 追加
                  </Button>
                </div>

                <div className="space-y-1">
                  {editablePipelineStages.length === 0 ? (
                    <p className="text-xs text-destructive">ステージを1件以上設定してください</p>
                  ) : (
                    editablePipelineStages.map((stage, index) => (
                      <div key={`${stage}-${index}`} className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background/70 px-2 py-1.5">
                        <span className="text-xs font-medium truncate">{index + 1}. {stage}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMovePipelineStage(index, -1)}
                            disabled={index === 0 || isSavingPipeline}
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMovePipelineStage(index, 1)}
                            disabled={index === editablePipelineStages.length - 1 || isSavingPipeline}
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => handleRemovePipelineStage(index)}
                            disabled={isSavingPipeline || editablePipelineStages.length <= 1}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <p className="text-[10px] text-muted-foreground">現在ステータスを含まない構成は保存できません。</p>
            </div>
          )}

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
                <Label>受験ID</Label>
                <Input
                  value={editingCompany.examId || ""}
                  onChange={(e) =>
                    setEditingCompany({
                      ...editingCompany,
                      examId: e.target.value,
                    })
                  }
                  placeholder="Webテスト用受験ID"
                />
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
          <TabsTrigger value="events" className="gap-2 cursor-pointer hover:bg-muted/80 hover:text-foreground transition-all">
            <CalendarIcon className="h-4 w-4" /> イベント
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
            <div className="rounded-lg border border-border/70 bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-220 text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/40 backdrop-blur">
                    <tr className="border-b border-border/50 text-left">
                      <th className="px-4 py-2 text-xs font-bold text-muted-foreground">タイトル</th>
                      <th className="px-4 py-2 text-xs font-bold text-muted-foreground">ステータス</th>
                      <th className="px-4 py-2 text-xs font-bold text-muted-foreground">更新日時</th>
                      <th className="px-4 py-2 text-xs font-bold text-muted-foreground">文字数</th>
                      <th className="px-4 py-2 text-xs font-bold text-muted-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localEsDocs.map((doc) => {
                      const isExpanded = expandedEsIds.has(doc.id);
                      const draftDoc = editEsDoc?.id === doc.id ? editEsDoc : doc;
                      const draftContent = draftDoc.content || "";
                      const charCount = countCharacters(draftContent);
                      const sectionCounts = getSectionCharacterCounts(draftContent);
                      const overLimit = !!doc.characterLimit && charCount > doc.characterLimit;

                      return (
                        <Fragment key={doc.id}>
                          <tr
                            className={cn(
                              "border-b border-border/40 transition-colors",
                              isExpanded
                                ? "bg-primary/5"
                                : "cursor-pointer hover:bg-muted/50"
                            )}
                            onClick={(e) => toggleEsExpand(doc.id, e)}
                          >
                            <td className="px-4 py-2 align-middle">
                              <p className="font-medium">{draftDoc.title || "無題の文書"}</p>
                              {draftContent && (
                                <p className="mt-1 max-w-140 truncate text-xs text-muted-foreground">{getPlainText(draftContent)}</p>
                              )}
                            </td>
                            <td className="px-4 py-2 align-middle">
                              {draftDoc.status && (
                                <Badge variant="outline" className={cn(
                                  "text-[10px] px-2 py-0",
                                  draftDoc.status === "通過" && "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400",
                                  draftDoc.status === "落選" && "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400",
                                  draftDoc.status === "結果待ち" && "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400",
                                  draftDoc.status === "提出済" && "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
                                  draftDoc.status === "未提出" && "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300"
                                )}>
                                  {draftDoc.status}
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-2 align-middle text-xs text-muted-foreground">
                              {new Date(doc.updatedAt).toLocaleString("ja-JP")}
                            </td>
                            <td className="px-4 py-2 align-middle text-xs">
                              <span className={cn(
                                "inline-flex rounded-md px-2 py-1 font-semibold",
                                overLimit
                                  ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                                  : "bg-muted text-muted-foreground"
                              )}>
                                {charCount}
                                {doc.characterLimit ? ` / ${doc.characterLimit}文字${doc.characterLimitType || ""}` : "文字"}
                              </span>
                            </td>
                            <td className="px-4 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg hover:bg-primary/10"
                                  onClick={() => handleDuplicateEs(doc)}
                                  title="複製"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteEs(doc.id)}
                                  title="削除"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg"
                                  onClick={(e) => toggleEsExpand(doc.id, e)}
                                  title={isExpanded ? "閉じる" : "編集"}
                                >
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="border-b border-border/40 bg-background/70">
                              <td colSpan={5} className="p-4" onClick={(e) => e.stopPropagation()}>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                                    <Input
                                      className="md:col-span-2"
                                      value={draftDoc.title}
                                      onChange={(e) => setEditEsDoc({ ...draftDoc, title: e.target.value })}
                                      placeholder="タイトル"
                                    />
                                    <Select
                                      value={draftDoc.status || "未提出"}
                                      onValueChange={(val: any) => setEditEsDoc({ ...draftDoc, status: val })}
                                    >
                                      <SelectTrigger className="md:col-span-2 transition-all duration-200 hover:shadow-md cursor-pointer">
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
                                    <Input
                                      type="number"
                                      className="md:col-span-1"
                                      value={draftDoc.characterLimit || ""}
                                      onChange={(e) => setEditEsDoc({ ...draftDoc, characterLimit: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                                      placeholder="字数"
                                    />
                                    <Select
                                      value={draftDoc.characterLimitType || ""}
                                      onValueChange={(val: any) => setEditEsDoc({ ...draftDoc, characterLimitType: val === " " ? "" : val })}
                                    >
                                      <SelectTrigger className="md:col-span-1 transition-all duration-200 hover:shadow-md cursor-pointer">
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
                                    content={draftContent}
                                    onChange={(val) => setEditEsDoc({ ...draftDoc, content: val })}
                                  />

                                  <div className="mt-4 pt-4 border-t border-dashed">
                                    <h4 className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-widest">セクション別文字数</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {sectionCounts.map((section, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-2 rounded-md bg-muted/30 text-xs border border-transparent hover:border-muted-foreground/20 transition-all">
                                          <span className="font-medium truncate mr-2" title={section.title}>{section.title}</span>
                                          <span className="font-bold tabular-nums whitespace-nowrap">{section.count} 文字</span>
                                        </div>
                                      ))}
                                      {sectionCounts.length === 0 && (
                                        <p className="text-[10px] text-muted-foreground italic col-span-2">
                                          * 見出し1〜3を追加すると、セクションごとの文字数がここに表示されます。
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex justify-end items-center gap-3">
                                    {isSavingEs && editEsDoc?.id === doc.id && (
                                      <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-primary/5 border border-primary/10">
                                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                        <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Saving</span>
                                      </div>
                                    )}
                                    <Button variant="ghost" size="sm" onClick={() => toggleEsExpand(doc.id)} className="transition-all">
                                      閉じる
                                    </Button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
            <div className="rounded-lg border border-border/70 bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-210 text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/40 backdrop-blur">
                    <tr className="border-b border-border/50 text-left">
                      <th className="px-4 py-2 text-xs font-bold text-muted-foreground">ステータス</th>
                      <th className="px-4 py-2 text-xs font-bold text-muted-foreground">面接タイプ</th>
                      <th className="px-4 py-2 text-xs font-bold text-muted-foreground">日時</th>
                      <th className="px-4 py-2 text-xs font-bold text-muted-foreground">場所</th>
                      <th className="px-4 py-2 text-xs font-bold text-muted-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...localInterviews].sort((a, b) => b.date.localeCompare(a.date)).map((interview) => {
                      const isExpanded = expandedInterviewIds.has(interview.id);
                      const draftInterview = editingInterview?.id === interview.id ? editingInterview : interview;

                      return (
                        <Fragment key={interview.id}>
                          <tr
                            className={cn(
                              "border-b border-border/40 transition-colors",
                              isExpanded
                                ? "bg-primary/5"
                                : "cursor-pointer hover:bg-muted/50"
                            )}
                            onClick={(e) => toggleInterviewExpand(interview.id, e)}
                          >
                            <td className="px-4 py-2 align-middle">
                              <StatusBadge status={draftInterview.result} />
                            </td>
                            <td className="px-4 py-2 align-middle">
                              <p className="font-medium">{draftInterview.type}</p>
                              {draftInterview.memo && (
                                <p className="mt-1 max-w-120 truncate text-xs text-muted-foreground">{getPlainText(draftInterview.memo)}</p>
                              )}
                            </td>
                            <td className="px-4 py-2 align-middle text-xs">
                              {draftInterview.date ? formatDate(draftInterview.date) : "-"}
                            </td>
                            <td className="px-4 py-2 align-middle text-xs text-muted-foreground">
                              {draftInterview.location || "-"}
                            </td>
                            <td className="px-4 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg hover:bg-primary/10"
                                  onClick={(e) => toggleInterviewExpand(interview.id, e)}
                                  title={isExpanded ? "閉じる" : "編集"}
                                >
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteInterview(interview.id)}
                                  title="削除"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="border-b border-border/40 bg-background/70">
                              <td colSpan={5} className="p-4" onClick={(e) => e.stopPropagation()}>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mt-2">
                                    <div>
                                      <Label className="text-xs">面接タイプ</Label>
                                      <Input
                                        value={draftInterview.type}
                                        onChange={(e) => setEditingInterview({ ...draftInterview, type: e.target.value })}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">日時</Label>
                                      <DateTimePicker
                                        date={draftInterview.date ? new Date(draftInterview.date) : undefined}
                                        onChange={(d) => setEditingInterview({ ...draftInterview, date: d ? d.toISOString() : "" })}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">場所</Label>
                                      <Input
                                        value={draftInterview.location || ""}
                                        onChange={(e) => setEditingInterview({ ...draftInterview, location: e.target.value })}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">ステータス</Label>
                                      <Select
                                        value={draftInterview.result}
                                        onValueChange={(value) => setEditingInterview({ ...draftInterview, result: value })}
                                      >
                                        <SelectTrigger className={cn(statusColors[draftInterview.result] || "bg-gray-100 text-gray-800", "transition-all duration-200 hover:shadow-md cursor-pointer")}>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {(config?.interviewStatuses || ["結果待ち", "通過", "不合格"]).map((status) => (
                                            <SelectItem key={status} value={status}>{status}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <div className="min-h-37.5">
                                    <Label className="text-xs">メモ</Label>
                                    <NotionEditor
                                      content={draftInterview.memo || ""}
                                      onChange={(val) => setEditingInterview({ ...draftInterview, memo: val })}
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
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
                      placeholder="実施日を選択"
                      date={newTask.executionDate ? new Date(newTask.executionDate) : undefined}
                      onChange={(d) => setNewTask((prev) => ({ ...prev, executionDate: d ? format(d, "yyyy-MM-dd") : "" }))}
                    />
                  </div>
                  <div>
                    <Label>締切日時</Label>
                    <DateTimePicker
                      placeholder="締切日時を選択"
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
                      <SelectTrigger className={cn(taskStatusStyles[newTask.status], "border transition-all duration-200 hover:shadow-md cursor-pointer")}><SelectValue /></SelectTrigger>
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
            <div className="rounded-lg border border-border/70 bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-215 text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/40 backdrop-blur">
                    <tr className="border-b border-border/50 text-left">
                      <th className="px-4 py-2 text-xs font-bold text-muted-foreground">ステータス</th>
                      <th className="px-4 py-2 text-xs font-bold text-muted-foreground">タスク</th>
                      <th className="px-4 py-2 text-xs font-bold text-muted-foreground">カテゴリ</th>
                      <th className="px-4 py-2 text-xs font-bold text-muted-foreground">実施日</th>
                      <th className="px-4 py-2 text-xs font-bold text-muted-foreground">期限日</th>
                      <th className="px-4 py-2 text-xs font-bold text-muted-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localTasks.map((task) => (
                      <Fragment key={task.id}>
                        <tr
                          id={`task-${task.id}`}
                          className={cn(
                            "border-b border-border/40 transition-colors",
                            editingTask?.id === task.id
                              ? "bg-primary/5"
                              : "cursor-pointer hover:bg-muted/50"
                          )}
                          onClick={() => {
                            if (editingTask?.id !== task.id) {
                              setEditingTask(task);
                            }
                          }}
                        >
                          <td className="px-4 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={task.status}
                              onValueChange={(v: any) => handleStatusChangeTask(task, v)}
                            >
                              <SelectTrigger className={cn("h-8 w-32 border text-xs font-bold shadow-none", taskStatusStyles[task.status])}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="未着手">未着手</SelectItem>
                                <SelectItem value="進行中">進行中</SelectItem>
                                <SelectItem value="完了">完了</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-2 align-middle">
                            <p className={cn("font-medium", task.status === "完了" && "line-through text-muted-foreground")}>
                              {task.title}
                            </p>
                            {task.memo && (
                              <p className="mt-1 max-w-105 truncate text-xs text-muted-foreground">{getPlainText(task.memo)}</p>
                            )}
                          </td>
                          <td className="px-4 py-2 align-middle">
                            <Badge variant="outline" className="text-xs">{task.category}</Badge>
                          </td>
                          <td className="px-4 py-2 align-middle text-xs">
                            {task.executionDate ? (
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 font-semibold text-foreground dark:bg-slate-800">
                                {formatDate(task.executionDate)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2 align-middle text-xs">
                            {task.deadline ? (
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-md border px-2 py-1 font-semibold",
                                  new Date(task.deadline) < new Date() && task.status !== "完了"
                                    ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-950/20"
                                    : "border-transparent bg-slate-100 text-foreground dark:bg-slate-800"
                                )}
                              >
                                {formatDate(task.deadline)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-primary/10"
                                onClick={() => setEditingTask(task)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteTask(task.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {editingTask?.id === task.id && (
                          <tr className="border-b border-border/40 bg-background/70">
                            <td colSpan={6} className="p-4">
                              <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                                <Input
                                  value={editingTask.title}
                                  onChange={(e) =>
                                    setEditingTask({ ...editingTask, title: e.target.value })
                                  }
                                  placeholder="タイトル"
                                />
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
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
                                  <div className="grid gap-1.5">
                                    <Label className="text-xs text-muted-foreground">実施日</Label>
                                    <DatePicker
                                      placeholder="実施日を選択"
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
                                  </div>
                                  <div className="grid gap-1.5">
                                    <Label className="text-xs text-muted-foreground">期限日</Label>
                                    <DateTimePicker
                                      placeholder="期限日を選択"
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
                                </div>
                                <div className="min-h-37.5">
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
                                      <SelectTrigger className={cn("h-9 border transition-all duration-200 hover:shadow-md cursor-pointer", taskStatusStyles[editingTask.status])}><SelectValue /></SelectTrigger>
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
                                    <Button
                                      size="sm"
                                      className="transition-all"
                                      onClick={async () => {
                                        if (!hasEditingTaskChanges) {
                                          setEditingTask(null);
                                          return;
                                        }
                                        const saved = await handleSaveTask();
                                        if (saved) {
                                          setEditingTask(null);
                                        }
                                      }}
                                    >
                                      完了
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Memo Tab */}
        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold">各種イベント（説明会・インターン等）</h3>
            <Dialog open={newEventOpen} onOpenChange={setNewEventOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="transition-all"><Plus className="mr-2 h-4 w-4" /> 新規作成</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>イベントを追加</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>タイトル</Label>
                    <Input value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="1day サマーインターン等" />
                  </div>
                  <div>
                    <Label>種類</Label>
                    <Select
                      value={newEvent.type}
                      onValueChange={(val) => setNewEvent({ ...newEvent, type: val })}
                    >
                      <SelectTrigger className="cursor-pointer transition-all hover:shadow-md">
                        <SelectValue placeholder="種類を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="説明会">説明会</SelectItem>
                        <SelectItem value="サマーインターン">サマーインターン</SelectItem>
                        <SelectItem value="秋冬インターン">秋冬インターン</SelectItem>
                        <SelectItem value="座談会">座談会</SelectItem>
                        <SelectItem value="その他">その他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>開始日時</Label>
                      <DateTimePicker
                        date={newEvent.date ? new Date(newEvent.date) : undefined}
                        onChange={(date) => setNewEvent({ ...newEvent, date: date?.toISOString() || "" })}
                      />
                    </div>
                    <div>
                      <Label>終了日時</Label>
                      <DateTimePicker
                        date={newEvent.endDate ? new Date(newEvent.endDate) : undefined}
                        onChange={(date) => setNewEvent({ ...newEvent, endDate: date?.toISOString() || "" })}
                        placeholder="終了日時（任意）"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>場所・URL</Label>
                    <Input value={newEvent.location} onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })} placeholder="Zoom / 本社" />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreateEvent}
                    disabled={isCreatingEvent || !newEvent.title || !newEvent.date}
                  >
                    {isCreatingEvent ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    追加
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          {localEvents.length === 0 ? (
            <Card><CardContent className="py-8"><p className="text-center text-muted-foreground">予定されているイベントはありません</p></CardContent></Card>
          ) : (
            <div className="rounded-lg border border-border/70 bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-240 text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/40 backdrop-blur">
                    <tr className="border-b border-border/50 text-left">
                      <th className="px-4 py-2 text-xs font-bold text-muted-foreground">種別</th>
                      <th className="px-4 py-2 text-xs font-bold text-muted-foreground">タイトル</th>
                      <th className="px-4 py-2 text-xs font-bold text-muted-foreground">開始</th>
                      <th className="px-4 py-2 text-xs font-bold text-muted-foreground">終了</th>
                      <th className="px-4 py-2 text-xs font-bold text-muted-foreground">場所</th>
                      <th className="px-4 py-2 text-xs font-bold text-muted-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localEvents.map((event) => {
                      const isExpanded = expandedEventIds.has(event.id);
                      const draftEvent = editingEvent?.id === event.id ? editingEvent : event;

                      return (
                        <Fragment key={event.id}>
                          <tr
                            className={cn(
                              "border-b border-border/40 transition-colors",
                              isExpanded
                                ? "bg-primary/5"
                                : "cursor-pointer hover:bg-muted/50"
                            )}
                            onClick={(e) => toggleEventExpand(event.id, e)}
                          >
                            <td className="px-4 py-2 align-middle">
                              <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800">
                                {draftEvent.type}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 align-middle">
                              <p className="font-medium">{draftEvent.title}</p>
                              {draftEvent.memo && (
                                <p className="mt-1 max-w-120 truncate text-xs text-muted-foreground">{getPlainText(draftEvent.memo)}</p>
                              )}
                            </td>
                            <td className="px-4 py-2 align-middle text-xs">
                              {draftEvent.date ? formatDate(draftEvent.date) : "-"}
                            </td>
                            <td className="px-4 py-2 align-middle text-xs">
                              {draftEvent.endDate ? formatDate(draftEvent.endDate) : "-"}
                            </td>
                            <td className="px-4 py-2 align-middle text-xs text-muted-foreground">
                              {draftEvent.location || "-"}
                            </td>
                            <td className="px-4 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                {isSavingEvent && editingEvent?.id === event.id && (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground mr-1" />
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg hover:bg-primary/10"
                                  onClick={(e) => toggleEventExpand(event.id, e)}
                                  title={isExpanded ? "閉じる" : "編集"}
                                >
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteEvent(event.id)}
                                  title="削除"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="border-b border-border/40 bg-background/70">
                              <td colSpan={6} className="p-4" onClick={(e) => e.stopPropagation()}>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-xs mb-1 block">タイトル</Label>
                                      <Input
                                        value={draftEvent.title}
                                        onChange={(e) => setEditingEvent({ ...draftEvent, title: e.target.value })}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs mb-1 block">種類</Label>
                                      <Select
                                        value={draftEvent.type}
                                        onValueChange={(val) => setEditingEvent({ ...draftEvent, type: val })}
                                      >
                                        <SelectTrigger className="cursor-pointer transition-all hover:shadow-md">
                                          <SelectValue placeholder="種類を選択" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="説明会">説明会</SelectItem>
                                          <SelectItem value="サマーインターン">サマーインターン</SelectItem>
                                          <SelectItem value="秋冬インターン">秋冬インターン</SelectItem>
                                          <SelectItem value="座談会">座談会</SelectItem>
                                          <SelectItem value="その他">その他</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <Label className="text-xs mb-1 block">開始日時</Label>
                                      <DateTimePicker
                                        date={draftEvent.date ? new Date(draftEvent.date) : undefined}
                                        onChange={(date) => setEditingEvent({ ...draftEvent, date: date?.toISOString() || "" })}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs mb-1 block">終了日時</Label>
                                      <DateTimePicker
                                        date={draftEvent.endDate ? new Date(draftEvent.endDate) : undefined}
                                        onChange={(date) => setEditingEvent({ ...draftEvent, endDate: date?.toISOString() || "" })}
                                        placeholder="終了日時（任意）"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <Label className="text-xs mb-1 block">場所・URL</Label>
                                      <Input
                                        value={draftEvent.location || ""}
                                        onChange={(e) => setEditingEvent({ ...draftEvent, location: e.target.value })}
                                      />
                                    </div>
                                  </div>

                                  <div className="min-h-37.5">
                                    <Label className="text-xs mb-1 block">メモ</Label>
                                    <div className="border rounded-md">
                                      <NotionEditor
                                        content={draftEvent.memo || ""}
                                        onChange={(content) => setEditingEvent({ ...draftEvent, memo: content })}
                                      />
                                    </div>
                                  </div>

                                  <div className="flex justify-end">
                                    <Button variant="ghost" size="sm" onClick={() => toggleEventExpand(event.id)} className="transition-all">
                                      閉じる
                                    </Button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="memo" className="space-y-4">
          <div className="rounded-lg border border-border/70 bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-170 text-sm">
                <thead className="sticky top-0 z-10 bg-muted/40 backdrop-blur">
                  <tr className="border-b border-border/50 text-left">
                    <th className="px-4 py-2 text-xs font-bold text-muted-foreground">タイトル</th>
                    <th className="px-4 py-2 text-xs font-bold text-muted-foreground">更新日時</th>
                    <th className="px-4 py-2 text-xs font-bold text-muted-foreground">文字数</th>
                    <th className="px-4 py-2 text-xs font-bold text-muted-foreground">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    className={cn(
                      "border-b border-border/40 transition-colors",
                      isMemoExpanded ? "bg-primary/5" : "cursor-pointer hover:bg-muted/50"
                    )}
                    onClick={() => setIsMemoExpanded((prev) => !prev)}
                  >
                    <td className="px-4 py-2 align-middle">
                      <p className="font-medium">企業研究メモ</p>
                      <p className="text-xs text-muted-foreground">選考対策・企業分析メモ</p>
                    </td>
                    <td className="px-4 py-2 align-middle text-xs text-muted-foreground">
                      {company.updatedAt ? new Date(company.updatedAt).toLocaleString("ja-JP") : "-"}
                    </td>
                    <td className="px-4 py-2 align-middle text-xs">
                      <span className="inline-flex rounded-md bg-muted px-2 py-1 font-semibold text-muted-foreground">
                        {countCharacters(memoContent)}文字
                      </span>
                    </td>
                    <td className="px-4 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {isSavingMemo && (
                          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-primary/5 border border-primary/10">
                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Saving</span>
                          </div>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg hover:bg-primary/10"
                          onClick={() => handleSaveCompany()}
                          disabled={isSavingMemo}
                          title="保存"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => setIsMemoExpanded((prev) => !prev)}
                          title={isMemoExpanded ? "閉じる" : "編集"}
                        >
                          {isMemoExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {isMemoExpanded && (
                    <tr className="border-b border-border/40 bg-background/70">
                      <td colSpan={4} className="p-4">
                        <div className="min-h-100">
                          <NotionEditor content={memoContent} onChange={setMemoContent} />
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
