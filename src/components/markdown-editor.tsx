"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
});

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
}

export function MarkdownEditor({
  value,
  onChange,
  height = 400,
}: MarkdownEditorProps) {
  const charCount = value?.length || 0;

  return (
    <div data-color-mode="light" className="flex flex-col">
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || "")}
        height={height}
        preview="edit"
      />
      <div className="text-right text-xs text-muted-foreground mt-1.5 px-1 font-medium select-none">
        {charCount} 文字
      </div>
    </div>
  );
}

interface MarkdownViewerProps {
  content: string;
}

const MDPreview = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default.Markdown),
  { ssr: false }
);

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  return (
    <div data-color-mode="light">
      <MDPreview source={content} />
    </div>
  );
}
