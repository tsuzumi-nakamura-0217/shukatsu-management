"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  CalendarClock,
  FileText,
  ListChecks,
} from "lucide-react";
import { ExportButtons } from "@/components/export-buttons";
import { StatusBadge } from "@/components/badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Stats } from "@/types";

function formatDate(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchStats() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/stats");
      if (!response.ok) {
        throw new Error("ダッシュボードデータの取得に失敗しました");
      }

      const data = (await response.json()) as Stats;
      setStats(data);
    } catch {
      setError("ダッシュボードデータの取得に失敗しました。時間をおいて再試行してください。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  const completionRate = useMemo(() => {
    if (!stats || stats.totalTasks === 0) return 0;
    return Math.round((stats.completedTasks / stats.totalTasks) * 100);
  }, [stats]);

  const statusEntries = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.statusCounts).sort((a, b) => b[1] - a[1]);
  }, [stats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">ダッシュボード</h1>
            <p className="text-slate-600 dark:text-slate-300">
              企業応募から選考進捗まで、今日の状況をまとめて確認できます。
            </p>
          </div>
          <ExportButtons />
        </div>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Link href="/companies">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader className="pb-2">
                <CardDescription>企業数</CardDescription>
                <CardTitle className="text-2xl">{stats?.totalCompanies ?? 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5" />
                  現在管理している企業
                </div>
              </CardContent>
          </Card>
        </Link>

        <Link href="/tasks">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader className="pb-2">
                <CardDescription>タスク完了率</CardDescription>
                <CardTitle className="text-2xl">{completionRate}%</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  {stats?.completedTasks ?? 0}/{stats?.totalTasks ?? 0} 件完了
                </div>
              </CardContent>
          </Card>
        </Link>

        <Link href="/companies">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader className="pb-2">
                <CardDescription>通過率</CardDescription>
                <CardTitle className="text-2xl">{stats?.passRate ?? 0}%</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">選考結果が出た企業ベース</div>
              </CardContent>
          </Card>
        </Link>

        <Link href="/calendar">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader className="pb-2">
                <CardDescription>面接総数</CardDescription>
                <CardTitle className="text-2xl">{stats?.totalInterviews ?? 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  通過 {stats?.interviewResultCounts.通過 ?? 0} / 不合格 {stats?.interviewResultCounts.不合格 ?? 0}
                </div>
              </CardContent>
          </Card>
        </Link>

        <Link href="/companies">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader className="pb-2">
                <CardDescription>ES件数</CardDescription>
                <CardTitle className="text-2xl">{stats?.totalESDocuments ?? 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  登録済みエントリーシート
                </div>
              </CardContent>
          </Card>
        </Link>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListChecks className="h-5 w-5" />
              近日締切タスク
            </CardTitle>
            <CardDescription>期限が近い未完了タスクを確認</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">読み込み中...</div>
            ) : (stats?.upcomingDeadlines.length ?? 0) === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                近日締切のタスクはありません。
              </div>
            ) : (
              stats?.upcomingDeadlines.map((task) => (
                <Link
                  key={task.id}
                  href={`/companies/${task.companySlug}?tab=tasks`}
                  className="flex flex-col gap-2 rounded-xl border bg-background p-3 transition-colors hover:bg-accent sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">{task.companyName || "企業未設定"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{task.category}</Badge>
                    <Badge variant="secondary">{formatDate(task.deadline)}</Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarClock className="h-5 w-5" />
              近日面接
            </CardTitle>
            <CardDescription>今後予定されている面接</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">読み込み中...</div>
            ) : (stats?.upcomingInterviews.length ?? 0) === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                近日予定の面接はありません。
              </div>
            ) : (
              stats?.upcomingInterviews.map((interview) => (
                <Link
                  key={interview.id}
                  href={`/companies/${interview.companySlug}?tab=interviews`}
                  className="flex items-center justify-between rounded-xl border bg-background p-3 transition-colors hover:bg-accent"
                >
                  <div>
                    <p className="font-medium">{interview.companyName}</p>
                    <p className="text-sm text-muted-foreground">{interview.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{interview.result}</Badge>
                    <Badge variant="secondary">{formatDate(interview.date)}</Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ステータス別企業数</CardTitle>
            <CardDescription>選考段階ごとの分布</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">読み込み中...</div>
            ) : statusEntries.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                集計対象の企業がありません。
              </div>
            ) : (
              statusEntries.map(([status, count]) => (
                <Link
                  key={status}
                  href={`/companies?status=${encodeURIComponent(status)}`}
                  className="flex items-center justify-between rounded-xl border bg-background p-3 transition-colors hover:bg-accent"
                >
                  <StatusBadge status={status} />
                  <span className="font-semibold">{count} 社</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
