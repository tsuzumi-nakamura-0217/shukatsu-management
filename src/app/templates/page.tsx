"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Trash2, Copy } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MarkdownEditor, MarkdownViewer } from "@/components/markdown-editor";
import { toast } from "sonner";
import type { Template } from "@/types";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    filename: "",
    title: "",
    description: "",
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const data = await fetch("/api/templates").then((r) => r.json());
    setTemplates(data);
  };

  const handleSelect = (template: Template) => {
    setSelected(template);
    setEditContent(template.content);
    setEditMode(false);
  };

  const handleSave = async () => {
    if (!selected) return;
    await fetch("/api/templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: selected.filename,
        title: selected.title,
        description: selected.description,
        content: editContent,
      }),
    });
    toast.success("テンプレートを保存しました");
    setEditMode(false);
    fetchTemplates();
  };

  const handleCreate = async () => {
    if (!newTemplate.filename || !newTemplate.title) {
      toast.error("ファイル名とタイトルを入力してください");
      return;
    }
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTemplate),
    });
    toast.success("テンプレートを作成しました");
    setNewOpen(false);
    setNewTemplate({ filename: "", title: "", description: "" });
    fetchTemplates();
  };

  const handleDelete = async (filename: string) => {
    if (!confirm("このテンプレートを削除しますか？")) return;
    await fetch("/api/templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename }),
    });
    toast.success("テンプレートを削除しました");
    if (selected?.filename === filename) {
      setSelected(null);
    }
    fetchTemplates();
  };

  const handleCopyContent = () => {
    if (selected) {
      navigator.clipboard.writeText(selected.content);
      toast.success("テンプレート内容をクリップボードにコピーしました");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">テンプレート</h1>
          <p className="text-muted-foreground">
            ES・志望動機のテンプレートを管理
          </p>
        </div>
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> 新規テンプレート
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新しいテンプレート</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>ファイル名</Label>
                <Input
                  value={newTemplate.filename}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, filename: e.target.value })
                  }
                  placeholder="my-template"
                />
              </div>
              <div>
                <Label>タイトル</Label>
                <Input
                  value={newTemplate.title}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, title: e.target.value })
                  }
                  placeholder="カスタムESテンプレート"
                />
              </div>
              <div>
                <Label>説明</Label>
                <Input
                  value={newTemplate.description}
                  onChange={(e) =>
                    setNewTemplate({
                      ...newTemplate,
                      description: e.target.value,
                    })
                  }
                  placeholder="テンプレートの説明"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate}>作成</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Template List */}
        <div className="space-y-3">
          {templates.map((template) => (
            <Card
              key={template.filename}
              className={`cursor-pointer transition-shadow hover:shadow-md ${
                selected?.filename === template.filename
                  ? "ring-2 ring-primary"
                  : ""
              }`}
              onClick={() => handleSelect(template)}
            >
              <CardHeader className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm">{template.title}</CardTitle>
                    {template.description && (
                      <CardDescription className="text-xs mt-1">
                        {template.description}
                      </CardDescription>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(template.filename);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
          {templates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              テンプレートがまだありません
            </p>
          )}
        </div>

        {/* Template Content */}
        <div>
          {selected ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{selected.title}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyContent}
                  >
                    <Copy className="mr-2 h-4 w-4" /> コピー
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditMode(!editMode)}
                  >
                    {editMode ? "プレビュー" : "編集"}
                  </Button>
                  {editMode && (
                    <Button size="sm" onClick={handleSave}>
                      <Save className="mr-2 h-4 w-4" /> 保存
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editMode ? (
                  <MarkdownEditor
                    value={editContent}
                    onChange={setEditContent}
                    height={500}
                  />
                ) : (
                  <MarkdownViewer content={selected.content} />
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">
                  左側からテンプレートを選択してください
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
