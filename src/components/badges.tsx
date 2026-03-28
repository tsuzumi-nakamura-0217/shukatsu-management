"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const statusColors: Record<string, string> = {
  // 企業選考ステータス
  "未応募": "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/40 dark:text-slate-500",
  "ES提出": "bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-300",
  "適性検査": "bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-300",
  "1次面接": "bg-zinc-800 text-zinc-100 border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900",
  "2次面接": "bg-zinc-800 text-zinc-100 border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900",
  "最終面接": "bg-zinc-950 text-zinc-50 border-zinc-950 dark:bg-zinc-50 dark:text-zinc-950 shadow-sm",
  "内定": "bg-zinc-950 text-zinc-50 border-zinc-950 dark:bg-zinc-50 dark:text-zinc-950 shadow-md ring-1 ring-zinc-500",
  "不合格": "bg-slate-100 text-slate-400 border-slate-200 line-through dark:bg-slate-800/20 dark:text-slate-600",
  "辞退": "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800/20 dark:text-slate-600",
  
  // タスクステータス
  "未着手": "bg-slate-100 text-slate-500 border-slate-200",
  "進行中": "bg-zinc-800 text-zinc-100 border-zinc-900",
  "完了": "bg-slate-200 text-slate-400 border-slate-300",
};


export function StatusBadge({ status }: { status: string }) {
  const isNaitei = status === "内定";

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-semibold px-2.5 py-0.5 transition-all duration-300",
        statusColors[status] || "bg-gray-100 text-gray-800",
        isNaitei && "ring-1 ring-emerald-400/50"
      )}
    >
      {status}
    </Badge>
  );
}


const tagColors: Record<string, string> = {
  blue: "bg-slate-100 text-slate-600 border-slate-200",
  green: "bg-slate-100 text-slate-600 border-slate-200",
  purple: "bg-zinc-800 text-zinc-100 border-zinc-900",
  orange: "bg-slate-200 text-slate-700 border-slate-300",
  red: "bg-slate-100 text-slate-500 border-slate-200",
  pink: "bg-slate-100 text-slate-500 border-slate-200",
  yellow: "bg-slate-200 text-slate-700 border-slate-300",
};

export function TagBadge({
  name,
  color = "blue",
}: {
  name: string;
  color?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium px-2 py-0",
        tagColors[color] || tagColors.blue
      )}
    >
      {name}
    </Badge>
  );
}
