"use client";

import { useEffect, useState } from "react";
import { Save, Plus, Trash2, TestTube, Check, X } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { AppConfig } from "@/types";

export default function SettingsPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [notionApiKey, setNotionApiKey] = useState("");
  const [notionDbId, setNotionDbId] = useState("");
  const [notionEnabled, setNotionEnabled] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);

  // Stages & Tags editing
  const [stages, setStages] = useState<string[]>([]);
  const [newStage, setNewStage] = useState("");
  const [tags, setTags] = useState<{ name: string; color: string }[]>([]);
  const [newTag, setNewTag] = useState({ name: "", color: "blue" });
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data: AppConfig) => {
        setConfig(data);
        setNotionApiKey(data.notion.apiKey);
        setNotionDbId(data.notion.databaseId);
        setNotionEnabled(data.notion.enabled);
        setStages(data.defaultStages);
        setTags(data.tags);
        setCategories(data.taskCategories);
      });
  }, []);

  const handleSave = async () => {
    const updated: AppConfig = {
      defaultStages: stages,
      tags,
      taskCategories: categories,
      notion: {
        apiKey: notionApiKey,
        databaseId: notionDbId,
        enabled: notionEnabled,
      },
    };
    await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    toast.success("設定を保存しました");
  };

  const handleTestNotion = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          apiKey: notionApiKey,
          databaseId: notionDbId,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, message: "接続テストに失敗しました" });
    }
    setTesting(false);
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  const colorOptions = [
    "blue",
    "green",
    "purple",
    "orange",
    "red",
    "pink",
    "yellow",
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">設定</h1>
          <p className="text-muted-foreground">アプリの設定を管理</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" /> 設定を保存
        </Button>
      </div>

      {/* Notion Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notion連携</CardTitle>
          <CardDescription>
            Notion APIを使ってタスクを同期します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={notionEnabled}
              onCheckedChange={(v) => setNotionEnabled(!!v)}
            />
            <Label>Notion連携を有効にする</Label>
          </div>
          <div>
            <Label>Notion API Key</Label>
            <Input
              type="password"
              value={notionApiKey}
              onChange={(e) => setNotionApiKey(e.target.value)}
              placeholder="secret_..."
            />
          </div>
          <div>
            <Label>データベースID</Label>
            <Input
              value={notionDbId}
              onChange={(e) => setNotionDbId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleTestNotion}
              disabled={testing || !notionApiKey || !notionDbId}
            >
              <TestTube className="mr-2 h-4 w-4" />
              {testing ? "テスト中..." : "接続テスト"}
            </Button>
            {testResult && (
              <div
                className={`flex items-center gap-1 text-sm ${
                  testResult.success ? "text-green-600" : "text-red-600"
                }`}
              >
                {testResult.success ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                {testResult.message}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Default Stages */}
      <Card>
        <CardHeader>
          <CardTitle>デフォルト選考ステージ</CardTitle>
          <CardDescription>
            新しい企業に自動設定される選考ステージ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {stages.map((stage, i) => (
              <Badge key={i} variant="outline" className="gap-1 py-1">
                {stage}
                <button
                  onClick={() =>
                    setStages(stages.filter((_, idx) => idx !== i))
                  }
                  className="ml-1 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newStage}
              onChange={(e) => setNewStage(e.target.value)}
              placeholder="新しいステージ"
              className="max-w-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newStage) {
                  setStages([...stages, newStage]);
                  setNewStage("");
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (newStage) {
                  setStages([...stages, newStage]);
                  setNewStage("");
                }
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle>タグ管理</CardTitle>
          <CardDescription>企業に付けられるタグを管理</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, i) => (
              <Badge key={i} variant="outline" className="gap-1 py-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: {
                      blue: "#3b82f6",
                      green: "#22c55e",
                      purple: "#a855f7",
                      orange: "#f97316",
                      red: "#ef4444",
                      pink: "#ec4899",
                      yellow: "#eab308",
                    }[tag.color] || "#9ca3af",
                  }}
                />
                {tag.name}
                <button
                  onClick={() => setTags(tags.filter((_, idx) => idx !== i))}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <Input
              value={newTag.name}
              onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
              placeholder="タグ名"
              className="max-w-xs"
            />
            <select
              value={newTag.color}
              onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
              className="border rounded px-2 py-1.5 text-sm"
            >
              {colorOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (newTag.name) {
                  setTags([...tags, newTag]);
                  setNewTag({ name: "", color: "blue" });
                }
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Task Categories */}
      <Card>
        <CardHeader>
          <CardTitle>タスクカテゴリ</CardTitle>
          <CardDescription>タスクの分類に使うカテゴリ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat, i) => (
              <Badge key={i} variant="outline" className="gap-1 py-1">
                {cat}
                <button
                  onClick={() =>
                    setCategories(categories.filter((_, idx) => idx !== i))
                  }
                  className="ml-1 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="新しいカテゴリ"
              className="max-w-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newCategory) {
                  setCategories([...categories, newCategory]);
                  setNewCategory("");
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (newCategory) {
                  setCategories([...categories, newCategory]);
                  setNewCategory("");
                }
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
