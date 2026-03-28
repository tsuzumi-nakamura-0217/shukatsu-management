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
