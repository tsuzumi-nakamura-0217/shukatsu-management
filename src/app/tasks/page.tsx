"use client";

import { Fragment, useEffect, useState } from "react";
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
import { TagBadge, taskStatusStyles } from "@/components/badges";
import { cn, formatDate, getPlainText } from "@/lib/utils";
import { toast } from "sonner";
import { useAutoSave } from "@/hooks/use-auto-save";
import dynamic from "next/dynamic";
const NotionEditor = dynamic(() => import("@/components/notion-editor").then(mod => mod.NotionEditor), { ssr: false });
import type { Task, AppConfig, Company } from "@/types";
import { useTasks, useCompanies, useConfig, invalidateStats, invalidateCompanyDetail } from "@/hooks/use-api";

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
  const { tasks: swrTasks, mutate: mutateTasks } = useTasks();
  const { companies } = useCompanies();
  const { config } = useConfig();
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  useEffect(() => { setLocalTasks(swrTasks); }, [swrTasks]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("incomplete");
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

  // Update default values when config/companies load
  useEffect(() => {
    if (config?.taskCategories?.[0]) {
      setNewTask(prev => ({ ...prev, category: prev.category || config.taskCategories[0] }));
    }
  }, [config]);

  useEffect(() => {
    if (companies.length > 0) {
      setNewTask(prev => ({ ...prev, companySlug: prev.companySlug || companies[0]?.slug || "" }));
    }
  }, [companies]);

  const handleStatusChange = async (task: Task, newStatus: "未着手" | "進行中" | "完了") => {
    const oldStatus = task.status;
    setLocalTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      mutateTasks();
    } catch (error) {
      setLocalTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: oldStatus } : t));
      toast.error("ステータスの更新に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
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
      mutateTasks();
    } catch {
      toast.error("タスクの削除に失敗しました");
    }
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
        mutateTasks();
      } else {
        toast.error("タスクの作成に失敗しました");
      }
    } finally {
      setIsCreatingTask(false);
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
        // toast.success("タスクを更新しました"); // Skip toast for auto-save
        // setEditingTask(null); // Don't close for auto-save
      }
      mutateTasks();
      return true;
    } catch (error) {
      console.error(error);
      toast.error("保存に失敗しました");
      return false;
    } finally {
      setIsSavingTask(false);
    }
  };

  const originalEditingTask = editingTask ? localTasks.find((t) => t.id === editingTask.id) : undefined;

  useAutoSave({
    enabled: !!editingTask,
    hasChanges: hasTaskChanges(editingTask, originalEditingTask),
    onSave: async () => {
      await handleSaveTask();
    },
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
        mutateTasks();
      }
    } catch {
      toast.error("同期に失敗しました");
    }
    setSyncing(false);
  };

  const filtered = localTasks
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

  const incompleteCount = localTasks.filter((t) => t.status !== "完了").length;

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Compact Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-card p-4 px-8 shadow-lg shadow-primary/5 flex items-center justify-between">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 h-32 w-32 rounded-full bg-rose-500/10 blur-[40px]" />

        <div className="relative flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ListChecks className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              タスク管理
            </h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
              Currently <span className="text-rose-500">{incompleteCount}</span> incomplete tasks
            </p>
          </div>
        </div>

        <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl h-10 px-4 font-bold shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all">
              <Plus className="mr-2 h-4 w-4" />
              新規タスク
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
                    実施日
                  </Label>
                  <DatePicker
                    placeholder="実施日を選択"
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
                    placeholder="締切日時を選択"
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
                    <SelectTrigger className={cn("rounded-xl h-11 border font-bold shadow-none", taskStatusStyles[newTask.status])}>
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-245 text-sm">
            <thead className="sticky top-0 z-10 bg-muted/40 backdrop-blur">
              <tr className="border-b border-border/50 text-left">
                <th className="px-4 py-2 text-xs font-bold text-muted-foreground">ステータス</th>
                <th className="px-4 py-2 text-xs font-bold text-muted-foreground">タスク</th>
                <th className="px-4 py-2 text-xs font-bold text-muted-foreground hidden md:table-cell">企業</th>
                <th className="px-4 py-2 text-xs font-bold text-muted-foreground">カテゴリ</th>
                <th className="px-4 py-2 text-xs font-bold text-muted-foreground">実施日</th>
                <th className="px-4 py-2 text-xs font-bold text-muted-foreground">期限日</th>
                <th className="px-4 py-2 text-xs font-bold text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-sm text-muted-foreground">
                    条件に一致するタスクがありません
                  </td>
                </tr>
              ) : (
                filtered.map((task) => (
                  <Fragment key={task.id}>
                    <tr
                      className={cn(
                        "border-b border-border/40 transition-colors",
                        editingTask?.id === task.id
                          ? "bg-primary/5"
                          : "cursor-pointer hover:bg-muted/50"
                      )}
                      onClick={() => setEditingTask(task)}
                    >
                      <td className="px-4 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
                        <Select value={task.status} onValueChange={(val: any) => handleStatusChange(task, val)}>
                          <SelectTrigger className={cn("h-8 w-32 border text-xs font-bold shadow-none", taskStatusStyles[task.status])}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="未着手">未着手</SelectItem>
                            <SelectItem value="進行中">進行中</SelectItem>
                            <SelectItem value="完了">完了</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <div className="flex items-center gap-2">
                          <span className={cn("font-semibold", task.status === "完了" && "line-through text-muted-foreground")}>{task.title}</span>
                        </div>
                        {task.memo && (
                          <p className="mt-1 max-w-110 truncate text-xs text-muted-foreground">
                            {getPlainText(task.memo)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2 align-middle hidden md:table-cell">
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          {task.companyName || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <TagBadge name={task.category} color="slate" />
                      </td>
                      <td className="px-4 py-2 align-middle text-xs">
                        {task.executionDate ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-semibold text-foreground dark:bg-slate-800">
                            <CalendarClock className="h-3 w-3 opacity-60" />
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
                              "inline-flex items-center gap-1 rounded-md border px-2 py-1 font-semibold",
                              new Date(task.deadline) < new Date() && task.status !== "完了"
                                ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-950/20"
                                : "border-transparent bg-slate-100 text-foreground dark:bg-slate-800"
                            )}
                          >
                            <ListChecks className="h-3 w-3 opacity-60" />
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
                            onClick={() => handleDelete(task.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {editingTask?.id === task.id && (
                      <tr className="border-b border-border/40 bg-background/70">
                        <td colSpan={7} className="p-4">
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
                              <div className="grid gap-1.5">
                                <Label className="font-bold ml-1 flex items-center gap-2 text-zinc-500">
                                  <CalendarClock className="h-3 w-3" />
                                  実施日
                                </Label>
                                <DatePicker
                                  placeholder="実施日を選択"
                                  date={editingTask.executionDate ? new Date(editingTask.executionDate) : undefined}
                                  onChange={(d) => setEditingTask((prev) => prev ? { ...prev, executionDate: d ? format(d, "yyyy-MM-dd") : "" } : prev)}
                                />
                              </div>
                              <div className="grid gap-1.5">
                                <Label className="font-bold ml-1 flex items-center gap-2 text-zinc-500">
                                  <ListChecks className="h-3 w-3" />
                                  締切日時
                                </Label>
                                <DateTimePicker
                                  placeholder="締切日時を選択"
                                  date={editingTask.deadline ? new Date(editingTask.deadline) : undefined}
                                  onChange={(d) => setEditingTask((prev) => prev ? { ...prev, deadline: d ? d.toISOString() : "" } : prev)}
                                />
                              </div>
                            </div>
                            <div className="min-h-37.5">
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
                                  <SelectTrigger className={cn("w-32 rounded-lg border font-bold h-9 shadow-none", taskStatusStyles[editingTask.status])}><SelectValue /></SelectTrigger>
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
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
