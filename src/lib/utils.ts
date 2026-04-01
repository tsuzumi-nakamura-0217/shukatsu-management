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

/**
 * TiptapのJSON形式またはプレーンテキストからプレーンテキストを抽出するユーティリティ
 */
export function getPlainText(content: string | null | undefined): string {
  if (!content) return "";

  // 高速パス: JSONぽくない場合はすぐにテキストとして扱う
  if (!content.trim().startsWith('{')) {
    return content;
  }

  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object") {
      return getTiptapPlainText(parsed);
    }
  } catch {
    // JSONでない場合は通常の文字列として扱う
  }

  return content;
}

function getTiptapPlainText(node: any): string {
  let text = "";
  if (node.text) {
    text += node.text;
  }
  if (node.content && Array.isArray(node.content)) {
    for (const child of node.content) {
      const childText = getTiptapPlainText(child);
      if (childText) {
        text += childText + (child.type === 'paragraph' || child.type === 'heading' ? ' ' : '');
      }
    }
  }
  return text.trim();
}

/**
 * 曖昧な日付（"2/17", "2月17日"など）が既に過ぎているかどうかを判定するユーティリティ
 */
export function isFuzzyDatePassed(value: string | null | undefined): boolean {
  if (!value) return false;
  
  // 標準的な日付形式の試行
  const dateStr = value.toString();
  const dateParsed = new Date(dateStr);
  if (!Number.isNaN(dateParsed.getTime()) && dateStr.includes("-")) {
    return dateParsed < new Date();
  }

  // "2/17", "2月17日" などの数値（月/日）を抽出
  const now = new Date();
  const year = now.getFullYear();
  
  const match = dateStr.match(/(\d{1,2})[/\-月]\s*(\d{1,2})/);
  if (match) {
    const month = parseInt(match[1], 10) - 1;
    const day = parseInt(match[2], 10);
    
    // 現在の年の日付を生成
    // 時刻は現在の時刻を基準に比較するか、一日の終わり（23:59:59）にするかだが、
    // 就活の文脈では本日中ならセーフかもしれない。
    const target = new Date(year, month, day, 23, 59, 59);
    
    return target < now;
  }
  
  return false;
}
