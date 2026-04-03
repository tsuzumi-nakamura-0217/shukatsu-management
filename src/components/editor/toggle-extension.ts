import { Node, mergeAttributes } from "@tiptap/react";

export const Toggle = Node.create({
  name: "toggle",

  group: "block",

  content: "toggleSummary toggleContent",

  defining: true,

  isolating: true,

  selectable: true,

  draggable: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (element) => element.hasAttribute("open"),
        renderHTML: (attributes) => {
          if (attributes.open) {
            return { open: "" };
          }
          return {};
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "details",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "details",
      mergeAttributes(HTMLAttributes, { class: "toggle-block" }),
      0,
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement("details");
      dom.classList.add("toggle-block");
      if (node.attrs.open) {
        dom.setAttribute("open", "");
      }

      // 概要（summary）部分のクリックをハンドルして開閉を切り替える
      dom.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        if (target.closest("summary")) {
          if (editor.isEditable) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof getPos === "function") {
              const isOpen = dom.hasAttribute("open");
              editor.commands.updateAttributes("toggle", { open: !isOpen });
            }
          }
        }
      });

      return {
        dom,
        contentDOM: dom,
      };
    };
  },
});

export const ToggleSummary = Node.create({
  name: "toggleSummary",

  content: "inline*",

  defining: true,

  isolating: true,

  parseHTML() {
    return [
      {
        tag: "summary",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "summary",
      mergeAttributes(HTMLAttributes, { class: "toggle-summary" }),
      0,
    ];
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { selection } = this.editor.state;
        const { empty, $anchor } = selection;

        if (!empty || $anchor.parentOffset !== 0) {
          return false;
        }

        return this.editor.commands.deleteNode("toggle");
      },
      Enter: ({ editor }) => {
        const { selection } = editor.state;
        const { $from } = selection;

        // If in summary, maybe go to content?
        // But default Enter behavior might be better.
        return false;
      },
    };
  },
});

export const ToggleContent = Node.create({
  name: "toggleContent",

  content: "block+",

  defining: true,

  isolating: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="toggle-content"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "toggle-content",
        class: "toggle-content",
      }),
      0,
    ];
  },
});
