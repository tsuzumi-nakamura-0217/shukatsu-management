"use client";

import { Node, mergeAttributes } from "@tiptap/react";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { useCallback, useRef, useState } from "react";

// ── NodeView Component ─────────────────────────
function ResizableImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [resizing, setResizing] = useState(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startWidth = imgRef.current?.offsetWidth || 300;

      setResizing(true);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const diff = moveEvent.clientX - startX;
        const newWidth = Math.max(80, startWidth + diff);
        if (imgRef.current) {
          imgRef.current.style.width = `${newWidth}px`;
        }
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        const diff = upEvent.clientX - startX;
        const finalWidth = Math.max(80, startWidth + diff);
        updateAttributes({ width: finalWidth });
        setResizing(false);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [updateAttributes]
  );

  return (
    <NodeViewWrapper
      className={`resizable-image-wrapper ${selected ? "is-selected" : ""} ${
        resizing ? "is-resizing" : ""
      }`}
      data-drag-handle
    >
      <img
        ref={imgRef}
        src={node.attrs.src}
        alt={node.attrs.alt || ""}
        title={node.attrs.title || ""}
        style={{
          width: node.attrs.width ? `${node.attrs.width}px` : undefined,
        }}
        draggable={false}
      />
      <div
        className="resize-handle"
        onMouseDown={handleMouseDown}
        title="ドラッグでサイズ変更"
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M8 2L2 8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 5L5 8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 8L8 8" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </NodeViewWrapper>
  );
}

// ── Extension ──────────────────────────────────

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    resizableImage: {
      setImage: (options: {
        src: string;
        alt?: string;
        title?: string;
        width?: number;
      }) => ReturnType;
    };
  }
}

export const ResizableImage = Node.create({
  name: "image",

  group: "block",

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const width = element.getAttribute("width") || element.style.width;
          return width ? parseInt(width, 10) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },

  addCommands() {
    return {
      setImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
