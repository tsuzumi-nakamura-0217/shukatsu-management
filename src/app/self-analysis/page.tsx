"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
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
import { MarkdownEditor } from "@/components/markdown-editor";
import { toast } from "sonner";
import type { SelfAnalysis } from "@/types";

export default function SelfAnalysisPage() {
  const [items, setItems] = useState<SelfAnalysis[]>([]);
  const [selected, setSelected] = useState<SelfAnalysis | null>(null);
  const [editContent, setEditContent] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [newItem, setNewItem] = useState({ title: "" });

  async function fetchItems() {
    const data = await fetch("/api/self-analysis").then((r) => r.json());
    setItems(data);
    if (data.length > 0 && !selected) {
      setSelected(data[0]);
      setEditContent(data[0].content);
    }
  }

  useEffect(() => {
    let cancelled = false;

    fetch("/api/self-analysis")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setItems(data);
        if (data.length > 0) {
          setSelected((prev) => prev ?? data[0]);
          setEditContent((prev) => prev || data[0].content);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelect = (item: SelfAnalysis) => {
    setSelected(item);
    setEditContent(item.content);
  };

  const handleSave = async () => {
    if (!selected) return;
    await fetch("/api/self-analysis", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selected.id,
        title: selected.title,
        content: editContent,
      }),
    });
    toast.success("保存しました");
    fetchItems();
  };

  const handleCreate = async () => {
    if (!newItem.title) {
      toast.error("タイトルを入力してください");
      return;
    }
    await fetch("/api/self-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newItem.title,
        content: "",
      }),
    });
    toast.success("メモを作成しました");
    setNewOpen(false);
    setNewItem({ title: "" });
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このメモを削除しますか？")) return;
    await fetch("/api/self-analysis", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    toast.success("削除しました");
    if (selected?.id === id) {
      setSelected(null);
      setEditContent("");
    }
    fetchItems();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">自己分析</h1>
          <p className="text-muted-foreground">
            ガクチカ・強み弱みなどの共通資料を管理
          </p>
        </div>
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> 新規メモ
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新しい自己分析メモ</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>タイトル</Label>
                <Input
                  value={newItem.title}
                  onChange={(e) =>
                    setNewItem({ ...newItem, title: e.target.value })
                  }
                  placeholder="リーダーシップ経験"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate}>作成</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
        {/* Sidebar */}
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between rounded-lg p-3 cursor-pointer transition-colors ${
                selected?.id === item.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
              onClick={() => handleSelect(item)}
            >
              <span className="text-sm font-medium truncate">
                {item.title}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(item.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        {/* Editor */}
        <div>
          {selected ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{selected.title}</CardTitle>
                <Button size="sm" onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" /> 保存
                </Button>
              </CardHeader>
              <CardContent>
                <MarkdownEditor
                  value={editContent}
                  onChange={setEditContent}
                  height={500}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">
                  左側からメモを選択してください
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
