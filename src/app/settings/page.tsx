"use client";

import { useEffect, useState } from "react";
import { Save, Plus, TestTube, Check, X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { AppConfig } from "@/types";

const DEFAULT_CONFIG: AppConfig = {
  defaultStages: [],
  industries: [],
  taskCategories: [],
  notion: {
    apiKey: "",
    databaseId: "",
    databaseType: "database",
    enabled: false,
  },
};

function normalizeConfig(data: unknown): AppConfig {
  const config = (data || {}) as Partial<AppConfig>;

  return {
    defaultStages: Array.isArray(config.defaultStages) ? config.defaultStages : [],
    industries: Array.isArray(config.industries) ? config.industries : [],
    taskCategories: Array.isArray(config.taskCategories)
      ? config.taskCategories
      : [],
    notion: {
      apiKey: config.notion?.apiKey || "",
      databaseId: config.notion?.databaseId || "",
      databaseType: (config.notion?.databaseType as any) || "database",
      enabled: Boolean(config.notion?.enabled),
    },
  };
}

export default function SettingsPage() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [notionApiKey, setNotionApiKey] = useState("");
  const [notionDbId, setNotionDbId] = useState("");
  const [notionDbType, setNotionDbType] = useState<"database" | "data_source">("database");
  const [notionEnabled, setNotionEnabled] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);
  const [databases, setDatabases] = useState<{ id: string; title: string; type: string }[]>([]);
  const [searchingDbs, setSearchingDbs] = useState(false);

  // Stages & industries editing
  const [stages, setStages] = useState<string[]>([]);
  const [newStage, setNewStage] = useState("");
  const [industries, setIndustries] = useState<string[]>([]);
  const [newIndustry, setNewIndustry] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const safeStages = Array.isArray(stages) ? stages : [];
  const safeIndustries = Array.isArray(industries) ? industries : [];
  const safeCategories = Array.isArray(categories) ? categories : [];

  useEffect(() => {
    fetch("/api/config")
      .then(async (r) => {
        if (!r.ok) {
          throw new Error("設定の取得に失敗しました");
        }
        return r.json();
      })
      .then((data) => {
        const normalized = normalizeConfig(data);
        setConfig(normalized);
        setNotionApiKey(normalized.notion.apiKey);
        setNotionDbId(normalized.notion.databaseId);
        setNotionDbType(normalized.notion.databaseType || "database");
        setNotionEnabled(normalized.notion.enabled);
        setStages(normalized.defaultStages);
        setIndustries(normalized.industries);
        setCategories(normalized.taskCategories);
      })
      .catch(() => {
        setConfig(DEFAULT_CONFIG);
        toast.error("設定の読み込みに失敗しました。初期値を表示しています。");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    const updated: AppConfig = {
      defaultStages: safeStages,
      industries: safeIndustries,
      taskCategories: safeCategories,
      notion: {
        apiKey: notionApiKey,
        databaseId: notionDbId,
        databaseType: notionDbType,
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

  const handleSearchDatabases = async () => {
    setSearchingDbs(true);
    try {
      const res = await fetch("/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search-databases", apiKey: notionApiKey }),
      });
      const data = await res.json();
      if (data.success && data.databases) {
        setDatabases(data.databases);
        if (data.databases.length === 0) {
          toast.info("データベースが見つかりませんでした");
        } else {
          toast.success(`${data.databases.length}件のデータベースが見つかりました`);
        }
      } else {
        toast.error(data.error || "データベースの検索に失敗しました");
      }
    } catch {
      toast.error("データベースの検索に失敗しました");
    }
    setSearchingDbs(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
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
          <div className="space-y-2">
            <Label>データベース</Label>
            <div className="flex gap-2">
              <Input
                value={notionDbId}
                onChange={(e) => setNotionDbId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="flex-1"
              />
              <Button 
                variant="secondary" 
                onClick={handleSearchDatabases}
                disabled={searchingDbs || !notionApiKey}
              >
                {searchingDbs ? "検索中..." : "検索"}
              </Button>
            </div>
            {databases.length > 0 && (
              <div className="mt-2 border rounded-md divide-y overflow-hidden max-h-60 overflow-y-auto">
                {databases.map(db => (
                  <div 
                    key={db.id} 
                    className="p-3 hover:bg-muted cursor-pointer flex justify-between items-center group"
                    onClick={() => {
                      setNotionDbId(db.id);
                      setNotionDbType(db.type as any);
                      setDatabases([]);
                    }}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{db.title}</span>
                        <Badge variant="secondary" className="text-[10px] py-0 h-4 bg-slate-100 text-slate-600 border-none font-normal">
                          {db.type === "data_source" ? "テーブル(Data Source)" : "共通(Database)"}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">{db.id}</span>
                    </div>
                    <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">選択</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              ※ 同期に失敗する場合は、別のデータベース（またはテーブル）を選択してみてください。
            </p>
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
            {safeStages.map((stage, i) => (
              <Badge key={i} variant="outline" className="gap-1 py-1">
                {stage}
                <button
                  onClick={() =>
                    setStages(safeStages.filter((_, idx) => idx !== i))
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
                  setStages([...safeStages, newStage]);
                  setNewStage("");
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (newStage) {
                  setStages([...safeStages, newStage]);
                  setNewStage("");
                }
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Industries */}
      <Card>
        <CardHeader>
          <CardTitle>業界リスト</CardTitle>
          <CardDescription>企業登録時に選択できる業界を管理</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {safeIndustries.map((industry, i) => (
              <Badge key={i} variant="outline" className="gap-1 py-1">
                {industry}
                <button
                  onClick={() =>
                    setIndustries(safeIndustries.filter((_, idx) => idx !== i))
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
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value)}
              placeholder="新しい業界"
              className="max-w-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newIndustry) {
                  setIndustries([...safeIndustries, newIndustry]);
                  setNewIndustry("");
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (newIndustry) {
                  setIndustries([...safeIndustries, newIndustry]);
                  setNewIndustry("");
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
            {safeCategories.map((cat, i) => (
              <Badge key={i} variant="outline" className="gap-1 py-1">
                {cat}
                <button
                  onClick={() =>
                    setCategories(safeCategories.filter((_, idx) => idx !== i))
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
                  setCategories([...safeCategories, newCategory]);
                  setNewCategory("");
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (newCategory) {
                  setCategories([...safeCategories, newCategory]);
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
