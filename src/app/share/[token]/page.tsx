"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  FileText,
  Loader2,
  MessageSquarePlus,
  User,
  AlertCircle,
  Share2,
  MousePointerClick,
  TextSelect,
  PenLine,
  X,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, countCharacters, getSectionCharacterCounts } from "@/lib/utils";
import dynamic from "next/dynamic";
import { ESCommentPanel } from "@/components/es-comment-panel";
import type { EditorSelectionInfo } from "@/components/notion-editor";
const NotionEditor = dynamic(
  () => import("@/components/notion-editor").then((mod) => mod.NotionEditor),
  { ssr: false }
);
import { toast } from "sonner";
import type { ESComment } from "@/types";

interface SharedDocData {
  id: string;
  title: string;
  content: string;
  companyName: string;
  characterLimit?: number;
  characterLimitType?: string;
  status?: string;
  updatedAt: string;
  comments: ESComment[];
}

export default function SharedESPage() {
  const params = useParams();
  const token = params.token as string;

  const [docData, setDocData] = useState<SharedDocData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Reviewer name
  const [reviewerName, setReviewerName] = useState("");
  const [isNameSet, setIsNameSet] = useState(false);

  // Comment state
  const [comments, setComments] = useState<ESComment[]>([]);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentSelection, setCommentSelection] = useState<EditorSelectionInfo | null>(null);
  const editorRef = useRef<any>(null);

  // Onboarding guide
  const [showGuide, setShowGuide] = useState(true);
  const [guideStep, setGuideStep] = useState(0);

  // Auto-save timer ref
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContentRef = useRef<string>("");

  // Fetch shared document
  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    fetch(`/api/share/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data: SharedDocData) => {
        setDocData(data);
        setEditContent(data.content);
        lastSavedContentRef.current = data.content;
        setComments(data.comments || []);
        setError(null);
      })
      .catch(() => {
        setError("共有リンクが無効か、期限切れです。");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/share/${token}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch {
      // silent
    }
  }, [token]);

  // Auto-save content
  const saveContent = useCallback(
    async (content: string) => {
      if (!token || content === lastSavedContentRef.current) return;
      setIsSaving(true);
      try {
        const res = await fetch(`/api/share/${token}/content`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        if (res.ok) {
          lastSavedContentRef.current = content;
        } else {
          toast.error("保存に失敗しました");
        }
      } catch {
        toast.error("保存に失敗しました");
      } finally {
        setIsSaving(false);
      }
    },
    [token]
  );

  // Auto-save with debounce
  useEffect(() => {
    if (!docData) return;
    if (editContent === lastSavedContentRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveContent(editContent);
    }, 2000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [editContent, docData, saveContent]);

  // Comment handlers
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
    if (!commentSelection) return;
    try {
      const res = await fetch(`/api/share/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          highlightedText: commentSelection.text,
          positionFrom: commentSelection.from,
          positionTo: commentSelection.to,
          authorName: reviewerName || "匿名",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const newComment = await res.json();

      if (editorRef.current) {
        editorRef.current.addCommentHighlight(
          commentSelection.from,
          commentSelection.to,
          newComment.id
        );
      }

      await fetchComments();
      setShowCommentForm(false);
      setCommentSelection(null);
      toast.success("コメントを追加しました");
    } catch {
      toast.error("コメントの追加に失敗しました");
    }
  };

  const handleUpdateComment = async (id: string, content: string) => {
    try {
      await fetch(`/api/share/${token}/comments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: id, content }),
      });
      await fetchComments();
    } catch {
      toast.error("コメントの更新に失敗しました");
    }
  };

  const handleResolveComment = async (id: string, resolved: boolean) => {
    try {
      await fetch(`/api/share/${token}/comments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: id, resolved }),
      });
      await fetchComments();
    } catch {
      toast.error("状態の更新に失敗しました");
    }
  };

  const handleDeleteComment = async (id: string) => {
    try {
      await fetch(`/api/share/${token}/comments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: id }),
      });
      await fetchComments();
      if (activeCommentId === id) setActiveCommentId(null);
      if (editorRef.current) {
        editorRef.current.removeCommentHighlight(id);
      }
    } catch {
      toast.error("コメントの削除に失敗しました");
    }
  };

  const handleCommentClick = (comment: ESComment) => {
    setActiveCommentId(comment.id);
    if (editorRef.current && !comment.resolved) {
      editorRef.current.scrollToPosition(comment.positionFrom);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary/40" />
        <p className="text-sm font-bold text-muted-foreground">
          共有ドキュメントを読み込み中...
        </p>
      </div>
    );
  }

  // Error state
  if (error || !docData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="relative">
          <div className="absolute inset-0 bg-destructive/20 blur-3xl rounded-full scale-150" />
          <div className="relative h-24 w-24 rounded-3xl bg-card border border-white/20 flex items-center justify-center shadow-2xl">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">リンクが無効です</h2>
          <p className="text-muted-foreground font-medium max-w-sm">
            {error || "共有リンクが無効か、共有が停止されています。"}
          </p>
        </div>
      </div>
    );
  }

  // Name input step (optional — shown before editing)
  if (!isNameSet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150" />
          <div className="relative h-24 w-24 rounded-3xl bg-card border border-white/20 flex items-center justify-center shadow-2xl">
            <Share2 className="h-12 w-12 text-primary" />
          </div>
        </div>
        <div className="text-center mb-2">
          <h2 className="text-2xl font-bold mb-1">ES添削のご依頼</h2>
          <p className="text-muted-foreground font-medium text-sm max-w-sm">
            「{docData.companyName}」の「{docData.title}」の添削をお願いされています。
          </p>
        </div>

        <Card className="border-none glass overflow-hidden rounded-3xl shadow-xl shadow-primary/5 w-full max-w-md">
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                あなたの名前（コメント時に表示されます）
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="例: 田中太郎"
                  className="pl-10 h-12 rounded-2xl glass border-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setIsNameSet(true);
                  }}
                />
              </div>
            </div>
            <button
              onClick={() => setIsNameSet(true)}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity"
            >
              添削を始める
            </button>
            <p className="text-[10px] text-center text-muted-foreground">
              名前を入力しなくても「匿名」として添削できます
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const guideSteps = [
    {
      icon: TextSelect,
      title: "テキストを選択",
      description: "添削したい箇所をドラッグして選択します",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: MessageSquarePlus,
      title: "コメントボタンを押す",
      description: "ツールバーの💬ボタンをクリックします",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      icon: PenLine,
      title: "コメントを入力",
      description: "右側のパネルにフィードバックを記入して送信",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
  ];

  // Main shared editor view
  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-card p-4 px-8 shadow-lg shadow-primary/5 flex items-center justify-between">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 h-32 w-32 rounded-full bg-orange-500/10 blur-[40px]" />

        <div className="relative flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              ES添削モード
            </h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
              Shared Review — {reviewerName || "匿名"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Share2 className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
              共有中
            </span>
          </div>
          {isSaving && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                Saving
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Onboarding Guide Banner */}
      {showGuide && (
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card shadow-lg shadow-primary/5">
          <div className="absolute top-0 left-0 -ml-16 -mt-16 h-40 w-40 rounded-full bg-primary/10 blur-[60px]" />
          <div className="absolute bottom-0 right-0 -mr-16 -mb-16 h-40 w-40 rounded-full bg-amber-500/10 blur-[60px]" />
          
          <div className="relative p-5 pb-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MousePointerClick className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">コメントの付け方</h3>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                    以下の3ステップでES本文にコメントを追加できます
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted/30 transition-colors shrink-0"
                title="ガイドを閉じる"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {guideSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-2xl text-left border border-transparent"
                >
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      "flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-bold",
                      step.bgColor, step.color
                    )}>
                      {idx + 1}
                    </span>
                    {idx < guideSteps.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-muted-foreground/30 hidden sm:block" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={cn("text-xs font-bold", step.color)}>{step.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-4">
              <p className="text-[10px] text-muted-foreground">
                💡 <span className="font-bold">本文を直接編集</span>することもできます。変更は自動保存されます。
              </p>
            </div>
          </div>
        </div>
      )}


      {/* Editor area */}
      <div className="grid grid-cols-1 gap-6 lg:h-[calc(100dvh-220px)] lg:min-h-175">
        <Card className="border-none glass overflow-hidden rounded-3xl shadow-xl shadow-primary/5 flex flex-col py-0! lg:h-full">
          <div className="border-b border-white/10 px-6 py-2 flex flex-row items-center justify-between shrink-0 min-h-[56px]">
            <div className="flex-grow mr-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest leading-tight whitespace-normal break-all max-w-[60%]">
                  {docData.companyName}
                </div>
                <div className="bg-orange-500/10 text-orange-600 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest leading-none">
                  {countCharacters(editContent)} Characters
                </div>
              </div>
              <h2 className="text-2xl font-black text-foreground">
                {docData.title}
              </h2>
            </div>
          </div>

          <CardContent className="flex-grow p-0 overflow-hidden relative">
            <ScrollArea className="h-[54svh] min-h-90 lg:h-full">
              <div className="w-full p-4 lg:p-6 pt-2!">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
                  <div className="flex flex-col min-w-0 space-y-4">
                    <NotionEditor
                      ref={editorRef}
                      key={docData.id}
                      content={editContent}
                      onChange={setEditContent}
                      comments={comments}
                      onAddCommentClick={handleAddCommentClick}
                      activeCommentId={activeCommentId}
                    />
                    <div className="mt-4 pt-4 border-t border-white/10 lg:pl-10">
                      <h4 className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-widest">
                        セクション別文字数
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {getSectionCharacterCounts(editContent).map(
                          (section, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center p-2 rounded-md bg-muted/10 text-xs border border-transparent transition-all"
                            >
                              <span
                                className="font-medium truncate mr-2"
                                title={section.title}
                              >
                                {section.title}
                              </span>
                              <span className="font-bold tabular-nums whitespace-nowrap opacity-70">
                                {section.count} 文字
                              </span>
                            </div>
                          )
                        )}
                        {getSectionCharacterCounts(editContent).length ===
                          0 && (
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
                      comments={comments}
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
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
