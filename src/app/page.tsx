"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  Briefcase,
  CalendarClock,
  FileText,
  ListChecks,
} from "lucide-react";
import { ExportButtons } from "@/components/export-buttons";
import { StatusBadge, TagBadge } from "@/components/badges";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useStats } from "@/hooks/use-api";


export default function Home() {
  const { stats, isLoading, error: fetchError } = useStats();
  const [greeting, setGreeting] = useState("こんにちは");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting("おはようございます");
    else if (hour >= 12 && hour < 18) setGreeting("こんにちは");
    else setGreeting("こんばんは");
  }, []);

  const completionRate = useMemo(() => {
    if (!stats || stats.totalTasks === 0) return 0;
    return Math.round((stats.completedTasks / stats.totalTasks) * 100);
  }, [stats]);

  const statusEntries = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.statusCounts).sort((a, b) => b[1] - a[1]);
  }, [stats]);

  const error = fetchError ? "ダッシュボードデータの取得に失敗しました。時間をおいて再試行してください。" : null;

  return (
    <div className="space-y-6 pb-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">

        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {greeting}！
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              企業応募から選考進捗まで、今日の状況をまとめて確認しましょう。
              あなたの就職活動を全力でサポートします。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ExportButtons />
          </div>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5 animate-in fade-in slide-in-from-top-4 duration-500">
          <CardContent className="pt-6 text-sm text-destructive font-medium flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link href="/companies" className="group">
          <Card className="hover-lift h-full border-none glass overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-medium">企業数</CardDescription>
                <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                  <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold">
                {isLoading ? (
                  <div className="h-9 w-16 rounded-md bg-muted animate-pulse" />
                ) : (
                  stats?.totalCompanies ?? 0
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                現在管理している企業
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/tasks" className="group">
          <Card className="hover-lift h-full border-none glass overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-medium">タスク完了率</CardDescription>
                <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/30">
                  <ListChecks className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold">
                {isLoading ? (
                  <div className="h-9 w-16 rounded-md bg-muted animate-pulse" />
                ) : (
                  `${completionRate}%`
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-full rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-1000"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {stats?.completedTasks ?? 0}/{stats?.totalTasks ?? 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/companies" className="group">
          <Card className="hover-lift h-full border-none glass overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-medium">通過率</CardDescription>
                <div className="rounded-full bg-violet-100 p-2 dark:bg-violet-900/30">
                  <Badge variant="outline" className="h-4 border-none p-0">
                    <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 mt-0.5 whitespace-nowrap">PASS</span>
                  </Badge>
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-glow">
                {isLoading ? (
                  <div className="h-9 w-16 rounded-md bg-muted animate-pulse" />
                ) : (
                  `${stats?.passRate ?? 0}%`
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">選考結果が出た企業ベース</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/calendar" className="group">
          <Card className="hover-lift h-full border-none glass overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-medium">面接総数</CardDescription>
                <div className="rounded-full bg-sky-100 p-2 dark:bg-sky-900/30">
                  <CalendarClock className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold">
                {isLoading ? (
                  <div className="h-9 w-16 rounded-md bg-muted animate-pulse" />
                ) : (
                  stats?.totalInterviews ?? 0
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
                {Object.entries(stats?.interviewResultCounts || {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([status, count]) => {
                    const isPass = ["通過", "内定", "合格"].includes(status);
                    const isFail = ["不合格", "辞退", "お見送り"].includes(status);
                    return (
                      <span
                        key={status}
                        className={
                          isPass
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isFail
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-sky-600 dark:text-sky-400"
                        }
                      >
                        {status} {count}
                      </span>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/companies" className="group">
          <Card className="hover-lift h-full border-none glass overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-medium">ES件数</CardDescription>
                <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/30">
                  <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold">
                {isLoading ? (
                  <div className="h-9 w-16 rounded-md bg-muted animate-pulse" />
                ) : (
                  stats?.totalESDocuments ?? 0
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">登録済みエントリーシート</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Recent Tasks */}
        <div className="lg:col-span-12 xl:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              近日締切タスク
            </h2>
            <Link href="/tasks" className="text-sm font-medium text-primary hover:underline">すべて見る</Link>
          </div>
          <Card className="border-none glass">
            <CardContent className="pt-6 space-y-3">
              {isLoading ? (
                <div className="py-6 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 rounded-2xl bg-background/50 p-4">
                      <div className="hidden sm:flex h-10 w-10 rounded-xl bg-muted animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-48 rounded bg-muted animate-pulse" />
                        <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                      </div>
                      <div className="h-6 w-20 rounded bg-muted animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (stats?.upcomingDeadlines.length ?? 0) === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <ListChecks className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">近日締切のタスクはありません。</p>
                </div>
              ) : (
                stats?.upcomingDeadlines.map((task) => (
                  <Link
                    key={task.id}
                    href={`/companies/${task.companySlug}?tab=tasks`}
                    className="group flex flex-col gap-3 rounded-2xl border border-transparent bg-background/50 p-4 transition-all hover:bg-muted/50 dark:hover:bg-card hover:border-border hover:shadow-lg sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground group-hover:text-primary transition-colors">{task.title}</p>
                        <p className="text-sm text-muted-foreground font-medium">{task.companyName || "企業未設定"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <TagBadge name={task.category} color="blue" />
                      <div className="px-3 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-bold ring-1 ring-rose-200 dark:ring-rose-800/50">
                        {formatDate(task.deadline)}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-12 xl:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-secondary" />
              近日面接
            </h2>
            <Link href="/calendar" className="text-sm font-medium text-secondary hover:underline">カレンダーを表示</Link>
          </div>
          <Card className="border-none glass">
            <CardContent className="pt-6 space-y-3">
              {isLoading ? (
                <div className="py-6 space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between rounded-2xl bg-background/50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
                        <div className="space-y-2">
                          <div className="h-4 w-36 rounded bg-muted animate-pulse" />
                          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                        </div>
                      </div>
                      <div className="h-5 w-20 rounded bg-muted animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (stats?.upcomingInterviews.length ?? 0) === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <CalendarClock className="h-6 w-6 opacity-40" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">近日予定の面接はありません。</p>
                </div>
              ) : (
                stats?.upcomingInterviews.map((interview) => (
                  <Link
                    key={interview.id}
                    href={`/companies/${interview.companySlug}?tab=interviews`}
                    className="group flex items-center justify-between rounded-2xl border border-transparent bg-background/50 p-4 transition-all hover:bg-muted/50 dark:hover:bg-card hover:border-border hover:shadow-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                      <div>
                        <p className="font-bold group-hover:text-sky-600 transition-colors">{interview.companyName}</p>
                        <p className="text-xs font-medium text-muted-foreground">{interview.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-foreground">{formatDate(interview.date)}</p>
                      <TagBadge name={interview.result || "未完了"} color={interview.result === "通過" ? "green" : "blue"} />
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status Distribution */}
        <div className="lg:col-span-12 space-y-4">
          <div className="flex items-center px-2">
            <h2 className="text-xl font-bold">選考状況の分布</h2>
          </div>
          <Card className="border-none glass">
            <CardContent className="pt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {isLoading ? (
                <div className="col-span-full py-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between rounded-2xl bg-background/50 p-4">
                      <div className="h-6 w-20 rounded bg-muted animate-pulse" />
                      <div className="h-6 w-12 rounded bg-muted animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : statusEntries.length === 0 ? (
                <div className="col-span-full py-12 text-center text-sm text-muted-foreground">集計対象の企業がありません。</div>
              ) : (
                statusEntries.map(([status, count]) => (
                  <Link
                    key={status}
                    href={`/companies?status=${encodeURIComponent(status)}`}
                    className="flex items-center justify-between rounded-2xl border border-transparent bg-background/50 p-4 transition-all hover:bg-muted/50 dark:hover:bg-card hover:border-border hover:shadow-lg group shadow-sm"
                  >
                    <StatusBadge status={status} />
                    <span className="text-xl font-black group-hover:text-primary transition-colors">{count} <span className="text-xs font-medium text-muted-foreground">社</span></span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
