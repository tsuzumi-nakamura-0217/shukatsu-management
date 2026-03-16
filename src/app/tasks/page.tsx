"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Trash2, Plus, Edit, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { StatusBadge } from "@/components/badges";
import { toast } from "sonner";
import type { Task, AppConfig, Company } from "@/types";

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
    await fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, status: newStatus }),
    });
    fetchTasks();
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

  const handleSaveTask = async () => {
    if (!editingTask) return;
    await fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingTask),
    });
    toast.success("タスクを更新しました");
    setEditingTask(null);
    fetchTasks();
  };

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">タスク管理</h1>
          <p className="text-muted-foreground">
            {tasks.filter((t) => t.status !== "完了").length} 件の未完了タスク
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
          <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                タスクを追加
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>タスクを作成</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>タイトル *</Label>
                  <Input
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="ES提出"
                  />
                </div>
                <div>
                  <Label>企業 *</Label>
                  <Select
                    value={newTask.companySlug}
                    onValueChange={(value) => setNewTask({ ...newTask, companySlug: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="企業を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.slug} value={company.slug}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>カテゴリ</Label>
                  <Select
                    value={newTask.category}
                    onValueChange={(value) => setNewTask({ ...newTask, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(config?.taskCategories || []).map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>実施日</Label>
                  <Input
                    type="date"
                    value={newTask.executionDate}
                    onChange={(e) => setNewTask({ ...newTask, executionDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>締切</Label>
                  <Input
                    type="date"
                    value={newTask.deadline}
                    onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                  />
                </div>
                <div>
                  <Label>メモ</Label>
                  <Textarea
                    value={newTask.memo}
                    onChange={(e) => setNewTask({ ...newTask, memo: e.target.value })}
                  />
                </div>
                <div>
                  <Label>ステータス</Label>
                  <Select
                    value={newTask.status}
                    onValueChange={(value: any) => setNewTask({ ...newTask, status: value })}
                  >
                    <SelectTrigger>
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
              <DialogFooter>
                <Button variant="outline" disabled={isCreatingTask} onClick={() => setNewTaskOpen(false)}>キャンセル</Button>
                <Button
                  onClick={handleCreateTask}
                  disabled={isCreatingTask}
                  className="transition-transform active:scale-95"
                >
                  {isCreatingTask ? (
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
          {config?.notion?.enabled && (
            <Button className="w-full sm:w-auto" variant="outline" onClick={handleSyncAll} disabled={syncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              Notionに一括同期
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <Input
          placeholder="タスク名・企業名で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-sm"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="カテゴリ固定" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全カテゴリ</SelectItem>
            {(config?.taskCategories || []).map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36">
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

      {/* Task List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              {tasks.length === 0 ? "タスクがまだありません。企業ページからタスクを追加できます。" : "条件に一致するタスクがありません"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="divide-y">
            {filtered.map((task) => (
              <div key={task.id} className="flex flex-col gap-3 p-4 transition-colors hover:bg-accent/50 md:flex-row md:items-center">
                {editingTask?.id === task.id ? (
                  <div className="flex-1 space-y-3">
                    <Input
                      value={editingTask.title}
                      onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    />
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <Select
                        value={editingTask.companySlug}
                        onValueChange={(value) => {
                          const selected = companies.find((c) => c.slug === value);
                          setEditingTask({
                            ...editingTask,
                            companySlug: value,
                            companyName: selected?.name || "",
                          });
                        }}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {companies.map((company) => (
                            <SelectItem key={company.slug} value={company.slug}>{company.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={editingTask.category}
                        onValueChange={(value) => setEditingTask({ ...editingTask, category: value })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(config?.taskCategories || []).map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="date"
                        value={editingTask.executionDate}
                        onChange={(e) => setEditingTask({ ...editingTask, executionDate: e.target.value })}
                        placeholder="実施日"
                      />
                      <Input
                        type="date"
                        value={editingTask.deadline}
                        onChange={(e) => setEditingTask({ ...editingTask, deadline: e.target.value })}
                      />
                    </div>
                    <Textarea
                      value={editingTask.memo}
                      onChange={(e) => setEditingTask({ ...editingTask, memo: e.target.value })}
                    />
                    <div className="flex items-center justify-between">
                      <div className="w-32">
                        <Select
                          value={editingTask.status}
                          onValueChange={(value: any) => setEditingTask({ ...editingTask, status: value })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="未着手">未着手</SelectItem>
                            <SelectItem value="進行中">進行中</SelectItem>
                            <SelectItem value="完了">完了</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingTask(null)}>キャンセル</Button>
                        <Button size="sm" onClick={handleSaveTask}>保存</Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Select
                      value={task.status}
                      onValueChange={(value: any) => handleStatusChange(task, value)}
                    >
                      <SelectTrigger className="w-[100px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="未着手">未着手</SelectItem>
                        <SelectItem value="進行中">進行中</SelectItem>
                        <SelectItem value="完了">完了</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex-1 min-w-0 md:ml-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-medium truncate ${task.status === "完了" ? "line-through text-muted-foreground" : ""}`}>
                          {task.title}
                        </p>
                        {task.notionPageId && (
                          <Badge variant="outline" className="text-xs bg-white">✓ Notion</Badge>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        {task.companyName && (
                          <Link href={`/companies/${task.companySlug}`} className="text-xs text-blue-600 hover:underline">
                            {task.companyName}
                          </Link>
                        )}
                        {task.memo && <span className="text-xs text-muted-foreground truncate">- {task.memo}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:shrink-0">
                      <Badge variant="outline" className="text-xs">{task.category}</Badge>
                      {task.executionDate && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground border rounded-full px-2 py-0.5 bg-background">
                          <span className="font-medium text-[10px] uppercase text-slate-400">実施</span>
                          <span>{task.executionDate}</span>
                        </div>
                      )}
                      {task.deadline && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground border rounded-full px-2 py-0.5 bg-background">
                           <span className="font-medium text-[10px] uppercase text-slate-400">締切</span>
                          <span className={new Date(task.deadline) < new Date() && task.status !== "完了" ? "text-red-600 font-medium" : ""}>
                            {task.deadline}
                          </span>
                        </div>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setEditingTask(task)}>
                        <Edit className="h-3 w-3 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(task.id)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
