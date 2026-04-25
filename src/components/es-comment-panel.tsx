"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Check,
  Trash2,
  Edit3,
  X,
  Send,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ESComment } from "@/types";

interface ESCommentPanelProps {
  comments: ESComment[];
  activeCommentId?: string | null;
  onAddComment: (content: string) => void;
  onUpdateComment: (commentId: string, content: string) => void;
  onResolveComment: (commentId: string, resolved: boolean) => void;
  onDeleteComment: (commentId: string) => void;
  onCommentClick: (comment: ESComment) => void;
  showAddForm: boolean;
  selectedText: string;
  onCancelAdd: () => void;
}

export function ESCommentPanel({
  comments,
  activeCommentId,
  onAddComment,
  onUpdateComment,
  onResolveComment,
  onDeleteComment,
  onCommentClick,
  showAddForm,
  selectedText,
  onCancelAdd,
}: ESCommentPanelProps) {
  const [newCommentText, setNewCommentText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const addFormRef = useRef<HTMLTextAreaElement>(null);

  const unresolvedComments = comments.filter((c) => !c.resolved);
  const resolvedComments = comments.filter((c) => c.resolved);

  useEffect(() => {
    if (showAddForm && addFormRef.current) {
      addFormRef.current.focus();
    }
  }, [showAddForm]);

  const handleSubmitNew = () => {
    if (!newCommentText.trim()) return;
    onAddComment(newCommentText.trim());
    setNewCommentText("");
  };

  const handleSubmitEdit = (id: string) => {
    if (!editingText.trim()) return;
    onUpdateComment(id, editingText.trim());
    setEditingId(null);
    setEditingText("");
  };

  const handleStartEdit = (comment: ESComment) => {
    setEditingId(comment.id);
    setEditingText(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  return (
    <div className="es-comment-panel">
      {/* Header */}
      <div className="es-comment-panel-header">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold">コメント</span>
          {unresolvedComments.length > 0 && (
            <span className="es-comment-badge">
              {unresolvedComments.length}
            </span>
          )}
        </div>
      </div>

      {/* New Comment Form */}
      {showAddForm && (
        <div className="es-comment-add-form">
          <div className="es-comment-quote">
            <span className="es-comment-quote-label">選択テキスト</span>
            <p className="es-comment-quote-text">{selectedText || "…"}</p>
          </div>
          <Textarea
            ref={addFormRef}
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="コメントを入力..."
            className="es-comment-textarea"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmitNew();
              }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">⌘+Enter で送信</span>
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNewCommentText("");
                  onCancelAdd();
                }}
                className="h-7 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                キャンセル
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitNew}
                disabled={!newCommentText.trim()}
                className="h-7 px-3 text-xs"
              >
                <Send className="h-3 w-3 mr-1" />
                追加
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Comment List */}
      <div className="es-comment-list">
        {unresolvedComments.length === 0 && !showAddForm && (
          <div className="es-comment-empty">
            <MessageSquare className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground text-center">
              テキストを選択して
              <br />
              コメントを追加しましょう
            </p>
          </div>
        )}

        {unresolvedComments.map((comment) => (
          <div
            key={comment.id}
            className={cn(
              "es-comment-card",
              activeCommentId === comment.id && "is-active"
            )}
            onClick={() => onCommentClick(comment)}
          >
            <div className="es-comment-card-quote">
              「{comment.highlightedText}」
            </div>

            {editingId === comment.id ? (
              <div className="space-y-2">
                <Textarea
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  className="es-comment-textarea"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleSubmitEdit(comment.id);
                    }
                    if (e.key === "Escape") {
                      handleCancelEdit();
                    }
                  }}
                  autoFocus
                />
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}
                    className="h-6 px-2 text-[10px]"
                  >
                    キャンセル
                  </Button>
                  <Button
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleSubmitEdit(comment.id); }}
                    disabled={!editingText.trim()}
                    className="h-6 px-2 text-[10px]"
                  >
                    保存
                  </Button>
                </div>
              </div>
            ) : (
              <p className="es-comment-card-content">{comment.content}</p>
            )}

            <div className="es-comment-card-footer">
              <span className="es-comment-card-time">
                {new Date(comment.createdAt).toLocaleString("ja-JP", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <div className="es-comment-card-actions">
                <button
                  onClick={(e) => { e.stopPropagation(); handleStartEdit(comment); }}
                  title="編集"
                  className="es-comment-action-btn"
                >
                  <Edit3 className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onResolveComment(comment.id, true); }}
                  title="解決済みにする"
                  className="es-comment-action-btn es-comment-action-resolve"
                >
                  <Check className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("このコメントを削除しますか？")) {
                      onDeleteComment(comment.id);
                    }
                  }}
                  title="削除"
                  className="es-comment-action-btn es-comment-action-delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Resolved Section */}
        {resolvedComments.length > 0 && (
          <div className="es-comment-resolved-section">
            <button
              onClick={() => setShowResolved(!showResolved)}
              className="es-comment-resolved-toggle"
            >
              {showResolved ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              <span>解決済み ({resolvedComments.length})</span>
            </button>

            {showResolved &&
              resolvedComments.map((comment) => (
                <div
                  key={comment.id}
                  className="es-comment-card is-resolved"
                  onClick={() => onCommentClick(comment)}
                >
                  <div className="es-comment-card-quote">
                    「{comment.highlightedText}」
                  </div>
                  <p className="es-comment-card-content">{comment.content}</p>
                  <div className="es-comment-card-footer">
                    <span className="es-comment-card-time">
                      {new Date(comment.createdAt).toLocaleString("ja-JP", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <div className="es-comment-card-actions">
                      <button
                        onClick={(e) => { e.stopPropagation(); onResolveComment(comment.id, false); }}
                        title="未解決に戻す"
                        className="es-comment-action-btn"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("このコメントを削除しますか？")) {
                            onDeleteComment(comment.id);
                          }
                        }}
                        title="削除"
                        className="es-comment-action-btn es-comment-action-delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
