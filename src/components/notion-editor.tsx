"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Highlight } from "@tiptap/extension-highlight";
import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef, useState } from "react";
import type { ESComment } from "@/types";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Table as TableIcon,
  ImagePlus,
  Undo,
  Redo,
  Code,
  Quote,
  Minus,
  Pilcrow,
  TableCellsMerge,
  Plus,
  Trash2,
  Columns2,
  Columns3,
  ChevronDown,
  MessageSquarePlus,
} from "lucide-react";

// Editor extensions
import { ResizableImage } from "./editor/resizable-image";
import { Columns, Column, ColumnsCommand } from "./editor/column-extension";
import { Toggle, ToggleSummary, ToggleContent } from "./editor/toggle-extension";
import {
  SlashCommand,
  setImageUploadHandler,
  slashCommandItems,
} from "./editor/slash-command";
import { SlashCommandList } from "./editor/slash-command-list";
import type { SlashCommandItem } from "./editor/slash-command";

import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={(e) => {
        // エディタの選択状態（フォーカス）が外れるのを防ぐ
        e.preventDefault();
      }}
      disabled={disabled}
      title={title}
      className={`notion-toolbar-btn ${isActive ? "is-active" : ""}`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="notion-toolbar-divider" />;
}

// ── メインエディタ ──────────────────────────────
export interface EditorSelectionInfo {
  text: string;
  from: number;
  to: number;
}

export interface NotionEditorHandle {
  getSelectionInfo: () => EditorSelectionInfo | null;
  applyCommentHighlights: (comments: ESComment[]) => void;
  scrollToPosition: (from: number) => void;
  addCommentHighlight: (from: number, to: number, commentId: string) => void;
  removeCommentHighlight: (commentId: string) => void;
}

interface NotionEditorProps {
  content: string;
  onChange: (json: string) => void;
  readOnly?: boolean;
  comments?: ESComment[];
  onAddCommentClick?: () => void;
  activeCommentId?: string | null;
}

