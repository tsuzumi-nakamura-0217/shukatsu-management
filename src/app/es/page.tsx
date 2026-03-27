"use client";

import { useEffect, useState, useMemo } from "react";
import { Copy, FileText, Search, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownViewer } from "@/components/markdown-editor";
import { toast } from "sonner";
import type { ESDocument } from "@/types";

export default function ESListPage() {
  const [esDocs, setEsDocs] = useState<ESDocument[]>([]);
  const [selected, setSelected] = useState<ESDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    fetch("/api/es")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setEsDocs(data);
        setIsLoading(false);
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredDocs = useMemo(() => {
    if (!searchQuery) return esDocs;
    const lowerQuery = searchQuery.toLowerCase();
    return esDocs.filter(
      (doc) =>
        doc.title.toLowerCase().includes(lowerQuery) ||
        (doc.companyName && doc.companyName.toLowerCase().includes(lowerQuery)) ||
        doc.companySlug.toLowerCase().includes(lowerQuery)
    );
  }, [esDocs, searchQuery]);

  const handleCopy = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected.content);
      toast.success("クリップボードにコピーしました");
    } catch (err) {
      toast.error("コピーに失敗しました");
    }
  };

  return (
    <div className="flex h-full gap-4 relative">
      {/* 左サイドのリスト */}
      <Card className="w-1/3 flex flex-col h-[calc(100vh-10rem)] shadow-sm border-muted/60">
        <CardHeader className="pb-3 border-b border-border/40 shrink-0">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            ES・志望動機一覧
          </CardTitle>
          <CardDescription>
            各企業向けに作成したESや志望動機を一元管理・閲覧できます
          </CardDescription>
          <div className="mt-4 relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="企業名やタイトルで検索..."
              className="pl-9 bg-background/50 focus-visible:bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-grow overflow-hidden">
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {searchQuery ? "一致するESが見つかりません" : "保存されたESがありません"}
              </div>
            ) : (
              <div className="flex flex-col">
                {filteredDocs.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setSelected(doc)}
                    className={`flex flex-col text-left px-4 py-3 border-b border-border/40 transition-colors hover:bg-muted/50 \${
                      selected?.id === doc.id
                        ? "bg-primary/5 border-l-4 border-l-primary"
                        : "border-l-4 border-l-transparent"
                    }`}
                  >
                    <div className="font-medium text-sm text-foreground mb-1 line-clamp-1">
                      {doc.title || "無題のES"}
                    </div>
                    <div className="text-xs text-muted-foreground flex justify-between items-center w-full">
                      <span className="truncate">
                        {doc.companyName || doc.companySlug}
                      </span>
                      <span className="shrink-0 ml-2">
                        {new Date(doc.updatedAt).toLocaleDateString("ja-JP")}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 右サイドのプレビュー */}
      <Card className="w-2/3 flex flex-col h-[calc(100vh-10rem)] shadow-sm border-muted/60">
        {selected ? (
          <>
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40 shrink-0">
              <div>
                <CardDescription className="mb-1.5 flex items-center gap-1.5">
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-xs font-medium">
                    {selected.companyName || selected.companySlug}
                  </span>
                  <span>
                    最終更新: {new Date(selected.updatedAt).toLocaleString("ja-JP")}
                  </span>
                </CardDescription>
                <CardTitle className="text-2xl font-bold">{selected.title || "無題のES"}</CardTitle>
              </div>
              <Button onClick={handleCopy} variant="outline" size="sm" className="gap-2">
                <Copy className="h-4 w-4" />
                コピー
              </Button>
            </CardHeader>
            <CardContent className="p-0 flex-grow overflow-hidden bg-muted/10">
              <ScrollArea className="h-full w-full">
                <div className="p-6 md:p-8 max-w-4xl mx-auto">
                  {selected.content ? (
                    <MarkdownViewer content={selected.content} />
                  ) : (
                    <div className="text-center text-muted-foreground italic py-10">
                      本文がありません
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
            <div className="p-4 rounded-full bg-muted/30">
              <FileText className="h-10 w-10 opacity-30" />
            </div>
            <p>左側のリストからESを選択すると詳細が表示されます</p>
          </div>
        )}
      </Card>
    </div>
  );
}
