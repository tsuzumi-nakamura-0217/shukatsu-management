"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckSquare, Filter, RefreshCw, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { PriorityBadge } from "@/components/badges";
import { toast } from "sonner";
import type { Task, AppConfig } from "@/types";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showCompleted, setShowCompleted] = useState(true);
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetch("/api/config").then((r) => r.json()).then(setConfig);
  }, []);

  const fetchTasks = () => {
    fetch("/api/tasks").then((r) => r.json()).then(setTasks);
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">タスク管理</h1>
          <p className="text-muted-foreground">
            {tasks.filter((t) => !t.completed).length} 件の未完了タスク
          </p>
        </div>
        {config?.notion?.enabled && (
          <Button variant="outline" onClick={handleSyncAll} disabled={syncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            Notionに一括同期
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <Input
          placeholder="タスク名・企業名で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-36">
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
          <SelectTrigger className="w-32">
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
              <div key={task.id} className="flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors">
                <Checkbox checked={task.completed} onCheckedChange={() => handleToggle(task)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium truncate ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                      {task.title}
                    </p>
                    {task.notionPageId && (
                      <Badge variant="outline" className="text-xs bg-white">✓ Notion</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.companyName && (
                      <Link href={`/companies/${task.companySlug}`} className="text-xs text-blue-600 hover:underline">
                        {task.companyName}
                      </Link>
                    )}
                    {task.memo && <span className="text-xs text-muted-foreground truncate">- {task.memo}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">{task.category}</Badge>
                  <PriorityBadge priority={task.priority} />
                  {task.deadline && (
                    <span className={`text-xs ${new Date(task.deadline) < new Date() && !task.completed ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                      {task.deadline}
                    </span>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(task.id)}>
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
