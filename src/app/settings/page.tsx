"use client";

import { useEffect, useState } from "react";
import { 
  Save, 
  Plus, 
  TestTube, 
  Check, 
  X, 
  Settings, 
  Share2, 
  Layers, 
  Tag, 
  Building2,
  Database,
  ExternalLink,
  Loader2,
  Search,
  ChevronRight,
  ListChecks,
  GripVertical,
  IdCard
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { cn } from "@/lib/utils";

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
  interviewStatuses: ["通過", "結果待ち", "不合格"],
  testCenterId: "",
};

function normalizeConfig(data: unknown): AppConfig {
  const config = (data || {}) as Partial<AppConfig>;

  return {
    defaultStages: Array.isArray(config.defaultStages) ? config.defaultStages : [],
    industries: Array.isArray(config.industries) ? config.industries : [],
    taskCategories: Array.isArray(config.taskCategories)
      ? config.taskCategories
      : [],
    interviewStatuses: Array.isArray(config.interviewStatuses) ? config.interviewStatuses : ["通過", "結果待ち", "不合格"],
    testCenterId: typeof config.testCenterId === "string" ? config.testCenterId : "",
    notion: {
      apiKey: config.notion?.apiKey || "",
      databaseId: config.notion?.databaseId || "",
      databaseType: (config.notion?.databaseType as any) || "database",
      enabled: Boolean(config.notion?.enabled),
    },
  };
}

function SortableBadge({ id, children, onRemove }: { id: string; children: React.ReactNode; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("inline-flex items-center touch-manipulation", isDragging && "relative z-50")}
    >
      <Badge
        variant="secondary"
        className={cn(
          "pl-2 pr-1.5 py-1.5 rounded-xl font-bold bg-white/60 border border-white/40 group",
          isDragging && "shadow-lg scale-105 border-primary/40 ring-2 ring-primary/20"
        )}
      >
        <div 
          {...attributes} 
          {...listeners} 
          className="cursor-grab active:cursor-grabbing hover:bg-black/5 rounded mr-1.5 p-0.5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        {children}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-2 h-5 w-5 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </Badge>
    </div>
  );
}

