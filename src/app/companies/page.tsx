"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Search, LayoutGrid, List, Loader2, Building2, MapPin, Tag, Filter, CheckCircle2, XCircle, Clock } from "lucide-react";
import { FlexibleDateInput } from "@/components/ui/flexible-date-input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { StatusBadge, TagBadge, statusColors } from "@/components/badges";
import { cn, isFuzzyDatePassed } from "@/lib/utils";
import { toast } from "sonner";
import type { Company, AppConfig, Task } from "@/types";
import { useCompanies, useTasks, useConfig } from "@/hooks/use-api";

export default function CompaniesPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";

  const { companies, mutate: mutateCompanies } = useCompanies();
  const { config } = useConfig();
  const { tasks } = useTasks();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("priority");
  const [excludeRejected, setExcludeRejected] = useState(false);
  const [minPriority, setMinPriority] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: "",
    industry: "",
    url: "",
    mypageUrl: "",
    loginId: "",
    password: "",
    location: "",
    priority: 3,
    expectedResultPeriod: "",
  });

  // Update industry default when config loads
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

  const filtered = companies
    .filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .filter((c) => {
      if (statusFilter !== "all") return c.status === statusFilter;
      return true;
    })
    .filter((c) => {
      if (industryFilter !== "all") return c.industry === industryFilter;
      return true;
    })
    .filter((c) => {
      if (excludeRejected) return c.status !== "不合格";
      return true;
    })
    .filter((c) => {
      if (minPriority > 0) return c.priority >= minPriority;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "priority") return b.priority - a.priority || a.name.localeCompare(b.name);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "deadline") {
        const aTasks = tasks.filter(t => t.companySlug === a.slug && t.status !== "完了" && t.deadline);
        const bTasks = tasks.filter(t => t.companySlug === b.slug && t.status !== "完了" && t.deadline);
        const aDeadline = aTasks.sort((t1, t2) => t1.deadline.localeCompare(t2.deadline))[0]?.deadline || "9999-12-31";
        const bDeadline = bTasks.sort((t1, t2) => t1.deadline.localeCompare(t2.deadline))[0]?.deadline || "9999-12-31";
        return aDeadline.localeCompare(bDeadline) || b.priority - a.priority;
      }
      return 0;
    });

  const allStatuses = config?.defaultStages || [];
  const allIndustries = config?.industries || [];

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Compact Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-card p-4 px-8 shadow-lg shadow-primary/5 flex items-center justify-between">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 h-32 w-32 rounded-full bg-primary/10 blur-[40px]" />

        <div className="relative flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              企業一覧
            </h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
              Currently managing <span className="text-primary">{companies.length}</span> companies
            </p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl h-10 px-4 font-bold shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all">
              <Plus className="mr-2 h-4 w-4" />
              新規企業
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">新しい企業を追加</DialogTitle>
              <DialogDescription>
                志望する企業の基本情報を入力してください
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="font-bold ml-1">企業名 <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  value={newCompany.name}
                  onChange={(e) =>
                    setNewCompany({ ...newCompany, name: e.target.value })
                  }
                  placeholder="株式会社サンプル"
                  className="rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="industry" className="font-bold ml-1">業界</Label>
                  <Select
                    value={newCompany.industry}
                    onValueChange={(value) =>
                      setNewCompany({ ...newCompany, industry: value })
                    }
                  >
                    <SelectTrigger id="industry" className="rounded-xl">
                      <SelectValue placeholder="選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {allIndustries.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location" className="font-bold ml-1">所在地</Label>
                  <Input
                    id="location"
                    value={newCompany.location}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, location: e.target.value })
                    }
                    placeholder="例: 東京都"
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="url" className="font-bold ml-1">企業URL</Label>
                  <Input
                    id="url"
                    value={newCompany.url}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, url: e.target.value })
                    }
                    placeholder="https://example.com"
                    className="rounded-xl"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priority" className="font-bold ml-1">優先度 (1-5)</Label>
                  <Select
                    value={newCompany.priority.toString()}
                    onValueChange={(value) =>
                      setNewCompany({ ...newCompany, priority: parseInt(value) })
                    }
                  >
                    <SelectTrigger id="priority" className="rounded-xl">
                      <SelectValue placeholder="選択" />
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
              <div className="grid gap-2">
                <Label htmlFor="expectedResultPeriod" className="font-bold ml-1">結果通知予定</Label>
                <FlexibleDateInput
                  value={newCompany.expectedResultPeriod}
                  onChange={(val) => setNewCompany({ ...newCompany, expectedResultPeriod: val })}
                  placeholder="例: 2/17"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" disabled={isCreating} onClick={() => setDialogOpen(false)} className="transition-all">
                キャンセル
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isCreating}
                className="rounded-xl px-8 transition-all"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    追加中...
                  </>
                ) : (
                  "企業の登録"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col gap-4 glass p-4 rounded-2xl md:flex-row md:items-center">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="企業名・業界で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 border-none bg-background/50 focus-visible:bg-background rounded-xl h-11 transition-all duration-300 hover:bg-background/80"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={cn("w-full md:w-32 rounded-xl h-9 text-xs border-none bg-background/50 transition-all duration-200 cursor-pointer", statusFilter !== "all" && "ring-2 ring-primary/20")}>
              <SelectValue placeholder="状況" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全ステータス</SelectItem>
              {allStatuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={industryFilter} onValueChange={setIndustryFilter}>
            <SelectTrigger className={cn("w-full md:w-32 rounded-xl h-9 text-xs border-none bg-background/50 transition-all duration-200 cursor-pointer", industryFilter !== "all" && "ring-2 ring-primary/20")}>
              <SelectValue placeholder="業界" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全業界</SelectItem>
              {allIndustries.map((ind) => (
                <SelectItem key={ind} value={ind}>
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={minPriority.toString()} onValueChange={(v) => setMinPriority(parseInt(v))}>
            <SelectTrigger className={cn("w-full md:w-32 rounded-xl h-9 text-xs border-none bg-background/50 transition-all duration-200 cursor-pointer", minPriority > 0 && "ring-2 ring-primary/20")}>
              <SelectValue placeholder="優先度" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">全優先度</SelectItem>
              {[5, 4, 3, 2, 1].map((p) => (
                <SelectItem key={p} value={p.toString()}>★ {p}以上</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={excludeRejected ? "secondary" : "ghost"}
            size="sm"
            className={cn("rounded-xl h-9 px-3 text-xs gap-1.5 transition-all", excludeRejected && "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 hover:text-rose-700")}
            onClick={() => setExcludeRejected(!excludeRejected)}
          >
            {excludeRejected ? <XCircle className="h-3.5 w-3.5" /> : <Filter className="h-3.5 w-3.5" />}
            不合格を除外
          </Button>

          <div className="h-6 w-px bg-border/50 mx-1 hidden md:block" />

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-32 rounded-xl h-9 text-xs border-none bg-background/50 transition-all duration-200 cursor-pointer">
              <SelectValue placeholder="並べ替え" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">優先度順</SelectItem>
              <SelectItem value="deadline">締め切り順</SelectItem>
              <SelectItem value="name">五十音順</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 bg-background/50 p-1 rounded-xl h-9 border ml-auto">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-lg h-7 px-2 transition-all hover:bg-background/80"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-lg h-7 px-2 transition-all hover:bg-background/80"
              onClick={() => setViewMode("list")}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {filtered.length === 0 ? (
        <Card className="border-none glass">
          <CardContent className="py-20 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center">
              <Search className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {companies.length === 0 ? "まだ企業が登録されていません" : "一致する企業がありません"}
              </p>
              <p className="text-muted-foreground mt-1">
                {companies.length === 0 ? "「企業を追加」ボタンから就職活動の管理を始めましょう！" : "検索キーワードやフィルター設定を確認してください"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((company) => (
            <Link key={company.slug} href={`/companies/${company.slug}`} className="group">
              <Card className="hover-lift h-full border-none glass overflow-hidden relative flex flex-col group-hover:ring-2 group-hover:ring-primary/20 transition-all duration-500">
                {/* Subtle Background Gradient based on Priority */}
                <div className={cn(
                  "absolute inset-0 opacity-[0.03] dark:opacity-[0.07] transition-opacity duration-500 group-hover:opacity-[0.08] dark:group-hover:opacity-[0.12]",
                  company.priority >= 4 ? "bg-gradient-to-br from-amber-500 to-orange-600" :
                    company.priority >= 2 ? "bg-gradient-to-br from-blue-500 to-indigo-600" :
                      "bg-gradient-to-br from-slate-400 to-slate-600"
                )} />

                <CardHeader className="pb-1.5 px-4 pt-4 relative z-10 flex-grow">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-transform duration-500 group-hover:scale-110",
                      company.priority >= 4 ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" :
                        company.priority >= 2 ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" :
                          "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400"
                    )}>
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="shrink-0 scale-[0.8] origin-right">
                      <StatusBadge status={company.status} />
                    </div>
                  </div>

                  <div className="space-y-0">
                    <CardTitle className="text-base font-black tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                      {company.name}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                      <div className="flex items-center gap-1 text-[8px] font-bold text-muted-foreground uppercase tracking-wider transition-colors group-hover:text-primary">
                        <Tag className="h-2 w-2" />
                        {company.industry}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="px-4 pb-4 pt-1 mt-auto relative z-10">
                  {/* Next Deadline Section */}
                  <div className="mb-2.5 space-y-1">
                    {(() => {
                      const nextTask = tasks
                        .filter(t => t.companySlug === company.slug && t.status !== "完了" && t.deadline)
                        .sort((a, b) => a.deadline.localeCompare(b.deadline))[0];

                      if (!nextTask) return <div className="h-[38px]" />;

                      return (
                        <div className="flex flex-col gap-0.5 p-1.5 rounded-lg bg-primary/5 border border-primary/10 transition-colors group-hover:bg-primary/10">
                          <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-wider text-primary/70">
                            <span>Next Deadline</span>
                            <span className="text-primary">
                              {nextTask.deadline.split('T')[0]}
                            </span>
                          </div>
                          <p className="text-[10px] font-bold text-foreground line-clamp-1">
                            {nextTask.title}
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Expected Result Period Section */}
                  {company.expectedResultPeriod && (
                    <div className={cn(
                      "mb-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 transition-all",
                      isFuzzyDatePassed(company.expectedResultPeriod)
                        ? "bg-muted/30 border-transparent opacity-40 grayscale"
                        : "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20"
                    )}>
                      <Clock className={cn("h-3.5 w-3.5", isFuzzyDatePassed(company.expectedResultPeriod) ? "text-muted-foreground" : "text-orange-600 dark:text-orange-400")} />
                      <div className="flex flex-col">
                        <span className={cn("text-[7px] font-bold uppercase tracking-tighter leading-none", isFuzzyDatePassed(company.expectedResultPeriod) ? "text-muted-foreground" : "text-orange-600/70 dark:text-orange-400/70")}>Result Expected</span>
                        <span className={cn("text-[10px] font-black truncate leading-tight", isFuzzyDatePassed(company.expectedResultPeriod) ? "text-muted-foreground" : "text-orange-700 dark:text-orange-300")}>
                          {company.expectedResultPeriod}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="pt-2.5 border-t border-white/10 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "h-1 w-2 rounded-full transition-all duration-500",
                              i < company.priority
                                ? (company.priority >= 4 ? "bg-amber-500" : "bg-primary")
                                : "bg-slate-200 dark:bg-slate-800"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter">Priority</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-none glass overflow-hidden">
          <div className="divide-y divide-white/10 dark:divide-white/5">
            {filtered.map((company) => (
              <Link
                key={company.slug}
                href={`/companies/${company.slug}`}
                className="group flex flex-col gap-4 p-5 transition-all hover:bg-muted/50 dark:hover:bg-card md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-5">
                  <div className={`h-10 w-10 flex items-center justify-center rounded-xl font-bold text-white shadow-lg ${company.priority >= 4 ? "bg-amber-500" : company.priority >= 2 ? "bg-blue-500" : "bg-slate-400"}`}>
                    {company.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-lg font-bold group-hover:text-primary transition-colors">{company.name}</p>
                    <p className="text-sm font-medium text-muted-foreground">
                      {company.industry}
                      {company.location && <span className="mx-2 opacity-30">|</span>}
                      {company.location && company.location}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {(() => {
                    const nextTask = tasks
                      .filter(t => t.companySlug === company.slug && t.status !== "完了" && t.deadline)
                      .sort((a, b) => a.deadline.localeCompare(b.deadline))[0];

                    if (!nextTask) return <div className="hidden md:block w-32" />;

                    return (
                      <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-primary/5 border border-primary/10 w-48 overflow-hidden">
                        <div className="flex-grow min-w-0">
                          <p className="text-[10px] font-bold text-primary/70 uppercase tracking-tight">Next: {nextTask.deadline}</p>
                          <p className="text-xs font-bold text-foreground truncate">{nextTask.title}</p>
                        </div>
                      </div>
                    );
                  })()}

                  {company.expectedResultPeriod && (
                    <div className={cn(
                      "hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-sm w-44 transition-all",
                      isFuzzyDatePassed(company.expectedResultPeriod)
                        ? "bg-muted/30 border-transparent opacity-40 grayscale"
                        : "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20"
                    )}>
                      <Clock className={cn("h-3.5 w-3.5 shrink-0", isFuzzyDatePassed(company.expectedResultPeriod) ? "text-muted-foreground" : "text-orange-600 dark:text-orange-400")} />
                      <div className="flex flex-col min-w-0">
                        <span className={cn("text-[7px] font-bold uppercase tracking-tighter leading-none", isFuzzyDatePassed(company.expectedResultPeriod) ? "text-muted-foreground" : "text-orange-600/70 dark:text-orange-400/70")}>Result Expected</span>
                        <p className={cn("text-[10px] font-black truncate leading-tight", isFuzzyDatePassed(company.expectedResultPeriod) ? "text-muted-foreground" : "text-orange-700 dark:text-orange-300")}>
                          {company.expectedResultPeriod}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 self-end md:self-auto">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Status</p>
                      <p className="text-xs font-medium mt-1">{company.status}</p>
                    </div>
                    <div className="scale-110">
                      <StatusBadge status={company.status} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
