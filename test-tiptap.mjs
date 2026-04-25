import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Mark, mergeAttributes } from "@tiptap/core";

const NOTION_TEXT_COLOR_ITEMS = [
  { key: "red", label: "赤", className: "text-red-600 dark:text-red-400" },
];

function getNotionTextColorClass(color) {
  if (color === 'red') return "text-red-600 dark:text-red-400";
  return null;
}

const TextColor = Mark.create({
  name: "textColor",
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-text-color"),
        renderHTML: (attributes) => {
          const color = attributes.color;
          const className = getNotionTextColorClass(color);
          if (!color || !className) return {};
          return {
            "data-text-color": color,
            class: className,
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
      setTextColor: (color) => ({ commands }) => commands.setMark(this.name, { color }),
      unsetTextColor: () => ({ commands }) => commands.unsetMark(this.name),
    };
  },
});

const editor = new Editor({
  extensions: [StarterKit, TextColor],
  content: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Hello world" }
        ]
      }
    ]
  },
});

editor.chain().selectAll().setTextColor('red').run();
console.log("JSON Output:", JSON.stringify(editor.getJSON(), null, 2));
