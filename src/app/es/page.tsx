"use client";

import { useEffect, useState, useMemo, useDeferredValue } from "react";
import {
  FileText,
  Search,
  Loader2,
  Copy,
  CopyPlus,
  ChevronRight,
  Share2,
  Link,
  X,
  StopCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn, countCharacters, getSectionCharacterCounts } from "@/lib/utils";
import dynamic from "next/dynamic";
import { ESCommentPanel } from "@/components/es-comment-panel";
import type { EditorSelectionInfo } from "@/components/notion-editor";
const NotionEditor = dynamic(() => import("@/components/notion-editor").then(mod => mod.NotionEditor), { ssr: false });
import { toast } from "sonner";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useAllESDocs, useESComments } from "@/hooks/use-api";
import type { ESDocument } from "@/types";
import { useRef } from "react";

export default function ESListPage() {
  const { esDocs: swrDocs, isLoading, mutate } = useAllESDocs();
  const [esDocs, setEsDocs] = useState<(ESDocument & { charCount?: number })[]>([]);
  const [selected, setSelected] = useState<ESDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState("未提出");
  const [isSaving, setIsSaving] = useState(false);

  // Share State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);

  // ES Comments State
  const { comments: esComments, mutate: mutateESComments } = useESComments(selected?.id || null);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentSelection, setCommentSelection] = useState<EditorSelectionInfo | null>(null);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (swrDocs) {
      const docsWithCharCount = swrDocs.map((doc: ESDocument) => ({
        ...doc,
        charCount: countCharacters(doc.content)
      }));
      setEsDocs(docsWithCharCount);

      if (docsWithCharCount.length > 0) {
        if (!selected) {
          setSelected(docsWithCharCount[0]);
          setEditContent(docsWithCharCount[0].content);
          setEditTitle(docsWithCharCount[0].title);
          setEditStatus(docsWithCharCount[0].status || "未提出");
          setShowCommentForm(false);
          setCommentSelection(null);
          setActiveCommentId(null);
        } else {
          const doc = docsWithCharCount.find((d: ESDocument) => d.id === selected.id);
          if (doc) {
            setSelected(doc);
          }
        }
      }
    }
  }, [swrDocs]);

  const filteredDocs = useMemo(() => {
    if (!deferredSearchQuery) return esDocs;
    const lowerQuery = deferredSearchQuery.toLowerCase();
    return esDocs.filter(
      (doc) =>
        doc.title.toLowerCase().includes(lowerQuery) ||
        (doc.companyName && doc.companyName.toLowerCase().includes(lowerQuery)) ||
        doc.companySlug.toLowerCase().includes(lowerQuery)
    );
  }, [esDocs, deferredSearchQuery]);

  const handleCopy = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(editContent);
      toast.success("クリップボードにコピーしました");
    } catch (err) {
      toast.error("コピーに失敗しました");
    }
  };

  const handleDuplicate = async () => {
    if (!selected) return;
    const duplicatedTitle = `[コピー] ${selected.title}`;
    try {
      const res = await fetch(`/api/companies/${selected.companySlug}/es`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: duplicatedTitle,
          content: selected.content,
          characterLimit: selected.characterLimit,
          characterLimitType: selected.characterLimitType,
          status: selected.status
        }),
      });
      if (res.ok) {
        toast.success("文書を複製しました");
        mutate();
      } else {
        toast.error("文書の複製に失敗しました");
      }
    } catch (error) {
      toast.error("文書の複製に失敗しました");
    }
  };

  const handleSave = async () => {
    if (!selected || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/companies/${selected.companySlug}/es`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          title: editTitle,
          content: editContent,
          characterLimit: selected.characterLimit,
          characterLimitType: selected.characterLimitType,
          status: editStatus,
        }),
      });
      if (res.ok) {
        mutate();
      } else {
        toast.error("保存に失敗しました");
      }
    } catch (error) {
      toast.error("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  useAutoSave({
    enabled: !!selected,
    hasChanges: !!selected && (editContent !== selected.content || editTitle !== selected.title || editStatus !== selected.status),
    onSave: handleSave,
    delay: 1500,
    deps: [editContent, editTitle, editStatus, selected?.id],
  });

  const handleSelect = (doc: ESDocument) => {
    setSelected(doc);
    setEditContent(doc.content);
    setEditTitle(doc.title);
    setEditStatus(doc.status || "未提出");
    setShowShareModal(false);
    setShareUrl(null);
  };

  // Share Handlers
  const handleShare = async () => {
    if (!selected) return;
    setIsGeneratingShare(true);
    try {
      const res = await fetch(`/api/es/${selected.id}/share`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      const { shareToken } = await res.json();
      const url = `${window.location.origin}/share/${shareToken}`;
      setShareUrl(url);
      setShowShareModal(true);
      mutate();
    } catch {
      toast.error("共有リンクの生成に失敗しました");
    } finally {
      setIsGeneratingShare(false);
    }
  };

  const handleStopSharing = async () => {
    if (!selected) return;
    try {
      const res = await fetch(`/api/es/${selected.id}/share`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("共有を停止しました");
        setShareUrl(null);
        setShowShareModal(false);
        mutate();
      } else {
        toast.error("共有の停止に失敗しました");
      }
    } catch {
      toast.error("共有の停止に失敗しました");
    }
  };

  const handleCopyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("共有リンクをコピーしました");
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

  const handleOpenShareModal = async () => {
    if (!selected) return;
    // Check if there's an existing share token
    if (selected.shareToken) {
      setShareUrl(`${window.location.origin}/share/${selected.shareToken}`);
      setShowShareModal(true);
    } else {
      await handleShare();
    }
  };

  // Comment Handlers
  const handleAddCommentClick = () => {
    if (!editorRef.current) return;
    const info = editorRef.current.getSelectionInfo();
    if (info) {
      setCommentSelection(info);
      setShowCommentForm(true);
    } else {
      toast.error("コメントを追加するテキストを選択してください");
    }
  };

  const handleAddComment = async (content: string) => {
    if (!selected || !commentSelection) return;
    try {
      const res = await fetch(`/api/es/${selected.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          highlightedText: commentSelection.text,
          positionFrom: commentSelection.from,
          positionTo: commentSelection.to
        })
      });
      if (!res.ok) throw new Error("Failed");
      const newComment = await res.json();
      
      if (editorRef.current) {
        editorRef.current.addCommentHighlight(commentSelection.from, commentSelection.to, newComment.id);
      }
      
      mutateESComments();
      setShowCommentForm(false);
      setCommentSelection(null);
      toast.success("コメントを追加しました");
    } catch {
      toast.error("コメントの追加に失敗しました");
    }
  };

  const handleUpdateComment = async (id: string, content: string) => {
    if (!selected) return;
    try {
      await fetch(`/api/es/${selected.id}/comments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: id, content })
      });
      mutateESComments();
    } catch {
      toast.error("コメントの更新に失敗しました");
    }
  };

  const handleResolveComment = async (id: string, resolved: boolean) => {
    if (!selected) return;
    try {
      await fetch(`/api/es/${selected.id}/comments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: id, resolved })
      });
      mutateESComments();
    } catch {
      toast.error("状態の更新に失敗しました");
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!selected) return;
    try {
      await fetch(`/api/es/${selected.id}/comments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: id })
      });
      mutateESComments();
      if (activeCommentId === id) setActiveCommentId(null);
      if (editorRef.current) {
        editorRef.current.removeCommentHighlight(id);
      }
    } catch {
      toast.error("コメントの削除に失敗しました");
    }
  };

  const handleCommentClick = (comment: import("@/types").ESComment) => {
    setActiveCommentId(comment.id);
    if (editorRef.current && !comment.resolved) {
      editorRef.current.scrollToPosition(comment.positionFrom);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* Compact Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-card p-4 px-8 shadow-lg shadow-primary/5 flex items-center justify-between">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 h-32 w-32 rounded-full bg-orange-500/10 blur-[40px]" />

        <div className="relative flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              エントリーシート管理
            </h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
              {esDocs.length} Documents Registered
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selected && (
            <>
              <Button
                onClick={handleOpenShareModal}
                variant="outline"
                size="sm"
                disabled={isGeneratingShare}
                className="rounded-xl h-10 px-4 font-bold border-2 hover:border-amber-500 hover:text-amber-600 transition-all gap-2"
              >
                {isGeneratingShare ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                {selected.shareToken ? "共有中" : "共有リンク"}
              </Button>
              <Button
                onClick={handleDuplicate}
                variant="outline"
                size="sm"
                className="rounded-xl h-10 px-4 font-bold border-2 hover:border-primary hover:text-primary transition-all gap-2"
              >
                <CopyPlus className="h-4 w-4" />
                複製
              </Button>
              <Button
                onClick={handleCopy}
                variant="outline"
                size="sm"
                className="rounded-xl h-10 px-4 font-bold border-2 hover:border-primary hover:text-primary transition-all gap-2"
              >
                <Copy className="h-4 w-4" />
                テキストをコピー
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:h-[calc(100dvh-220px)] lg:min-h-175">
        {/* Left Side: List */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4 min-w-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="タイトルや企業名で検索..."
              className="pl-11 h-12 rounded-2xl glass border-none focus-visible:ring-2 focus-visible:ring-primary/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Card className="border-none glass overflow-hidden rounded-3xl shadow-xl shadow-primary/5 lg:grow">
            <ScrollArea className="h-[38svh] min-h-65 lg:h-full">
              <div className="p-2 space-y-1">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center p-20 gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                    <p className="text-sm font-bold text-muted-foreground">読み込み中...</p>
                  </div>
                ) : filteredDocs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center gap-4">
                    <div className="p-4 rounded-full bg-muted/20">
                      <Search className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-bold text-muted-foreground">
                      {searchQuery ? "一致するESが見つかりません" : "まだドキュメントがありません"}
                    </p>
                  </div>
                ) : (
                  filteredDocs.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => handleSelect(doc)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-2xl transition-all group relative text-left",
                        selected?.id === doc.id
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                          : "hover:bg-muted/50 dark:hover:bg-muted/20"
                      )}
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                        selected?.id === doc.id ? "bg-white/20" : "bg-primary/10 text-primary"
                      )}>
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="font-bold text-sm whitespace-normal wrap-break-word leading-snug">
                          {doc.title || "無題のES"}
                        </div>
                        <div className={cn(
                          "text-[10px] uppercase tracking-widest font-bold mt-1 flex flex-wrap items-center gap-x-2 gap-y-1",
                          selected?.id === doc.id ? "text-primary-foreground/60" : "text-muted-foreground"
                        )}>
                          <span className="whitespace-normal break-all">{doc.companyName || doc.companySlug}</span>
                          {doc.status && (
                            <span className={cn(
                              "px-1.5 py-0.5 rounded-sm shrink-0 font-bold",
                              selected?.id === doc.id ? "bg-white/20 text-white" : 
                                doc.status === "通過" ? "bg-green-500/10 text-green-700 dark:text-green-400" :
                                doc.status === "落選" ? "bg-red-500/10 text-red-700 dark:text-red-400" :
                                doc.status === "結果待ち" ? "bg-blue-500/10 text-blue-700 dark:text-blue-400" :
                                doc.status === "提出済" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" :
                                "bg-muted/50 text-muted-foreground"
                            )}>
                              {doc.status}
                            </span>
                          )}
                          <span className="ml-auto shrink-0">{doc.charCount ?? 0}文字</span>
                        </div>
                      </div>
                      <ChevronRight className={cn(
                        "h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1",
                        selected?.id === doc.id ? "text-primary-foreground/40" : "text-muted-foreground/20"
                      )} />
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Right Side: EditorArea */}
        <div className="lg:col-span-8 xl:col-span-9 overflow-hidden">
          {selected ? (
            <Card className="border-none glass overflow-hidden rounded-3xl shadow-xl shadow-primary/5 flex flex-col py-0! lg:h-full">
              <div className="border-b border-white/10 px-6 py-2 flex flex-row items-center justify-between shrink-0 min-h-[56px]">
                <div className="flex-grow mr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest leading-tight whitespace-normal break-all max-w-[60%]">
                      {selected.companyName || selected.companySlug}
                    </div>
                    <div className="bg-orange-500/10 text-orange-600 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest leading-none">
                      {countCharacters(editContent)} Characters
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="text-2xl font-black bg-transparent border-none focus-visible:ring-0 p-0 h-auto flex-1 text-foreground"
                    />
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger className="w-[120px] h-9 text-xs font-bold border-2 rounded-xl transition-all hover:bg-muted/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="未提出">未提出</SelectItem>
                        <SelectItem value="提出済">提出済</SelectItem>
                        <SelectItem value="結果待ち">結果待ち</SelectItem>
                        <SelectItem value="通過">通過</SelectItem>
                        <SelectItem value="落選">落選</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isSaving && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10">
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Saving</span>
                    </div>
                  )}
                </div>
              </div>
              <CardContent className="flex-grow p-0 overflow-hidden relative">
                <ScrollArea className="h-[54svh] min-h-90 lg:h-full">
                  <div className="w-full p-4 lg:p-6 pt-2!">
                    {selected.content || true ? (
                      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
                        <div className="flex flex-col min-w-0 space-y-4">
                          <NotionEditor
                            ref={editorRef}
                            key={selected.id}
                            content={editContent}
                            onChange={setEditContent}
                            comments={esComments}
                            onAddCommentClick={handleAddCommentClick}
                            activeCommentId={activeCommentId}
                          />
                          <div className="mt-4 pt-4 border-t border-white/10 lg:pl-10">
                            <h4 className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-widest">セクション別文字数</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {getSectionCharacterCounts(editContent).map((section, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 rounded-md bg-muted/10 text-xs border border-transparent transition-all">
                                  <span className="font-medium truncate mr-2" title={section.title}>{section.title}</span>
                                  <span className="font-bold tabular-nums whitespace-nowrap opacity-70">{section.count} 文字</span>
                                </div>
                              ))}
                              {getSectionCharacterCounts(editContent).length === 0 && (
                                <p className="text-[10px] text-muted-foreground italic col-span-full">
                                  * 見出し1〜3を追加すると、セクションごとの文字数がここに表示されます。
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Sidebar Comments Panel */}
                        <div className="hidden lg:block border rounded-lg overflow-hidden bg-card/50 max-h-[700px]">
                          <ESCommentPanel
                            comments={esComments}
                            activeCommentId={activeCommentId}
                            onAddComment={handleAddComment}
                            onUpdateComment={handleUpdateComment}
                            onResolveComment={handleResolveComment}
                            onDeleteComment={handleDeleteComment}
                            onCommentClick={handleCommentClick}
                            showAddForm={showCommentForm}
                            selectedText={commentSelection?.text || ""}
                            onCancelAdd={() => setShowCommentForm(false)}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-20 px-4">
                        <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
                          <FileText className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                        <p className="text-muted-foreground italic font-medium">本文がまだありません。入力を開始しましょう。</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none glass overflow-hidden rounded-3xl shadow-xl shadow-primary/5 flex flex-col items-center justify-center p-12 text-center group lg:h-full">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 group-hover:scale-175 transition-transform duration-700" />
                <div className="relative h-32 w-32 rounded-3xl bg-card border border-white/20 flex items-center justify-center shadow-2xl">
                  <FileText className="h-16 w-16 text-primary" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-2">ドキュメントを選択</h3>
              <p className="text-muted-foreground font-medium max-w-xs mx-auto">
                左側のリストから閲覧・編集したいエントリーシートを選択してください。
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowShareModal(false)}
          />
          <div className="relative z-10 w-full max-w-md mx-4">
            <Card className="border-none glass overflow-hidden rounded-3xl shadow-2xl">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Share2 className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">ES共有リンク</h3>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                        ログイン不要で添削可能
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted/20 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    共有URL
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        readOnly
                        value={shareUrl || ""}
                        className="w-full pl-10 pr-3 h-11 rounded-xl bg-muted/20 border border-white/10 text-sm font-mono text-foreground/80 focus:outline-none"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                    </div>
                    <Button
                      onClick={handleCopyShareUrl}
                      className="rounded-xl h-11 px-4 font-bold gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      コピー
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl bg-amber-500/5 border border-amber-500/10 p-4 space-y-2">
                  <p className="text-xs font-bold text-amber-600">共有時の注意</p>
                  <ul className="text-[11px] text-muted-foreground space-y-1">
                    <li>• リンクを知っている人は<span className="font-bold text-foreground">誰でも</span>閲覧・編集・コメントが可能です</li>
                    <li>• 他の企業情報やログイン情報は<span className="font-bold text-foreground">表示されません</span></li>
                    <li>• 共有を停止するとリンクが無効になります</li>
                  </ul>
                </div>

                <Button
                  variant="outline"
                  onClick={handleStopSharing}
                  className="w-full rounded-xl h-11 font-bold border-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive transition-all gap-2"
                >
                  <StopCircle className="h-4 w-4" />
                  共有を停止する
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
