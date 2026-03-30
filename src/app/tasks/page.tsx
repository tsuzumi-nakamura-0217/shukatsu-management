"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { RefreshCw, Trash2, Plus, Edit, Loader2, Search, LayoutGrid, CalendarClock, ListChecks, MapPin, Tag, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge, TagBadge, statusColors } from "@/components/badges";
import { cn, formatDate, getPlainText } from "@/lib/utils";
import { toast } from "sonner";
import { useAutoSave } from "@/hooks/use-auto-save";
import dynamic from "next/dynamic";
const NotionEditor = dynamic(() => import("@/components/notion-editor").then(mod => mod.NotionEditor), { ssr: false });
import type { Task, AppConfig, Company } from "@/types";

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


export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("incomplete"); // all, incomplete, 未着手, 進行中, 完了
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    companySlug: "",
    category: "その他",
    executionDate: "",
    deadline: "",
    memo: "",
    status: "未着手" as "未着手" | "進行中" | "完了",
  });

  function fetchTasks() {
    fetch("/api/tasks").then((r) => r.json()).then(setTasks);
  }

  useEffect(() => {
    fetchTasks();
    fetch("/api/config").then((r) => r.json()).then((data: AppConfig) => {
      setConfig(data);
      setNewTask((prev) => ({ ...prev, category: data.taskCategories?.[0] || "その他" }));
    });
    fetch("/api/companies").then((r) => r.json()).then((data: Company[]) => {
      setCompanies(data);
      setNewTask((prev) => ({ ...prev, companySlug: prev.companySlug || data[0]?.slug || "" }));
    });
  }, []);

  const handleStatusChange = async (task: Task, newStatus: "未着手" | "進行中" | "完了") => {
    const oldStatus = task.status;
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      fetchTasks();
    } catch (error) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: oldStatus } : t));
      toast.error("ステータスの更新に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このタスクを削除しますか？")) return;
    await fetch("/api/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    toast.success("タスクを削除しました");
    fetchTasks();
  };

  const handleCreateTask = async () => {
    if (isCreatingTask) return;
    if (!newTask.title || !newTask.companySlug) {
      toast.error("タイトルと企業は必須です");
      return;
    }
    setIsCreatingTask(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });
      if (res.ok) {
        toast.success("タスクを作成しました");
        setNewTaskOpen(false);
        setNewTask({
          title: "",
          companySlug: companies[0]?.slug || "",
          category: config?.taskCategories?.[0] || "その他",
          executionDate: "",
          deadline: "",
          memo: "",
          status: "未着手",
        });
        fetchTasks();
      } else {
        toast.error("タスクの作成に失敗しました");
      }
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleSaveTask = async (taskToSave?: Task) => {
    const target = taskToSave || editingTask;
    if (!target || isSavingTask) return;
    setIsSavingTask(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target),
      });
      if (res.ok) {
        if (!taskToSave) {
          // toast.success("タスクを更新しました"); // Skip toast for auto-save
          // setEditingTask(null); // Don't close for auto-save
        }
        fetchTasks();
      }
    } catch (error) {
      console.error(error);
      toast.error("保存に失敗しました");
    } finally {
      setIsSavingTask(false);
    }
  };

  const originalEditingTask = editingTask ? tasks.find((t) => t.id === editingTask.id) : undefined;

  useAutoSave({
    enabled: !!editingTask,
    hasChanges: hasTaskChanges(editingTask, originalEditingTask),
    onSave: () => handleSaveTask(),
    delay: 1500,
    deps: [editingTask, originalEditingTask],
  });

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync-all" }),
      });
      const data = await res.json();
      if (data.results) {
        const success = data.results.filter((r: { success: boolean }) => r.success).length;
        toast.success(`${success}/${data.results.length} タスクをNotionに同期しました`);
        fetchTasks();
      }
    } catch {
      toast.error("同期に失敗しました");
    }
    setSyncing(false);
  };


  const filtered = tasks
    .filter((t) => {
      if (statusFilter === "incomplete" && t.status === "完了") return false;
      if (statusFilter !== "all" && statusFilter !== "incomplete" && t.status !== statusFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.title.toLowerCase().includes(q) || (t.companyName || "").toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (a.status === "完了" && b.status !== "完了") return 1;
      if (a.status !== "完了" && b.status === "完了") return -1;
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    });

  const incompleteCount = tasks.filter((t) => t.status !== "完了").length;

  return (
    <div className="space-y-8 pb-10">
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-card p-8 shadow-xl shadow-primary/5">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 h-48 w-48 rounded-full bg-rose-500/10 blur-[60px]" />
        <div className="absolute bottom-0 left-0 -ml-12 -mb-12 h-48 w-48 rounded-full bg-indigo-500/10 blur-[60px]" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">タスク管理</h1>
            <p className="text-muted-foreground mt-1 font-medium">
              現在 <span className="text-rose-500 font-bold">{incompleteCount}</span> 件の未完了プロジェクトが進行中です
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="rounded-xl shadow-md hover:shadow-lg transition-all duration-200">
                  <Plus className="mr-2 h-5 w-5" />
                  タスクを追加
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">タスクを作成</DialogTitle>
                </DialogHeader>
                <div className="grid gap-5 py-4">
                  <div className="grid gap-2">
                    <Label className="font-bold ml-1">タイトル <span className="text-destructive">*</span></Label>
                    <Input
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="例: ES提出"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="font-bold ml-1 flex items-center gap-2 text-zinc-500">
                        <CalendarClock className="h-3 w-3" />
                        実施日時
                      </Label>
                      <DatePicker
                        date={newTask.executionDate ? new Date(newTask.executionDate) : undefined}
                        onChange={(d) => setNewTask((prev) => ({ ...prev, executionDate: d ? format(d, "yyyy-MM-dd") : "" }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="font-bold ml-1 flex items-center gap-2 text-zinc-500">
                        <ListChecks className="h-3 w-3" />
                        締切日時
                      </Label>
                      <DateTimePicker
                        date={newTask.deadline ? new Date(newTask.deadline) : undefined}
                        onChange={(d) => setNewTask((prev) => ({ ...prev, deadline: d ? d.toISOString() : "" }))}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-bold ml-1">メモ</Label>
                    <Textarea
                      placeholder="タスクの詳細や備考を入力..."
                      value={newTask.memo}
                      onChange={(e) => setNewTask({ ...newTask, memo: e.target.value })}
                      className="rounded-xl bg-background/50 border-none focus-visible:ring-2 focus-visible:ring-primary/20 min-h-[100px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="font-bold ml-1">カテゴリ</Label>
                      <Select
                        value={newTask.category}
                        onValueChange={(value) => setNewTask({ ...newTask, category: value })}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(config?.taskCategories || []).map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label className="font-bold ml-1">ステータス</Label>
                      <Select
                        value={newTask.status}
                        onValueChange={(value: any) => setNewTask({ ...newTask, status: value })}
                      >
                        <SelectTrigger className={cn("rounded-xl h-11 border-none bg-background/50 font-bold", statusColors[newTask.status])}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="未着手">未着手</SelectItem>
                          <SelectItem value="進行中">進行中</SelectItem>
                          <SelectItem value="完了">完了</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setNewTaskOpen(false)} className="transition-all">キャンセル</Button>
                  <Button onClick={handleCreateTask} disabled={isCreatingTask} className="rounded-xl px-8 transition-all">
                    {isCreatingTask ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "作成"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 glass p-4 rounded-2xl md:flex-row md:items-center">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="タスク名・企業名で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 border-none bg-background/50 focus-visible:bg-background rounded-xl h-11 transition-all duration-300 hover:bg-background/80"
          />
        </div>
        <div className="flex items-center gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-40 rounded-xl h-11 border-none bg-background/50 transition-all duration-200 cursor-pointer">
              <SelectValue placeholder="全カテゴリ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全カテゴリ</SelectItem>
              {(config?.taskCategories || []).map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={cn("w-full md:w-44 rounded-xl h-11 border-none bg-background/50 transition-all duration-200 cursor-pointer", statusFilter !== "all" && statusFilter !== "incomplete" && "ring-2 ring-primary/20")}>
              <SelectValue placeholder="ステータス" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて表示</SelectItem>
              <SelectItem value="incomplete">未完了のみ</SelectItem>
              <SelectItem value="未着手">未着手</SelectItem>
              <SelectItem value="進行中">進行中</SelectItem>
              <SelectItem value="完了">完了</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-none glass overflow-hidden">
        <div className="divide-y divide-white/10 dark:divide-white/5">
          {filtered.map((task) => (
            <div key={task.id} className="group p-5 transition-all hover:bg-white/40 dark:hover:bg-card/40 cursor-pointer" onClick={() => setEditingTask(task)}>
              {editingTask?.id === task.id ? (
                <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    className="text-lg font-bold rounded-xl"
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Select
                      value={editingTask.companySlug}
                      onValueChange={(value) => {
                        const selected = companies.find((c) => c.slug === value);
                        setEditingTask({ ...editingTask, companySlug: value, companyName: selected?.name || "" });
                      }}
                    >
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>{companies.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select
                      value={editingTask.category}
                      onValueChange={(value) => setEditingTask({ ...editingTask, category: value })}
                    >
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>{(config?.taskCategories || []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <DatePicker
                      date={editingTask.executionDate ? new Date(editingTask.executionDate) : undefined}
                      onChange={(d) => setEditingTask((prev) => prev ? { ...prev, executionDate: d ? format(d, "yyyy-MM-dd") : "" } : prev)}
                    />
                    <DateTimePicker
                      date={editingTask.deadline ? new Date(editingTask.deadline) : undefined}
                      onChange={(d) => setEditingTask((prev) => prev ? { ...prev, deadline: d ? d.toISOString() : "" } : prev)}
                    />
                  </div>
                  <div className="min-h-[150px]">
                    <NotionEditor
                      content={editingTask.memo || ""}
                      onChange={(val) => setEditingTask({ ...editingTask, memo: val })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Select
                        value={editingTask.status}
                        onValueChange={(value: any) => setEditingTask({ ...editingTask, status: value })}
                      >
                        <SelectTrigger className={cn("w-32 rounded-lg font-bold h-9", statusColors[editingTask.status])}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="未着手">未着手</SelectItem>
                          <SelectItem value="進行中">進行中</SelectItem>
                          <SelectItem value="完了">完了</SelectItem>
                        </SelectContent>
                      </Select>
                      {isSavingTask && (
                        <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-primary/5 border border-primary/10">
                          <Loader2 className="h-3 w-3 animate-spin text-primary" />
                          <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Saving</span>
                        </div>
                      )}
                    </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditingTask(null)} className="transition-all">キャンセル</Button>
                          <Button size="sm" onClick={() => handleSaveTask()} className="rounded-xl px-6 transition-all">保存</Button>
                        </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="w-[124px] shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Select value={task.status} onValueChange={(val: any) => handleStatusChange(task, val)}>
                      <SelectTrigger className={cn("w-full h-8 text-[11px] font-black uppercase tracking-tighter rounded-lg", statusColors[task.status])}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="未着手">未着手</SelectItem>
                        <SelectItem value="進行中">進行中</SelectItem>
                        <SelectItem value="完了">完了</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-base font-bold transition-colors group-hover:text-primary", task.status === "完了" && "line-through opacity-40")}>{task.title}</span>
                      {task.notionPageId && <div className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-[9px] font-black text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1"><div className="h-1 w-1 rounded-full bg-current animate-pulse" /> NOTION</div>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      {task.companyName && <span className="text-blue-500 font-bold">{task.companyName}</span>}
                      {task.memo && <span className="text-muted-foreground truncate opacity-60">/ {getPlainText(task.memo)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <TagBadge name={task.category} color="slate" />
                    <div className="flex flex-col items-end gap-1">
                      {task.executionDate && (
                        <div className="flex items-center gap-2 group/date pointer-events-none">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase opacity-40 group-hover/date:opacity-100 transition-opacity">Planned</div>
                          <div className="text-xs font-bold text-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <CalendarClock className="h-3 w-3 opacity-40" />
                            {formatDate(task.executionDate)}
                          </div>
                        </div>
                      )}
                      {task.deadline && (
                        <div className="flex items-center gap-2 group/date pointer-events-none">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase opacity-40 group-hover/date:opacity-100 transition-opacity">Deadline</div>
                          <div className={cn("text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border",
                            new Date(task.deadline) < new Date() && task.status !== "完了"
                              ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 border-rose-200 dark:border-rose-800"
                              : "bg-slate-100 dark:bg-slate-800 text-foreground border-transparent")}>
                            <ListChecks className="h-3 w-3 opacity-40" />
                            {formatDate(task.deadline)}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 transition-all duration-200" onClick={(e) => { e.stopPropagation(); setEditingTask(task) }}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-destructive transition-all duration-200" onClick={(e) => { e.stopPropagation(); handleDelete(task.id) }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
