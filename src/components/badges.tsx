"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  "未応募": "bg-gray-100 text-gray-800 border-gray-200",
  "ES提出": "bg-blue-100 text-blue-800 border-blue-200",
  "適性検査": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "1次面接": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "2次面接": "bg-orange-100 text-orange-800 border-orange-200",
  "最終面接": "bg-purple-100 text-purple-800 border-purple-200",
  "内定": "bg-green-100 text-green-800 border-green-200",
  "不合格": "bg-red-100 text-red-800 border-red-200",
  "辞退": "bg-slate-100 text-slate-800 border-slate-200",
};


export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        statusColors[status] || "bg-gray-100 text-gray-800"
      )}
    >
      {status}
    </Badge>
  );
}


const tagColors: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  green: "bg-green-50 text-green-700 border-green-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  red: "bg-red-50 text-red-700 border-red-200",
  pink: "bg-pink-50 text-pink-700 border-pink-200",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
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
        "text-xs font-normal",
        tagColors[color] || tagColors.blue
      )}
    >
      {name}
    </Badge>
  );
}
