"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { useChatSession } from "@/components/chat-session-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

interface ChatPanelProps {
  className?: string;
  title?: string;
  description?: string;
  compact?: boolean;
  scrollTrigger?: number;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatPanel({
  className,
  title = "就活AIチャット",
  description = "あなたの就活データをもとに質問に回答します。",
  compact = false,
  scrollTrigger = 0,
}: ChatPanelProps) {
  const {
    conversations,
    activeConversationId,
    messages,
    isLoadingConversations,
    isLoadingHistory,
    isSending,
    selectConversation,
    createConversation,
    sendMessage,
    clearMessages,
  } = useChatSession();
  const [input, setInput] = useState("");
  const isComposingRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );
    if (!viewport) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      viewport.scrollTop = viewport.scrollHeight;
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [activeConversationId, isLoadingHistory, isSending, messages.length, scrollTrigger]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isComposingRef.current) {
      return;
    }

    const message = input.trim();
    if (!message || isSending) {
      return;
    }

    setInput("");
    await sendMessage(message);
  };

  const handleKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const isImeComposing =
      isComposingRef.current || event.nativeEvent.isComposing || event.keyCode === 229;
    if (isImeComposing) {
      return;
    }

    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    const message = input.trim();
    if (!message || isSending) {
      return;
    }

    setInput("");
    await sendMessage(message);
  };

  const isClearDisabled =
    messages.length === 0 || isSending || isLoadingHistory || !activeConversationId;

  return (
    <Card
      className={cn(
        "h-full min-h-0 gap-0 overflow-hidden py-0",
        compact
          ? "rounded-2xl"
          : "rounded-3xl border-border/60 bg-card shadow-lg shadow-black/5",
        className
      )}
    >
      <CardHeader className={cn("border-b pb-4", compact ? "pt-4" : "pt-6")}>
        {compact ? (
          <div className="space-y-3">
            <div className="space-y-1 pr-10">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <select
              value={activeConversationId || ""}
              onChange={(event) => {
                if (event.target.value) {
                  selectConversation(event.target.value);
                }
              }}
              disabled={isLoadingConversations || isSending || conversations.length === 0}
              className="h-8 w-full min-w-0 rounded-md border bg-background px-2 text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {conversations.length === 0 ? (
                <option value="">会話履歴はまだありません</option>
              ) : (
                conversations.map((conversation) => (
                  <option key={conversation.id} value={conversation.id}>
                    {conversation.title}
                  </option>
                ))
              )}
            </select>
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void createConversation();
                }}
                disabled={isLoadingConversations || isSending}
              >
                <Plus className="h-4 w-4" />
                新しいチャット
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void clearMessages();
                }}
                disabled={isClearDisabled}
              >
                <Trash2 className="h-4 w-4" />
                クリア
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
              <div className="flex items-center gap-2 pt-1">
                <select
                  value={activeConversationId || ""}
                  onChange={(event) => {
                    if (event.target.value) {
                      selectConversation(event.target.value);
                    }
                  }}
                  disabled={isLoadingConversations || isSending || conversations.length === 0}
                  className="h-8 min-w-44 rounded-md border bg-background px-2 text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {conversations.length === 0 ? (
                    <option value="">会話履歴はまだありません</option>
                  ) : (
                    conversations.map((conversation) => (
                      <option key={conversation.id} value={conversation.id}>
                        {conversation.title}
                      </option>
                    ))
                  )}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void createConversation();
                  }}
                  disabled={isLoadingConversations || isSending}
                >
                  <Plus className="h-4 w-4" />
                  新しいチャット
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void clearMessages();
              }}
              disabled={isClearDisabled}
            >
              <Trash2 className="h-4 w-4" />
              クリア
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-0">
        <div ref={scrollContainerRef} className="min-h-0 flex-1">
          <ScrollArea className="h-full px-4 pt-5 pb-3">
          {isLoadingHistory ? (
            <div className="flex h-full min-h-55 items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              履歴を読み込み中...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full min-h-55 items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              例: 「直近7日で締切が近いタスクを優先度順で教えて」
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[92%] space-y-1 rounded-2xl px-4 py-3 text-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={message.role === "user" ? "secondary" : "outline"}>
                        {message.role === "user" ? "あなた" : "AI"}
                      </Badge>
                      <span className="text-[11px] opacity-70">{formatTime(message.createdAt)}</span>
                    </div>
                    <div
                      className={cn(
                        "wrap-break-word [&_a]:underline [&_a]:underline-offset-2 [&_a]:text-inherit",
                        "[&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:opacity-90",
                        "[&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]",
                        "[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-black/10 [&_pre]:p-3",
                        "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
                        "[&_hr]:my-3 [&_hr]:border-current/20",
                        "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
                        "[&_li]:my-1 [&_p]:my-2 [&_h1]:my-2 [&_h1]:text-base [&_h1]:font-semibold",
                        "[&_h2]:my-2 [&_h2]:text-[15px] [&_h2]:font-semibold [&_h3]:my-1 [&_h3]:font-semibold",
                        "[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-current/20 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left",
                        "[&_td]:border [&_td]:border-current/20 [&_td]:px-2 [&_td]:py-1"
                      )}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}

              {isSending ? (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    回答を生成中...
                  </div>
                </div>
              ) : null}
            </div>
          )}
          </ScrollArea>
        </div>

        <form onSubmit={handleSubmit} className="shrink-0 border-t bg-card px-4 py-4">
          <div className="space-y-2">
            <Textarea
              placeholder="質問を入力してください（Shift+Enterで改行）"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => {
                isComposingRef.current = true;
              }}
              onCompositionEnd={() => {
                isComposingRef.current = false;
              }}
              rows={compact ? 3 : 4}
              maxLength={2000}
              disabled={isSending}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">{input.length}/2000</p>
              <Button type="submit" disabled={isSending || input.trim().length === 0}>
                送信
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
