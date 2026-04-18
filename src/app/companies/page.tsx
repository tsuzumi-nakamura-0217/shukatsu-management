"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Search, Loader2, Building2, Filter, XCircle, ChevronUp, ChevronDown, ChevronsUpDown, Calendar, Bell, Flag, CheckCircle2, Circle, Clock } from "lucide-react";
import { FlexibleDateInput } from "@/components/ui/flexible-date-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/badges";
import { cn, isFuzzyDatePassed, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { Company } from "@/types";
import { useCompanies, useTasks, useConfig, useEvents } from "@/hooks/use-api";

type SortField = "name" | "industry" | "status" | "priority" | "deadline" | "event" | "result" | `cat_${string}`;
type SortDir = "asc" | "desc";

export default function CompaniesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialStatus = searchParams.get("status") || "all";

  const { companies, mutate: mutateCompanies } = useCompanies();
  const { config } = useConfig();
  const { tasks } = useTasks();
  const { events } = useEvents();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [industryFilter, setIndustryFilter] = useState("all");
  const [excludeRejected, setExcludeRejected] = useState(false);
  const [minPriority, setMinPriority] = useState(0);
  const [sortField, setSortField] = useState<SortField>("priority");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: "",
    industry: "",
    url: "",
    mypageUrl: "",
    loginId: "",
    password: "",
    examId: "",
    location: "",
    priority: 3,
    expectedResultPeriod: "",
  });

  useEffect(() => {
    if (config?.industries?.[0]) {
      setNewCompany(prev => ({ ...prev, industry: prev.industry || config.industries[0] }));
    }
  }, [config]);

  const handleCreate = async () => {
    if (isCreating) return;
    if (!newCompany.name) {
      toast.error("企業名を入力してください");
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCompany),
      });
      if (res.ok) {
        toast.success("企業を追加しました");
        setDialogOpen(false);
        setNewCompany({
          name: "",
          industry: config?.industries?.[0] || "",
          url: "",
          mypageUrl: "",
          loginId: "",
          password: "",
          examId: "",
          location: "",
          priority: 3,
          expectedResultPeriod: "",
        });
        mutateCompanies();
      } else {
        toast.error("企業の追加に失敗しました");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(field === "name" || field === "industry" ? "asc" : "desc");
    }
  };

  const getNextDeadline = (company: Company) => {
    return tasks
      .filter(t => t.companySlug === company.slug && t.status !== "完了" && t.deadline)
      .sort((a, b) => a.deadline.localeCompare(b.deadline))[0] || null;
  };

  const getNextEvent = (company: Company) => {
    const now = new Date();
    return events
      .filter(e => e.companySlug === company.slug && new Date(e.date) >= now)
      .sort((a, b) => a.date.localeCompare(b.date))[0] || null;
  };

  const getCategoryInfo = (company: Company, category: string) => {
    const categoryTasks = tasks.filter(t => t.companySlug === company.slug && t.category === category);
    if (categoryTasks.length === 0) {
      return {
        status: "none" as const,
        deadline: null,
        title: "",
        titleTaskId: null as string | null,
        deadlineTaskId: null as string | null,
      };
    }

    const allCompleted = categoryTasks.every(t => t.status === "完了");
    const anyInProgress = categoryTasks.some(t => t.status === "進行中" || t.status === "完了");
    const status = allCompleted ? "完了" as const : anyInProgress ? "進行中" as const : "未着手" as const;

    const activeTasks = categoryTasks.filter(t => t.status !== "完了");
    const titleTask = activeTasks[0] || categoryTasks[0] || null;
    const deadlineTask = activeTasks
      .filter(t => t.deadline)
      .sort((a, b) => a.deadline.localeCompare(b.deadline))[0] || null;

    return {
      status,
      deadline: deadlineTask?.deadline || null,
      title: titleTask?.title || "",
      titleTaskId: titleTask?.id || null,
      deadlineTaskId: deadlineTask?.id || null,
    };
  };

  const navigateToTask = (companySlug: string, taskId: string) => {
    router.push(`/companies/${companySlug}?tab=tasks&taskId=${encodeURIComponent(taskId)}`);
  };

  const getCategoryStatusOrder = (status: "none" | "未着手" | "進行中" | "完了"): number => {
    switch (status) {
      case "進行中": return 3;
      case "未着手": return 2;
      case "完了": return 1;
      case "none": return 0;
    }
  };

  const filtered = useMemo(() => {
    return companies
      .filter((c) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q) || c.location?.toLowerCase().includes(q);
      })
      .filter((c) => statusFilter !== "all" ? c.status === statusFilter : true)
      .filter((c) => industryFilter !== "all" ? c.industry === industryFilter : true)
      .filter((c) => excludeRejected ? c.status !== "不合格" : true)
      .filter((c) => minPriority > 0 ? c.priority >= minPriority : true)
      .sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        if (sortField.startsWith("cat_")) {
          const cat = sortField.slice(4);
          return dir * (getCategoryStatusOrder(getCategoryInfo(a, cat).status) - getCategoryStatusOrder(getCategoryInfo(b, cat).status));
        }
        switch (sortField) {
          case "name": return dir * a.name.localeCompare(b.name);
          case "industry": return dir * a.industry.localeCompare(b.industry);
          case "status": return dir * a.status.localeCompare(b.status);
          case "priority": return dir * (a.priority - b.priority) || a.name.localeCompare(b.name);
          case "deadline": {
            const aD = getNextDeadline(a)?.deadline || "9999-12-31";
            const bD = getNextDeadline(b)?.deadline || "9999-12-31";
            return dir * aD.localeCompare(bD);
          }
          case "event": {
            const aE = getNextEvent(a)?.date || "9999-12-31";
            const bE = getNextEvent(b)?.date || "9999-12-31";
            return dir * aE.localeCompare(bE);
          }
          case "result": {
            const aR = a.expectedResultPeriod || "9999-12-31";
            const bR = b.expectedResultPeriod || "9999-12-31";
            return dir * aR.localeCompare(bR);
          }
          default: return 0;
        }
      });
  }, [companies, search, statusFilter, industryFilter, excludeRejected, minPriority, sortField, sortDir, tasks, events]);

  const allStatuses = config?.defaultStages || [];
  const allIndustries = config?.industries || [];

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 opacity-0 group-hover/th:opacity-40 transition-opacity" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 text-foreground" />
      : <ChevronDown className="h-3 w-3 text-foreground" />;
  };

  const activeFilterCount = [statusFilter !== "all", industryFilter !== "all", minPriority > 0, excludeRejected].filter(Boolean).length;

  const taskCategories = config?.taskCategories || [];

  const sortLabel: Record<string, string> = {
    priority: "優先度", name: "企業名", industry: "業界", status: "ステータス",
    deadline: "締め切り", event: "イベント", result: "結果通知",
    ...Object.fromEntries(taskCategories.map(c => [`cat_${c}`, c])),
  };

  return (
    <div className="flex flex-col gap-4 pb-10">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-foreground/5 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-foreground/60" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground leading-none">企業一覧</h1>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{companies.length} 件の企業を管理中</p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-lg h-8 px-3 text-xs font-semibold gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              新規追加
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">新しい企業を追加</DialogTitle>
              <DialogDescription>志望する企業の基本情報を入力してください</DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="font-bold ml-1">企業名 <span className="text-destructive">*</span></Label>
                <Input id="name" value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} placeholder="株式会社サンプル" className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="industry" className="font-bold ml-1">業界</Label>
                  <Select value={newCompany.industry} onValueChange={(value) => setNewCompany({ ...newCompany, industry: value })}>
                    <SelectTrigger id="industry" className="rounded-xl"><SelectValue placeholder="選択" /></SelectTrigger>
                    <SelectContent>
                      {allIndustries.map((industry) => (<SelectItem key={industry} value={industry}>{industry}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location" className="font-bold ml-1">所在地</Label>
                  <Input id="location" value={newCompany.location} onChange={(e) => setNewCompany({ ...newCompany, location: e.target.value })} placeholder="例: 東京都" className="rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="url" className="font-bold ml-1">企業URL</Label>
                  <Input id="url" value={newCompany.url} onChange={(e) => setNewCompany({ ...newCompany, url: e.target.value })} placeholder="https://example.com" className="rounded-xl" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priority" className="font-bold ml-1">優先度 (1-5)</Label>
                  <Select value={newCompany.priority.toString()} onValueChange={(value) => setNewCompany({ ...newCompany, priority: parseInt(value) })}>
                    <SelectTrigger id="priority" className="rounded-xl"><SelectValue placeholder="選択" /></SelectTrigger>
                    <SelectContent>
                      {[5, 4, 3, 2, 1].map((p) => (<SelectItem key={p} value={p.toString()}>{p} {p === 5 ? "(最高)" : p === 1 ? "(最低)" : ""}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="mypageUrl" className="font-bold ml-1">マイページURL</Label>
                  <Input id="mypageUrl" value={newCompany.mypageUrl} onChange={(e) => setNewCompany({ ...newCompany, mypageUrl: e.target.value })} placeholder="https://mypage.example.com" className="rounded-xl" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="examId" className="font-bold ml-1">受験ID</Label>
                  <Input id="examId" value={newCompany.examId} onChange={(e) => setNewCompany({ ...newCompany, examId: e.target.value })} placeholder="Webテスト用受験ID" className="rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="loginId" className="font-bold ml-1">ログインID</Label>
                  <Input id="loginId" value={newCompany.loginId} onChange={(e) => setNewCompany({ ...newCompany, loginId: e.target.value })} placeholder="ID / メールアドレス" className="rounded-xl" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password" title="パスワードは暗号化されて保存されます" className="font-bold ml-1">パスワード</Label>
                  <Input id="password" type="password" value={newCompany.password} onChange={(e) => setNewCompany({ ...newCompany, password: e.target.value })} placeholder="••••••••" className="rounded-xl" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expectedResultPeriod" className="font-bold ml-1">結果通知予定</Label>
                <FlexibleDateInput value={newCompany.expectedResultPeriod} onChange={(val) => setNewCompany({ ...newCompany, expectedResultPeriod: val })} placeholder="例: 2/17" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" disabled={isCreating} onClick={() => setDialogOpen(false)}>キャンセル</Button>
              <Button onClick={handleCreate} disabled={isCreating} className="rounded-xl px-8">
                {isCreating ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />追加中...</>) : "企業の登録"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-grow max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            placeholder="検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm border-transparent bg-transparent hover:bg-muted/50 focus-visible:bg-background focus-visible:border-border rounded-md transition-all"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={cn("h-7 w-auto min-w-[80px] rounded-md text-xs border-transparent bg-transparent hover:bg-muted/50 transition-all cursor-pointer gap-1 px-2", statusFilter !== "all" && "bg-primary/5 text-primary border-primary/20 hover:bg-primary/10")}>
              <SelectValue placeholder="ステータス" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全ステータス</SelectItem>
              {allStatuses.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>

          <Select value={industryFilter} onValueChange={setIndustryFilter}>
            <SelectTrigger className={cn("h-7 w-auto min-w-[70px] rounded-md text-xs border-transparent bg-transparent hover:bg-muted/50 transition-all cursor-pointer gap-1 px-2", industryFilter !== "all" && "bg-primary/5 text-primary border-primary/20 hover:bg-primary/10")}>
              <SelectValue placeholder="業界" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全業界</SelectItem>
              {allIndustries.map((ind) => (<SelectItem key={ind} value={ind}>{ind}</SelectItem>))}
            </SelectContent>
          </Select>

          <Select value={minPriority.toString()} onValueChange={(v) => setMinPriority(parseInt(v))}>
            <SelectTrigger className={cn("h-7 w-auto min-w-[70px] rounded-md text-xs border-transparent bg-transparent hover:bg-muted/50 transition-all cursor-pointer gap-1 px-2", minPriority > 0 && "bg-primary/5 text-primary border-primary/20 hover:bg-primary/10")}>
              <SelectValue placeholder="優先度" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">全優先度</SelectItem>
              {[5, 4, 3, 2, 1].map((p) => (<SelectItem key={p} value={p.toString()}>★ {p}以上</SelectItem>))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            className={cn("rounded-md h-7 px-2 text-xs gap-1 border border-transparent transition-all", excludeRejected && "bg-rose-500/5 text-rose-600 border-rose-200 hover:bg-rose-500/10 hover:text-rose-700 dark:border-rose-800")}
            onClick={() => setExcludeRejected(!excludeRejected)}
          >
            {excludeRejected ? <XCircle className="h-3 w-3" /> : <Filter className="h-3 w-3" />}
            不合格除外
          </Button>

          {activeFilterCount > 0 && (
            <button
              onClick={() => { setStatusFilter("all"); setIndustryFilter("all"); setMinPriority(0); setExcludeRejected(false); }}
              className="text-[10px] text-muted-foreground hover:text-foreground font-medium px-1.5 transition-colors"
            >
              リセット
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div className="border border-border rounded-lg">
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center">
              <Search className="h-5 w-5 text-muted-foreground/30" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {companies.length === 0 ? "まだ企業が登録されていません" : "一致する企業がありません"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {companies.length === 0 ? "「新規追加」ボタンから就職活動の管理を始めましょう！" : "検索キーワードやフィルター設定を確認してください"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {[
                    { field: "name" as SortField, label: "企業名", hide: "" },
                    { field: "status" as SortField, label: "ステータス", hide: "" },
                    { field: "industry" as SortField, label: "業界", hide: "hidden sm:table-cell" },
                    { field: "priority" as SortField, label: "優先度", hide: "hidden sm:table-cell" },
                    ...taskCategories.map(cat => ({
                      field: `cat_${cat}` as SortField,
                      label: cat,
                      hide: "hidden md:table-cell",
                    })),
                    { field: "event" as SortField, label: "次のイベント", hide: "hidden lg:table-cell" },
                    { field: "deadline" as SortField, label: "締め切り", hide: "hidden lg:table-cell" },
                    { field: "result" as SortField, label: "結果通知", hide: "hidden xl:table-cell" },
                  ].map(col => (
                    <th
                      key={col.field}
                      className={cn(
                        "group/th text-left px-3 py-2 font-medium text-muted-foreground text-xs cursor-pointer hover:bg-muted/50 transition-colors select-none whitespace-nowrap",
                        col.field === "name" && "w-52",
                        col.hide
                      )}
                      onClick={() => handleSort(col.field)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        <SortIcon field={col.field} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((company) => {
                  const nextEvent = getNextEvent(company);
                  const nextDeadline = getNextDeadline(company);
                  const isRejected = company.status === "不合格" || company.status === "辞退";

                  return (
                    <tr
                      key={company.slug}
                      onClick={() => router.push(`/companies/${company.slug}`)}
                      className={cn(
                        "border-b border-border/50 last:border-b-0 transition-colors cursor-pointer group",
                        isRejected
                          ? "opacity-45 hover:opacity-70 hover:bg-muted/20"
                          : "hover:bg-muted/40"
                      )}
                    >
                      {/* 企業名 */}
                      <td className="px-3 py-2.5 whitespace-nowrap w-52">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 transition-transform group-hover:scale-110",
                              company.priority >= 4
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                                : company.priority >= 2
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                                  : "bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400"
                            )}
                          >
                            {company.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate max-w-44 group-hover:text-primary transition-colors">
                              {company.name}
                            </p>
                            {company.location && (
                              <p className="text-[10px] text-muted-foreground truncate leading-none mt-0.5 max-w-44">
                                {company.location}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ステータス */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <StatusBadge status={company.status} />
                      </td>

                      {/* 業界 */}
                      <td className="px-3 py-2.5 whitespace-nowrap hidden sm:table-cell">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/50 text-xs font-medium text-muted-foreground">
                          {company.industry}
                        </span>
                      </td>

                      {/* 優先度 */}
                      <td className="px-3 py-2.5 whitespace-nowrap hidden sm:table-cell">
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={cn(
                                "h-1.5 w-1.5 rounded-full transition-colors",
                                i < company.priority
                                  ? company.priority >= 4 ? "bg-amber-500" : company.priority >= 2 ? "bg-primary" : "bg-slate-400"
                                  : "bg-slate-200 dark:bg-slate-700"
                              )}
                            />
                          ))}
                          <span className="text-[10px] text-muted-foreground ml-1 font-medium">{company.priority}</span>
                        </div>
                      </td>

                      {/* カテゴリ別タスクステータス */}
                      {taskCategories.map(cat => {
                        const { status, deadline, title, titleTaskId, deadlineTaskId } = getCategoryInfo(company, cat);
                        return (
                          <td key={cat} className="px-3 py-2.5 whitespace-nowrap hidden md:table-cell">
                            {status === "none" ? (
                              <span className="text-xs text-muted-foreground/30">—</span>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                {title && (
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 max-w-[160px] text-left hover:opacity-80"
                                    title={title}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (titleTaskId) {
                                        navigateToTask(company.slug, titleTaskId);
                                      }
                                    }}
                                  >
                                    {status === "完了" ? (
                                      <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                                    ) : status === "進行中" ? (
                                      <Clock className="h-3 w-3 shrink-0 text-blue-500" />
                                    ) : (
                                      <Circle className="h-3 w-3 shrink-0 text-slate-400" />
                                    )}
                                    <span className="text-[10px] text-foreground/80 truncate">{title}</span>
                                  </button>
                                )}
                                {deadline && (
                                  <button
                                    type="button"
                                    className={cn(
                                      "text-[10px] font-medium pl-0.5 text-left hover:opacity-80",
                                      isFuzzyDatePassed(deadline) ? "text-rose-500" : "text-muted-foreground"
                                    )}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const targetTaskId = deadlineTaskId || titleTaskId;
                                      if (targetTaskId) {
                                        navigateToTask(company.slug, targetTaskId);
                                      }
                                    }}
                                  >
                                    締切: {formatDate(deadline)}
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* 次のイベント */}
                      <td className="px-3 py-2.5 whitespace-nowrap hidden lg:table-cell">
                        {nextEvent ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-purple-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate max-w-[120px]">{nextEvent.title}</p>
                              <p className="text-[10px] text-purple-500 font-medium leading-none mt-0.5">{formatDate(nextEvent.date)}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/30">—</span>
                        )}
                      </td>

                      {/* 締め切り */}
                      <td className="px-3 py-2.5 whitespace-nowrap hidden lg:table-cell">
                        {nextDeadline ? (
                          <div className="flex items-center gap-1.5">
                            <Bell className="h-3 w-3 text-blue-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate max-w-[120px]">{nextDeadline.title}</p>
                              <p className="text-[10px] text-blue-500 font-medium leading-none mt-0.5">{formatDate(nextDeadline.deadline)}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/30">—</span>
                        )}
                      </td>

                      {/* 結果通知 */}
                      <td className="px-3 py-2.5 whitespace-nowrap hidden xl:table-cell">
                        {company.expectedResultPeriod ? (
                          <div className={cn("flex items-center gap-1.5", isFuzzyDatePassed(company.expectedResultPeriod) && "opacity-40 line-through")}>
                            <Flag className={cn("h-3 w-3 shrink-0", isFuzzyDatePassed(company.expectedResultPeriod) ? "text-muted-foreground" : "text-orange-500")} />
                            <span className={cn("text-xs font-medium", isFuzzyDatePassed(company.expectedResultPeriod) ? "text-muted-foreground" : "text-orange-600 dark:text-orange-400")}>
                              {company.expectedResultPeriod}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/30">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="border-t border-border px-3 py-1.5 flex items-center justify-between bg-muted/20">
            <p className="text-[10px] text-muted-foreground font-medium">
              {filtered.length} 件 {filtered.length !== companies.length && `/ ${companies.length} 件中`}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {sortLabel[sortField]}{sortDir === "asc" ? "↑" : "↓"} で並べ替え
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
