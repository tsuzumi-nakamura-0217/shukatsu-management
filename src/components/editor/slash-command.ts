import { Extension } from "@tiptap/react";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import type { Editor } from "@tiptap/react";

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  command: (editor: Editor) => void;
}

// 画像挿入のためのコールバックを外部から注入できるようにする
let externalImageUpload: (() => void) | null = null;
export function setImageUploadHandler(handler: () => void) {
  externalImageUpload = handler;
}

export const slashCommandItems: SlashCommandItem[] = [
  {
    title: "見出し1",
    description: "大きな見出し",
    icon: "H1",
    command: (editor) => {
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    },
  },
  {
    title: "見出し2",
    description: "中くらいの見出し",
    icon: "H2",
    command: (editor) => {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    },
  },
  {
    title: "見出し3",
    description: "小さな見出し",
    icon: "H3",
    command: (editor) => {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    },
  },
  {
    title: "箇条書き",
    description: "箇条書きリスト",
    icon: "•",
    command: (editor) => {
      editor.chain().focus().toggleBulletList().run();
    },
  },
  {
    title: "番号リスト",
    description: "番号付きリスト",
    icon: "1.",
    command: (editor) => {
      editor.chain().focus().toggleOrderedList().run();
    },
  },
  {
    title: "引用",
    description: "引用ブロック",
    icon: "❝",
    command: (editor) => {
      editor.chain().focus().toggleBlockquote().run();
    },
  },
  {
    title: "区切り線",
    description: "水平区切り線",
    icon: "―",
    command: (editor) => {
      editor.chain().focus().setHorizontalRule().run();
    },
  },
  {
    title: "テーブル",
    description: "3×3 テーブル",
    icon: "⊞",
    command: (editor) => {
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
  },
  {
    title: "画像",
    description: "画像をアップロード",
    icon: "🖼",
    command: () => {
      if (externalImageUpload) {
        externalImageUpload();
      }
    },
  },
  {
    title: "2カラム",
    description: "2列レイアウト",
    icon: "▥",
    command: (editor) => {
      editor
        .chain()
        .focus()
        .insertColumns(2)
        .run();
    },
  },
  {
    title: "3カラム",
    description: "3列レイアウト",
    icon: "▦",
    command: (editor) => {
      editor
        .chain()
        .focus()
        .insertColumns(3)
        .run();
    },
  },
  {
    title: "コードブロック",
    description: "コードブロック",
    icon: "<>",
    command: (editor) => {
      editor.chain().focus().toggleCodeBlock().run();
    },
  },
  {
    title: "トグル",
    description: "開閉可能なブロック",
    icon: "▶",
    command: (editor) => {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "toggle",
          content: [
            {
              type: "toggleSummary",
              content: [{ type: "text", text: "トグル" }],
            },
            {
              type: "toggleContent",
              content: [{ type: "paragraph" }],
            },
          ],
        })
        .run();
    },
  },
];

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: { from: number; to: number };
          props: SlashCommandItem;
        }) => {
          // Delete the slash command text first
          editor.chain().focus().deleteRange(range).run();
          // Then execute the command
          props.command(editor);
        },
        items: ({ query }: { query: string }) => {
          return slashCommandItems.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
          );
        },
      } satisfies Partial<SuggestionOptions>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