export const NotionEditor = forwardRef<NotionEditorHandle, NotionEditorProps>(function NotionEditorInner({ content, onChange, readOnly = false, comments, onAddCommentClick, activeCommentId }, ref) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInternalUpdate = useRef(false);

  // JSON or plain-text → Tiptap content の解析
  const parseContent = useCallback((raw: string) => {
    if (!raw) return { type: "doc" as const, content: [] };
    
    // 高速パス: JSONぽくない場合はすぐにテキストとして扱う
    if (!raw.trim().startsWith('{')) {
      return convertPlainTextToDoc(raw);
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.type === "doc") return parsed;
    } catch {
      // JSON形式だがdocタイプでない、またはパース失敗
    }
    
    return convertPlainTextToDoc(raw);
  }, []);

  const convertPlainTextToDoc = (text: string) => {
    const paragraphs = text.split("\n").map((line) => ({
      type: "paragraph" as const,
      content: line ? [{ type: "text" as const, text: line }] : [],
    }));
    return { type: "doc" as const, content: paragraphs };
  };

  // editorRefで最新のeditorインスタンスを常に参照できるようにする
  const editorRef = useRef<any>(null);

  // 画像ファイル → base64 → エディタに挿入
  const insertImageFromFile = useCallback(
    (file: File) => {
      const ed = editorRef.current;
      if (!ed) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        ed.chain().focus().setImage({ src: base64 }).run();
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const [, forceUpdate] = useState({});

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      ResizableImage,
      Columns,
      Column,
      ColumnsCommand,
      Toggle,
      ToggleSummary,
      ToggleContent,
      Highlight.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            commentId: {
              default: null,
              parseHTML: element => element.getAttribute('data-comment-id'),
              renderHTML: attributes => {
                if (!attributes.commentId) return {}
                return { 'data-comment-id': attributes.commentId }
              },
            },
          }
        },
      }).configure({
        multicolor: true,
        HTMLAttributes: {
          class: "es-comment-highlight",
        },
      }),
      Placeholder.configure({
        placeholder: "メモを入力してください… (/ でコマンド)",
      }),
      SlashCommand.configure({
        suggestion: {
          items: ({ query }: { query: string }) => {
            return slashCommandItems.filter((item: SlashCommandItem) =>
              item.title.toLowerCase().includes(query.toLowerCase())
            );
          },
          render: () => {
            let component: ReactRenderer<any> | null = null;
            let popup: TippyInstance[] | null = null;

            return {
              onStart: (props: SuggestionProps<SlashCommandItem>) => {
                component = new ReactRenderer(SlashCommandList, {
                  props,
                  editor: props.editor,
                });

                if (!props.clientRect) return;

                popup = tippy("body", {
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: "manual",
                  placement: "bottom-start",
                  animation: false,
                });
              },
              onUpdate: (props: SuggestionProps<SlashCommandItem>) => {
                component?.updateProps(props);
                if (popup && props.clientRect) {
                  popup[0]?.setProps({
                    getReferenceClientRect: props.clientRect as () => DOMRect,
                  });
                }
              },
              onKeyDown: (props: SuggestionKeyDownProps) => {
                if (props.event.key === "Escape") {
                  popup?.[0]?.hide();
                  return true;
                }
                return (component?.ref as any)?.onKeyDown?.(props) || false;
              },
              onExit: () => {
                popup?.[0]?.destroy();
                component?.destroy();
              },
            };
          },
        },
      }),
    ],
    content: parseContent(content),
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true;
      onChange(JSON.stringify(editor.getJSON()));
    },
    onSelectionUpdate: () => {
      // ツールバーのDisabled状態等を再計算するために強制レンダリング
      forceUpdate({});
    },
    editorProps: {
      attributes: {
        class: "notion-editor-content",
      },
      handleClick: (view, pos, event) => {
        // If clicking on a highlight, select that comment
        if (event.target instanceof HTMLElement) {
          const highlightEl = event.target.closest('.es-comment-highlight');
          if (highlightEl) {
            const cId = highlightEl.getAttribute('data-comment-id');
            // If we have an onAddCommentClick, we are probably in a context that can route this back up
            // We can dispatch a custom event or just accept we don't have direct access to setActiveCommentId
            // A quick hack is to dispatch a custom DOM event
            if (cId) {
               window.dispatchEvent(new CustomEvent('es-comment-clicked', { detail: cId }));
            }
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
          event.preventDefault();
          Array.from(files).forEach((file) => {
            if (file.type.startsWith("image/")) {
              insertImageFromFile(file);
            }
          });
          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (const item of Array.from(items)) {
            if (item.type.startsWith("image/")) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file) insertImageFromFile(file);
              return true;
            }
          }
        }
        return false;
      },
    },
  });

  // editorRefを最新のeditorインスタンスでSync
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Sync highlight classes
  useEffect(() => {
    if (!editor) return;
    const elements = editor.view.dom.querySelectorAll('.es-comment-highlight');
    elements.forEach((el) => {
      const cId = el.getAttribute('data-comment-id');
      if (cId === activeCommentId) {
        el.classList.add('is-active');
      } else {
        el.classList.remove('is-active');
      }
    });
  }, [editor, activeCommentId, comments]);

  // expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getSelectionInfo: () => {
      if (!editor) return null;
      const { from, to } = editor.state.selection;
      if (from === to) return null; // no selection
      const text = editor.state.doc.textBetween(from, to, " ");
      return { text, from, to };
    },
    applyCommentHighlights: (commentsToApply: ESComment[]) => {
      // Highlights are stored in content natively, but we could sync them here if needed.
    },
    addCommentHighlight: (from: number, to: number, commentId: string) => {
      if (!editor) return;
      editor.commands.setTextSelection({ from, to });
      editor.commands.setHighlight({ commentId });
      // Clear selection so the user can continue typing normally
      editor.commands.setTextSelection(to);
      isInternalUpdate.current = true;
      onChange(JSON.stringify(editor.getJSON()));
    },
    removeCommentHighlight: (commentId: string) => {
      if (!editor) return;
      
      const { tr, doc } = editor.state;
      let hasChanges = false;
      
      doc.descendants((node, pos) => {
        if (node.isText && node.marks.length > 0) {
          const highlightMark = node.marks.find((m: any) => m.type.name === 'highlight' && m.attrs.commentId === commentId);
          if (highlightMark) {
            tr.removeMark(pos, pos + node.nodeSize, highlightMark);
            hasChanges = true;
          }
        }
      });
      
      if (hasChanges) {
        editor.view.dispatch(tr);
        isInternalUpdate.current = true;
        onChange(JSON.stringify(editor.getJSON()));
      }
    },
    scrollToPosition: (from: number) => {
      if (!editor) return;
      try {
        const resolvedPos = editor.state.doc.resolve(Math.min(from, editor.state.doc.content.size));
        editor.commands.setTextSelection(resolvedPos.pos);
        // Scroll to selection
        const domAtPos = editor.view.domAtPos(resolvedPos.pos);
        if (domAtPos?.node) {
          const element = domAtPos.node instanceof Element ? domAtPos.node : domAtPos.node.parentElement;
          element?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } catch {
        // Position might be invalid after content changes.
      }
    },
  }), [editor]);

  // 画像アップロードハンドラをSlashCommandに登録
  useEffect(() => {
    setImageUploadHandler(() => {
      fileInputRef.current?.click();
    });
    return () => {
      setImageUploadHandler(() => {});
    };
  }, []);

  // 外部からの content 変更を反映（初回ロード後のfetch等）
  useEffect(() => {
    if (!editor || isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const parsed = parseContent(content);
    if (parsed) {
      editor.commands.setContent(parsed);
    }
  }, [content, editor, parseContent]);

  // readOnly 変更の反映
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [readOnly, editor]);

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      insertImageFromFile(file);
      e.target.value = "";
    }
  };

  if (!editor) return null;

  return (
    <div className={`notion-editor-wrapper ${readOnly ? "is-readonly" : ""}`}>
      {/* ── ツールバー ── */}
      {!readOnly && (
        <div className="notion-toolbar">
        {/* テキスト書式 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setParagraph().run()}
          isActive={editor.isActive("paragraph")}
          title="段落"
        >
          <Pilcrow className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          isActive={editor.isActive("heading", { level: 1 })}
          title="見出し1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          isActive={editor.isActive("heading", { level: 2 })}
          title="見出し2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          isActive={editor.isActive("heading", { level: 3 })}
          title="見出し3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* インラインスタイル */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="太字"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="イタリック"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="取り消し線"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
          title="コード"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* リスト */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="箇条書き"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="番号付きリスト"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="引用"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="水平線"
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* テーブル */}
        <ToolbarButton
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
          title="テーブル挿入"
        >
          <TableIcon className="h-4 w-4" />
        </ToolbarButton>
        {editor.isActive("table") && (
          <>
            <ToolbarButton
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              title="列を追加"
            >
              <Plus className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().addRowAfter().run()}
              title="行を追加"
            >
              <TableCellsMerge className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().deleteTable().run()}
              title="テーブル削除"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </ToolbarButton>
          </>
        )}

        <ToolbarDivider />

        {/* カラムレイアウト */}
        <ToolbarButton
          onClick={() => editor.chain().focus().insertColumns(2).run()}
          title="2カラムレイアウト"
        >
          <Columns2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().insertColumns(3).run()}
          title="3カラムレイアウト"
        >
          <Columns3 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* トグル */}
        <ToolbarButton
          onClick={() =>
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
              .run()
          }
          isActive={editor.isActive("toggle")}
          title="トグルブロック"
        >
          <ChevronDown className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* 画像 */}
        <ToolbarButton onClick={handleImageUpload} title="画像を挿入">
          <ImagePlus className="h-4 w-4" />
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <ToolbarDivider />

        {/* コメント */}
        {onAddCommentClick && (
          <>
            <ToolbarButton
              onClick={onAddCommentClick}
              disabled={editor.state.selection.from === editor.state.selection.to}
              title="コメントを追加"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarDivider />
          </>
        )}

        {/* Undo / Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="元に戻す"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="やり直す"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>
      </div>
      )}

      {/* ── エディタ本体 ── */}
      <EditorContent editor={editor} />
    </div>
  );
});
