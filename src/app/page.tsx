"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  CalendarClock,
  FileText,
  ListChecks,
  Loader2,
  RefreshCw,
} from "lucide-react";
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchStats(showRefreshing = false) {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

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
      setRefreshing(false);
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
      <div className="flex flex-col gap-4 rounded-3xl border border-white/60 bg-white/70 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl md:flex-row md:items-center md:justify-between dark:border-white/10 dark:bg-slate-900/65">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">ダッシュボード</h1>
            <p className="text-slate-600 dark:text-slate-300">
              企業応募から選考進捗まで、今日の状況をまとめて確認できます。
            </p>
          </div>
          <Button
            variant="outline"
            className="border-white/60 bg-white/70 text-slate-700 shadow-sm backdrop-blur hover:bg-white dark:border-white/15 dark:bg-slate-800/70 dark:text-slate-100"
            onClick={() => fetchStats(true)}
            disabled={loading || refreshing}
          >
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            更新
          </Button>
      </div>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="border-sky-100/80 bg-gradient-to-br from-white to-sky-50/75 dark:border-white/10 dark:from-slate-900 dark:to-slate-800/70">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-700 dark:text-slate-300">企業数</CardDescription>
              <CardTitle className="text-2xl text-slate-900 dark:text-white">{stats?.totalCompanies ?? 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <Briefcase className="h-3.5 w-3.5" />
                現在管理している企業
              </div>
            </CardContent>
        </Card>

        <Card className="border-sky-100/80 bg-gradient-to-br from-white to-sky-50/75 dark:border-white/10 dark:from-slate-900 dark:to-slate-800/70">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-700 dark:text-slate-300">タスク完了率</CardDescription>
              <CardTitle className="text-2xl text-slate-900 dark:text-white">{completionRate}%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-slate-700 dark:text-slate-300">
                {stats?.completedTasks ?? 0}/{stats?.totalTasks ?? 0} 件完了
              </div>
            </CardContent>
        </Card>

        <Card className="border-sky-100/80 bg-gradient-to-br from-white to-sky-50/75 dark:border-white/10 dark:from-slate-900 dark:to-slate-800/70">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-700 dark:text-slate-300">通過率</CardDescription>
              <CardTitle className="text-2xl text-slate-900 dark:text-white">{stats?.passRate ?? 0}%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-slate-700 dark:text-slate-300">選考結果が出た企業ベース</div>
            </CardContent>
        </Card>

        <Card className="border-sky-100/80 bg-gradient-to-br from-white to-sky-50/75 dark:border-white/10 dark:from-slate-900 dark:to-slate-800/70">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-700 dark:text-slate-300">面接総数</CardDescription>
              <CardTitle className="text-2xl text-slate-900 dark:text-white">{stats?.totalInterviews ?? 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-slate-700 dark:text-slate-300">
                通過 {stats?.interviewResultCounts.通過 ?? 0} / 不合格 {stats?.interviewResultCounts.不合格 ?? 0}
              </div>
            </CardContent>
        </Card>

        <Card className="border-sky-100/80 bg-gradient-to-br from-white to-sky-50/75 dark:border-white/10 dark:from-slate-900 dark:to-slate-800/70">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-700 dark:text-slate-300">ES件数</CardDescription>
              <CardTitle className="text-2xl text-slate-900 dark:text-white">{stats?.totalESDocuments ?? 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <FileText className="h-3.5 w-3.5" />
                登録済みエントリーシート
              </div>
            </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListChecks className="h-5 w-5" />
              近日締切タスク
            </CardTitle>
            <CardDescription>期限が近い未完了タスクを優先度順で確認</CardDescription>
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
                <div
                  key={task.id}
                  className="flex flex-col gap-2 rounded-2xl border border-white/60 bg-white/65 p-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-slate-900/60"
                >
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">{task.companyName || "企業未設定"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{task.category}</Badge>
                    <Badge variant="outline" className="font-medium">
                      {task.priority === "high"
                        ? "優先度: 高"
                        : task.priority === "low"
                        ? "優先度: 低"
                        : "優先度: 中"}
                    </Badge>
                    <Badge variant="secondary">{formatDate(task.deadline)}</Badge>
                  </div>
                </div>
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
                <div
                  key={interview.id}
                  className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/65 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/60"
                >
                  <div>
                    <p className="font-medium">{interview.companyName}</p>
                    <p className="text-sm text-muted-foreground">{interview.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{interview.result}</Badge>
                    <Badge variant="secondary">{formatDate(interview.date)}</Badge>
                  </div>
                </div>
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
                <div
                  key={status}
                  className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/65 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/60"
                >
                  <StatusBadge status={status} />
                  <span className="font-semibold">{count} 社</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
