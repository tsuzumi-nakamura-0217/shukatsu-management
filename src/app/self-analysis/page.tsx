"use client";

import { useEffect, useState, useDeferredValue, useMemo } from "react";
import {
  Plus,
  Save,
  Trash2,
  Loader2,
  Search,
  Brain,
  FileText,
  ChevronRight,
  Sparkles
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import dynamic from "next/dynamic";
const NotionEditor = dynamic(() => import("@/components/notion-editor").then(mod => mod.NotionEditor), { ssr: false });
import { toast } from "sonner";
import { useAutoSave } from "@/hooks/use-auto-save";
import type { SelfAnalysis } from "@/types";
import { cn } from "@/lib/utils";

export default function SelfAnalysisPage() {
  const [items, setItems] = useState<SelfAnalysis[]>([]);
  const [selected, setSelected] = useState<SelfAnalysis | null>(null);
  const [editContent, setEditContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const deferredSearch = useDeferredValue(searchQuery);

  const fetchItems = async () => {
    try {
      const r = await fetch("/api/self-analysis");
      const data = await r.json();
      setItems(data);
      if (data.length > 0 && !selected) {
        setSelected(data[0]);
        setEditContent(data[0].content);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item =>
      item.title.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      item.content.toLowerCase().includes(deferredSearch.toLowerCase())
    );
  }, [items, deferredSearch]);

  const handleSelect = (item: SelfAnalysis) => {
    setSelected(item);
    setEditContent(item.content);
  };

  const handleSave = async () => {
    if (!selected || isSaving) return;
    setIsSaving(true);
    try {
      await fetch("/api/self-analysis", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          title: selected.title,
          content: editContent,
        }),
      });
      // Refresh list to sync state
      const r = await fetch("/api/self-analysis");
      const data = await r.json();
      setItems(data);
    } catch (error) {
      console.error(error);
      toast.error("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  useAutoSave({
    enabled: !!selected,
    hasChanges: !!selected && editContent !== selected.content,
    onSave: handleSave,
    delay: 1500,
    deps: [editContent, selected?.id],
  });

  const handleCreate = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/self-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "新しい自己分析",
          content: "",
        }),
      });
      if (res.ok) {
        const newItem = await res.json();
        toast.success("作成しました");
        await fetchItems();
        setSelected(newItem);
        setEditContent("");
      }
    } catch (error) {
      console.error(error);
      toast.error("作成に失敗しました");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この自己分析を削除しますか？")) return;
    try {
      const res = await fetch("/api/self-analysis", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success("削除しました");
        if (selected?.id === id) {
          setSelected(null);
          setEditContent("");
        }
        fetchItems();
      }
    } catch (error) {
      console.error(error);
      toast.error("削除に失敗しました");
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* Compact Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-card p-4 px-8 shadow-lg shadow-primary/5 flex items-center justify-between">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 h-32 w-32 rounded-full bg-violet-500/10 blur-[40px]" />

        <div className="relative flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              自己分析
            </h1>
          </div>
        </div>

        <Button
          onClick={handleCreate}
          disabled={isCreating}
          size="sm"
          className="rounded-xl h-10 px-4 font-bold shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all"
        >
          {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          新規作成
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-220px)] min-h-[700px]">
        {/* Left Sidebar - List */}
        <div className="lg:col-span-3 flex flex-col gap-4 overflow-hidden">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="検索内容を入力..."
              className="pl-11 h-12 rounded-2xl glass border-none focus-visible:ring-2 focus-visible:ring-primary/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Card className="flex-grow border-none glass overflow-hidden rounded-3xl shadow-xl shadow-primary/5">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center p-20 gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                    <p className="text-sm font-bold text-muted-foreground">読み込み中...</p>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center gap-4">
                    <div className="p-4 rounded-full bg-muted/20">
                      <Search className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-bold text-muted-foreground">該当する項目が見つかりません</p>
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-2xl transition-all group relative text-left",
                        selected?.id === item.id
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                          : "hover:bg-white/40 dark:hover:bg-white/5"
                      )}
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                        selected?.id === item.id ? "bg-white/20" : "bg-primary/10 text-primary"
                      )}>
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="font-bold text-sm whitespace-normal wrap-break-word leading-snug">
                          {item.title || "無題の分析"}
                        </div>
                        <div className={cn(
                          "text-[10px] uppercase tracking-widest font-bold mt-1",
                          selected?.id === item.id ? "text-primary-foreground/60" : "text-muted-foreground"
                        )}>
                          Last edited • Today
                        </div>
                      </div>
                      <ChevronRight className={cn(
                        "h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1",
                        selected?.id === item.id ? "text-primary-foreground/40" : "text-muted-foreground/20"
                      )} />
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Right - Editor Area */}
        <div className="lg:col-span-9 overflow-hidden">
          {selected ? (
            <Card className="h-full border-none glass overflow-hidden rounded-3xl shadow-xl shadow-primary/5 flex flex-col py-0!">
              <div className="border-b border-white/10 px-6 py-2 flex flex-row items-center justify-between shrink-0 min-h-[56px]">
                <div className="flex-grow mr-4">
                  <input
                    value={selected.title}
                    onChange={(e) => setSelected({ ...selected, title: e.target.value })}
                    className="text-2xl font-black bg-transparent border-none focus-visible:ring-0 p-0 h-auto w-full text-foreground"
                    onBlur={handleSave}
                  />
                </div>
                <div className="flex items-center gap-3">
                  {isSaving && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10">
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Saving</span>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={() => handleDelete(selected.id)}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <CardContent className="flex-grow p-0 overflow-hidden relative">
                <ScrollArea className="h-full">
                  <div className="max-w-5xl mx-auto p-4 lg:p-6 pt-2!">
                    <NotionEditor
                      key={selected.id}
                      content={editContent}
                      onChange={setEditContent}
                    />
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full border-none glass overflow-hidden rounded-3xl shadow-xl shadow-primary/5 flex flex-col items-center justify-center p-12 text-center group">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 group-hover:scale-175 transition-transform duration-700" />
                <div className="relative h-32 w-32 rounded-3xl bg-card border border-white/20 flex items-center justify-center shadow-2xl">
                  <Brain className="h-16 w-16 text-primary animate-float" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-2">自己分析メモを選択</h3>
              <p className="text-muted-foreground font-medium max-w-xs mx-auto">
                左側のリストから項目を選択するか、新しい分析を開始して自己理解を深めましょう。
              </p>
              <Button
                variant="outline"
                className="mt-8 rounded-2xl h-12 px-8 font-bold border-2 hover:border-primary hover:text-primary transition-all"
                onClick={handleCreate}
              >
                新しい分析を始める
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
