import { Mark, mergeAttributes } from "@tiptap/react";

/**
 * ツールバーのプレビュー用に CSS class を保持。
 * エディタ内の実際の着色は globals.css の
 * `span[data-text-color="..."]` セレクタで行う。
 */
export const NOTION_TEXT_COLOR_ITEMS = [
  { key: "muted", label: "グレー", className: "notion-tc-muted" },
  { key: "red", label: "赤", className: "notion-tc-red" },
  { key: "orange", label: "オレンジ", className: "notion-tc-orange" },
  { key: "yellow", label: "イエロー", className: "notion-tc-yellow" },
  { key: "green", label: "グリーン", className: "notion-tc-green" },
  { key: "blue", label: "ブルー", className: "notion-tc-blue" },
  { key: "purple", label: "パープル", className: "notion-tc-purple" },
] as const;

export type NotionTextColorKey = (typeof NOTION_TEXT_COLOR_ITEMS)[number]["key"];

/** ツールバーのカラープレビュー用 CSS クラス */
const TEXT_COLOR_CLASS_BY_KEY: Record<NotionTextColorKey, string> = {
  muted: "notion-tc-muted",
  red: "notion-tc-red",
  orange: "notion-tc-orange",
  yellow: "notion-tc-yellow",
  green: "notion-tc-green",
  blue: "notion-tc-blue",
  purple: "notion-tc-purple",
};

export function getNotionTextColorClass(
  color: string | null | undefined
): string | null {
  if (!color) return null;
  if (color in TEXT_COLOR_CLASS_BY_KEY) {
    return TEXT_COLOR_CLASS_BY_KEY[color as NotionTextColorKey];
  }
  return null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textColor: {
      setTextColor: (color: NotionTextColorKey) => ReturnType;
      unsetTextColor: () => ReturnType;
    };
  }
}

export const TextColor = Mark.create({
  name: "textColor",

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-text-color"),
        renderHTML: (attributes) => {
          const color = attributes.color as string | null | undefined;
          if (!color) return {};
          return {
            "data-text-color": color,
          };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-text-color]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setTextColor:
        (color) =>
        ({ commands }) => {
          return commands.setMark(this.name, { color });
        },
      unsetTextColor:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});
