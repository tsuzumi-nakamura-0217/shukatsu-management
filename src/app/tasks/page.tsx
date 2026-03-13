"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Trash2, Plus, Edit } from "lucide-react";
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
import { PriorityBadge } from "@/components/badges";
import { toast } from "sonner";
import type { Task, AppConfig, Company } from "@/types";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showCompleted, setShowCompleted] = useState(true);
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    companySlug: "",
    category: "その他",
    priority: "medium" as "high" | "medium" | "low",
    deadline: "",
    memo: "",
    completed: false,
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

  const handleToggle = async (task: Task) => {
    await fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, completed: !task.completed }),
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
    if (!newTask.title || !newTask.companySlug) {
      toast.error("タイトルと企業は必須です");
      return;
    }
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTask),
    });
    if (res.ok) {
      const created = await res.json();
      if (newTask.completed) {
        await fetch("/api/tasks", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: created.id, completed: true }),
        });
      }
      toast.success("タスクを作成しました");
      setNewTaskOpen(false);
      setNewTask({
        title: "",
        companySlug: companies[0]?.slug || "",
        category: config?.taskCategories?.[0] || "その他",
        priority: "medium",
        deadline: "",
        memo: "",
        completed: false,
      });
      fetchTasks();
    } else {
      toast.error("タスクの作成に失敗しました");
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
      if (!showCompleted && t.completed) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.title.toLowerCase().includes(q) || (t.companyName || "").toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
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
            {tasks.filter((t) => !t.completed).length} 件の未完了タスク
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
                  <Label>優先度</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value) =>
                      setNewTask({ ...newTask, priority: value as "high" | "medium" | "low" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">高</SelectItem>
                      <SelectItem value="medium">中</SelectItem>
                      <SelectItem value="low">低</SelectItem>
                    </SelectContent>
                  </Select>
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
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={newTask.completed}
                    onCheckedChange={(v) => setNewTask({ ...newTask, completed: !!v })}
                  />
                  完了済みとして作成
                </label>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewTaskOpen(false)}>キャンセル</Button>
                <Button onClick={handleCreateTask}>作成</Button>
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
            <SelectValue placeholder="カテゴリ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全カテゴリ</SelectItem>
            {(config?.taskCategories || []).map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="優先度" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全優先度</SelectItem>
            <SelectItem value="high">高</SelectItem>
            <SelectItem value="medium">中</SelectItem>
            <SelectItem value="low">低</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={showCompleted} onCheckedChange={(v) => setShowCompleted(!!v)} />
          完了済みも表示
        </label>
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
                      <Select
                        value={editingTask.priority}
                        onValueChange={(value) =>
                          setEditingTask({ ...editingTask, priority: value as "high" | "medium" | "low" })
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">高</SelectItem>
                          <SelectItem value="medium">中</SelectItem>
                          <SelectItem value="low">低</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={editingTask.completed}
                          onCheckedChange={(v) => setEditingTask({ ...editingTask, completed: !!v })}
                        />
                        完了
                      </label>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingTask(null)}>キャンセル</Button>
                        <Button size="sm" onClick={handleSaveTask}>保存</Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Checkbox checked={task.completed} onCheckedChange={() => handleToggle(task)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-medium truncate ${task.completed ? "line-through text-muted-foreground" : ""}`}>
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
                      <PriorityBadge priority={task.priority} />
                      {task.deadline && (
                        <span className={`text-xs ${new Date(task.deadline) < new Date() && !task.completed ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                          {task.deadline}
                        </span>
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
