import { Node, Extension, mergeAttributes } from "@tiptap/react";

// ── Columns (container) ────────────────────────
export const Columns = Node.create({
  name: "columns",

  group: "block",

  content: "column+",

  defining: true,

  isolating: true,

  addAttributes() {
    return {
      count: {
        default: 2,
        parseHTML: (element) => {
          return parseInt(element.getAttribute("data-columns") || "2", 10);
        },
        renderHTML: (attributes) => {
          return { "data-columns": attributes.count };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="columns"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "columns",
        class: "columns-layout",
      }),
      0,
    ];
  },
});

// ── Column (individual column) ─────────────────
export const Column = Node.create({
  name: "column",

  content: "block+",

  defining: true,

  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "column",
        class: "column-block",
      }),
      0,
    ];
  },
});

// ── Commands ───────────────────────────────────
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    columns: {
      insertColumns: (count: number) => ReturnType;
    };
  }
}

// Extension that adds the insertColumns command
export const ColumnsCommand = Extension.create({
  name: "columnsCommand",

  addCommands() {
    return {
      insertColumns:
        (count: number) =>
        ({ chain }) => {
          const columnContent = Array.from({ length: count }, () => ({
            type: "column",
            content: [{ type: "paragraph" }],
          }));

          return chain()
            .insertContent({
              type: "columns",
              attrs: { count },
              content: columnContent,
            })
            .run();
        },
    };
  },
});

