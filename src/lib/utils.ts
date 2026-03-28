import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 文字数をカウントするユーティリティ
 * TiptapのJSON形式またはプレーンテキストに対応
 */
export function countCharacters(content: string | null | undefined): number {
  if (!content) return 0;

  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object") {
      return countTiptapCharacters(parsed);
    }
  } catch {
    // JSONでない場合は通常の文字列としてカウント
  }

  return content.length;
}

function countTiptapCharacters(node: any): number {
  let count = 0;
  if (node.text) {
    count += node.text.length;
  }
  if (node.content && Array.isArray(node.content)) {
    for (const child of node.content) {
      count += countTiptapCharacters(child);
    }
  }
  return count;
}

/**
 * TiptapのJSON形式から見出しごとの文字数を抽出するユーティリティ
 */
export function getSectionCharacterCounts(content: string | null | undefined): { title: string, count: number }[] {
  if (!content) return [];

  try {
    const parsed = JSON.parse(content);
    if (!parsed || parsed.type !== "doc" || !Array.isArray(parsed.content)) {
      return [];
    }

    const sections: { title: string, count: number }[] = [];
    let currentSection: { title: string, count: number } | null = null;

    for (const node of parsed.content) {
      if (node.type === "heading") {
        const title = node.content?.map((c: any) => c.text || "").join("") || "見出し";
        currentSection = { title, count: 0 };
        sections.push(currentSection);
      } else if (currentSection) {
        currentSection.count += countTiptapCharacters(node);
      }
    }

    return sections;
  } catch {
    return [];
  }
}

/**
 * 日付と時刻を指定された形式でフォーマットするユーティリティ
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  
  // ISO形式 (YYYY-MM-DDTHH:mm) かどうか、またはスペースとコロンを含むかチェック
  const hasTime = value.includes("T") || (value.includes(" ") && value.includes(":"));
  
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    ...(hasTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}