export default function SettingsPage() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [testCenterId, setTestCenterId] = useState("");
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
  const [interviewStatuses, setInterviewStatuses] = useState<string[]>([]);
  const [newInterviewStatus, setNewInterviewStatus] = useState("");
  const safeStages = Array.isArray(stages) ? stages : [];
  const safeIndustries = Array.isArray(industries) ? industries : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeInterviewStatuses = Array.isArray(interviewStatuses) ? interviewStatuses : [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
        setInterviewStatuses(normalized.interviewStatuses);
        setTestCenterId(normalized.testCenterId);
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
      interviewStatuses: safeInterviewStatuses,
      testCenterId,
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
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/20 bg-card p-4 sm:p-8 shadow-xl shadow-primary/5">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 h-48 w-48 rounded-full bg-slate-500/10 blur-[60px]" />
        <div className="absolute bottom-0 left-0 -ml-12 -mb-12 h-48 w-48 rounded-full bg-slate-500/10 blur-[60px]" />
        
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground flex items-center gap-2 sm:gap-3">
              <Settings className="h-7 w-7 sm:h-10 sm:w-10 text-primary" />
              設定
            </h1>
            <p className="text-muted-foreground mt-1 font-medium text-sm sm:text-base">
              アプリケーションの動作環境とデータ連携を管理しましょう
            </p>
          </div>
          <Button 
            onClick={handleSave}
            className="rounded-2xl h-11 sm:h-12 px-6 sm:px-8 font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-0.5 w-full sm:w-auto"
          >
            <Save className="h-5 w-5 mr-2" />
            設定を保存
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* User Information */}
        <Card className="border-none glass shadow-xl shadow-primary/5 rounded-3xl overflow-hidden md:col-span-2">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-4 mb-2">
               <div className="h-12 w-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-lg">
                  <IdCard className="h-7 w-7" />
               </div>
               <div>
                  <CardTitle className="text-2xl font-bold">ユーザー情報</CardTitle>
                  <CardDescription className="font-medium font-bold">基本情報や各種IDを設定します</CardDescription>
               </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-4 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-3">
                  <Label className="text-sm font-bold flex items-center gap-2">
                     <div className="h-2 w-2 rounded-full bg-primary" />
                     テストセンターID
                  </Label>
                  <Input
                    value={testCenterId}
                    onChange={(e) => setTestCenterId(e.target.value)}
                    placeholder="例: TC-1234567"
                    className="h-12 rounded-xl border-none glass bg-white/60 focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                  <p className="text-[10px] text-muted-foreground px-1 font-bold">よく使う共通のIDを登録しておくと便利です</p>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Notion Settings */}
        <Card className="border-none glass shadow-xl shadow-primary/5 rounded-3xl overflow-hidden md:col-span-2">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-4 mb-2">
               <div className="h-12 w-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-lg">
                  <Share2 className="h-7 w-7" />
               </div>
               <div>
                  <CardTitle className="text-2xl font-bold">Notion連携</CardTitle>
                  <CardDescription className="font-medium font-bold">Notion APIを使ってタスクを同期し、外部から管理できます</CardDescription>
               </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-4 space-y-8">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/20">
              <Checkbox
                id="notion-enabled"
                checked={notionEnabled}
                onCheckedChange={(v) => setNotionEnabled(!!v)}
                className="h-5 w-5 rounded-md"
              />
              <Label htmlFor="notion-enabled" className="text-base font-bold cursor-pointer">Notion連携を有効にする</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-3">
                  <Label className="text-sm font-bold flex items-center gap-2">
                     <div className="h-2 w-2 rounded-full bg-primary" />
                     Notion API Key
                  </Label>
                  <Input
                    type="password"
                    value={notionApiKey}
                    onChange={(e) => setNotionApiKey(e.target.value)}
                    placeholder="secret_..."
                    className="h-12 rounded-xl border-none glass bg-white/60 focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                  <p className="text-[10px] text-muted-foreground px-1 font-bold">Internal Integration Tokenを使用してください</p>
               </div>

               <div className="space-y-3">
                  <Label className="text-sm font-bold flex items-center gap-2">
                     <div className="h-2 w-2 rounded-full bg-primary" />
                     データベースID
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={notionDbId}
                      onChange={(e) => setNotionDbId(e.target.value)}
                      placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="h-12 rounded-xl border-none glass bg-white/60 focus-visible:ring-2 focus-visible:ring-primary/20 flex-grow font-mono text-sm"
                    />
                    <Button 
                      variant="outline" 
                      className="h-12 rounded-xl px-4 border-2 font-bold"
                      onClick={handleSearchDatabases}
                      disabled={searchingDbs || !notionApiKey}
                    >
                      {searchingDbs ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5 mr-2" />}
                      {searchingDbs ? "検索中" : "検索"}
                    </Button>
                  </div>
                  {databases.length > 0 && (
                    <div className="mt-2 rounded-2xl glass border border-white/20 overflow-hidden divide-y divide-white/10 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                      {databases.map(db => (
                        <button 
                          key={db.id} 
                          className="w-full p-4 hover:bg-muted/50 dark:hover:bg-muted/20 transition-colors text-left flex justify-between items-center group"
                          onClick={() => {
                            setNotionDbId(db.id);
                            setNotionDbType(db.type as any);
                            setDatabases([]);
                            toast.success("データベースを選択しました");
                          }}
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm">{db.title || "Untitled Database"}</span>
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded-full font-bold uppercase tracking-widest bg-white/50">
                                {db.type === "data_source" ? "Table" : "Database"}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono opacity-60">{db.id}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0" />
                        </button>
                      ))}
                    </div>
                  )}
               </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-white/10">
               <Button
                 variant="secondary"
                 className="rounded-xl h-11 px-6 font-bold flex-grow sm:flex-grow-0"
                 onClick={handleTestNotion}
                 disabled={testing || !notionApiKey || !notionDbId}
               >
                 <TestTube className="mr-2 h-4 w-4" />
                 {testing ? "接続テスト中..." : "接続テスト"}
               </Button>
               {testResult && (
                 <div
                   className={cn(
                     "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm animate-in zoom-in-95",
                     testResult.success ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"
                   )}
                 >
                   {testResult.success ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                   {testResult.message}
                 </div>
               )}
            </div>
          </CardContent>
        </Card>

        {/* Master Data Managers */}
        {[
          { 
            id: "stages",
            title: "選考ステージ", 
            desc: "企業に設定される選考フェーズ", 
            data: safeStages, 
            setData: setStages, 
            newVal: newStage, 
            setNewVal: setNewStage,
            icon: <Layers className="h-6 w-6" />,
            color: "bg-blue-500"
          },
          { 
            id: "industries",
            title: "業界リスト", 
            desc: "分類に使用する業界一覧", 
            data: safeIndustries, 
            setData: setIndustries, 
            newVal: newIndustry, 
            setNewVal: setNewIndustry,
            icon: <Building2 className="h-6 w-6" />,
            color: "bg-violet-500"
          },
          { 
            id: "categories",
            title: "タスクカテゴリ", 
            desc: "タスクの目的別分類設定", 
            data: safeCategories, 
            setData: setCategories, 
            newVal: newCategory, 
            setNewVal: setNewCategory,
            icon: <Tag className="h-6 w-6" />,
            color: "bg-fuchsia-500"
          },
          { 
            id: "interviewStatuses",
            title: "面接ステータス", 

            desc: "面接記録のステータスとして使用する選択肢", 
            data: safeInterviewStatuses, 
            setData: setInterviewStatuses, 
            newVal: newInterviewStatus, 
            setNewVal: setNewInterviewStatus,
            icon: <ListChecks className="h-6 w-6" />,
            color: "bg-emerald-500"
          }
        ].map((section, idx) => (
          <Card key={idx} className={cn("border-none glass rounded-3xl overflow-hidden shadow-xl shadow-primary/5")}>
            <CardHeader className="p-6 pb-2">
              <div className="flex items-center gap-3 mb-2">
                 <div className={cn("h-10 w-10 rounded-xl text-white flex items-center justify-center shadow-md", section.color)}>
                    {section.icon}
                 </div>
                 <div>
                    <CardTitle className="text-lg font-bold">{section.title}</CardTitle>
                    <CardDescription className="text-xs font-bold">{section.desc}</CardDescription>
                 </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => {
                  const { active, over } = event;
                  if (over && active.id !== over.id) {
                    const sortableItems = section.data.map((val) => ({ id: `${section.id}-${val}`, value: val }));
                    const oldIndex = sortableItems.findIndex((x) => x.id === active.id);
                    const newIndex = sortableItems.findIndex((x) => x.id === over.id);
                    if (oldIndex !== -1 && newIndex !== -1) {
                      section.setData(arrayMove(section.data, oldIndex, newIndex));
                    }
                  }
                }}
              >
                <SortableContext
                  items={section.data.map((val) => `${section.id}-${val}`)}
                  strategy={rectSortingStrategy}
                >
                  <div className="flex flex-wrap gap-2">
                    {section.data.map((item, i) => (
                      <SortableBadge 
                        key={`${section.id}-${item}-${i}`} 
                        id={`${section.id}-${item}`} 
                        onRemove={() => section.setData(section.data.filter((_, idx) => idx !== i))}
                      >
                        {item}
                      </SortableBadge>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <div className="flex gap-2">
                <Input
                  value={section.newVal}
                  onChange={(e) => section.setNewVal(e.target.value)}
                  placeholder="追加する項目を入力..."
                  className="h-10 rounded-xl border-none glass bg-white/60 focus-visible:ring-2 focus-visible:ring-primary/20 flex-grow text-sm font-bold"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && section.newVal) {
                      if (!section.data.includes(section.newVal)) {
                        section.setData([...section.data, section.newVal]);
                        section.setNewVal("");
                      } else {
                        toast.error("既に存在する項目です");
                      }
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 w-10 p-0 rounded-xl border-2 hover:bg-primary hover:text-white transition-all shadow-sm"
                  onClick={() => {
                    if (section.newVal) {
                      if (!section.data.includes(section.newVal)) {
                        section.setData([...section.data, section.newVal]);
                        section.setNewVal("");
                      } else {
                        toast.error("既に存在する項目です");
                      }
                    }
                  }}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
