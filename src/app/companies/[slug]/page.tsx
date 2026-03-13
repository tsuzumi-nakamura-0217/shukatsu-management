"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Star,
  ExternalLink,
  MapPin,
  Trash2,
  Plus,
  Save,
  FileText,
  MessageSquare,
  CheckSquare,
  BookOpen,
  Edit,
  Loader2,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge, PriorityBadge } from "@/components/badges";
import { MarkdownEditor, MarkdownViewer } from "@/components/markdown-editor";
import { toast } from "sonner";
import type { Company, Task, Interview, ESDocument, AppConfig } from "@/types";

export default function CompanyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [esDocs, setEsDocs] = useState<ESDocument[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [memoContent, setMemoContent] = useState("");
  const [editingCompany, setEditingCompany] = useState<Partial<Company>>({});

  // Dialogs
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newInterviewOpen, setNewInterviewOpen] = useState(false);
  const [newEsOpen, setNewEsOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isCreatingInterview, setIsCreatingInterview] = useState(false);
  const [isCreatingEs, setIsCreatingEs] = useState(false);
  const [editEsDoc, setEditEsDoc] = useState<ESDocument | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);

  // New item forms
  const [newTask, setNewTask] = useState<{ title: string; category: string; priority: string; deadline: string; memo: string; completed: boolean }>({ title: "", category: "その他", priority: "medium", deadline: "", memo: "", completed: false });
  const [newInterview, setNewInterview] = useState({ type: "", date: "", location: "", result: "結果待ち", memo: "" });
  const [newEs, setNewEs] = useState({ title: "", content: "" });

  function fetchAll() {
    Promise.all([
      fetch(`/api/companies/${slug}`).then((r) => r.json()),
      fetch(`/api/tasks?companySlug=${slug}`).then((r) => r.json()),
      fetch(`/api/companies/${slug}/interviews`).then((r) => r.json()),
      fetch(`/api/companies/${slug}/es`).then((r) => r.json()),
      fetch("/api/config").then((r) => r.json()),
    ]).then(([companyData, tasksData, interviewsData, esData, configData]) => {
      setCompany(companyData);
      setMemoContent(companyData.memo || "");
      setEditingCompany(companyData);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setInterviews(Array.isArray(interviewsData) ? interviewsData : []);
      setEsDocs(Array.isArray(esData) ? esData : []);
      setConfig(configData);
    });
  }

  useEffect(() => {
    fetchAll();
  }, [slug]);

  const handleSaveCompany = async () => {
    const res = await fetch(`/api/companies/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editingCompany, memo: memoContent }),
    });
    if (res.ok) {
      toast.success("企業情報を保存しました");
      setEditMode(false);
      fetchAll();
    }
  };

  const handleDeleteCompany = async () => {
    if (!confirm("この企業を削除しますか？関連するタスクも削除されます。")) return;
    const res = await fetch(`/api/companies/${slug}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("企業を削除しました");
      router.push("/companies");
    }
  };

  const handleUpdateStatus = async (status: string) => {
    const res = await fetch(`/api/companies/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success("ステータスを更新しました");
      fetchAll();
    }
  };

  const handleCreateTask = async () => {
    if (isCreatingTask) return;
    setIsCreatingTask(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newTask, companySlug: slug }),
      });
      if (res.ok) {
        toast.success("タスクを追加しました");
        setNewTaskOpen(false);
        setNewTask({ title: "", category: "その他", priority: "medium", deadline: "", memo: "", completed: false });
        fetchAll();
      }
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleToggleTask = async (task: Task) => {
    await fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, completed: !task.completed }),
    });
    fetchAll();
  };

  const handleSaveTask = async () => {
    if (!editingTask) return;
    await fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingTask),
    });
    toast.success("タスクを更新しました");
    setEditingTask(null);
    fetchAll();
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("このタスクを削除しますか？")) return;
    await fetch("/api/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    toast.success("タスクを削除しました");
    fetchAll();
  };

  const handleCreateInterview = async () => {
    if (isCreatingInterview) return;
    setIsCreatingInterview(true);
    try {
      const res = await fetch(`/api/companies/${slug}/interviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newInterview),
      });
      if (res.ok) {
        toast.success("面接記録を追加しました");
        setNewInterviewOpen(false);
        setNewInterview({ type: "", date: "", location: "", result: "結果待ち", memo: "" });
        fetchAll();
      }
    } finally {
      setIsCreatingInterview(false);
    }
  };

  const handleSaveInterview = async () => {
    if (!editingInterview) return;
    await fetch(`/api/companies/${slug}/interviews`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingInterview),
    });
    toast.success("面接記録を更新しました");
    setEditingInterview(null);
    fetchAll();
  };

  const handleDeleteInterview = async (id: string) => {
    if (!confirm("この面接記録を削除しますか？")) return;
    await fetch(`/api/companies/${slug}/interviews`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    toast.success("面接記録を削除しました");
    fetchAll();
  };

  const handleCreateEs = async () => {
    if (isCreatingEs) return;
    setIsCreatingEs(true);
    try {
      const res = await fetch(`/api/companies/${slug}/es`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEs),
      });
      if (res.ok) {
        toast.success("文書を作成しました");
        setNewEsOpen(false);
        setNewEs({ title: "", content: "" });
        fetchAll();
      }
    } finally {
      setIsCreatingEs(false);
    }
  };

  const handleSaveEs = async (doc: ESDocument) => {
    await fetch(`/api/companies/${slug}/es`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: doc.id, title: doc.title, content: doc.content }),
    });
    toast.success("文書を保存しました");
    setEditEsDoc(null);
    fetchAll();
  };

  if (!company) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">読み込み中...</p></div>;
  }

  const stages = company.stages || config?.defaultStages || [];
  const currentStageIndex = stages.indexOf(company.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/companies")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> 企業一覧
        </Button>
      </div>

      {/* Company Info Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-muted-foreground">
            {company.industry && <span>{company.industry}</span>}
            {company.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {company.location}
              </span>
            )}
            {company.url && (
              <a href={company.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:underline">
                <ExternalLink className="h-3 w-3" /> Webサイト
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-5 w-5 cursor-pointer ${i < company.priority ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`}
                onClick={async () => {
                  await fetch(`/api/companies/${slug}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ priority: i + 1 }),
                  });
                  fetchAll();
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
          <Button variant="outline" size="sm" onClick={() => setEditMode(!editMode)}>
            <Edit className="mr-2 h-4 w-4" /> {editMode ? "キャンセル" : "編集"}
          </Button>
          {editMode && (
            <Button size="sm" onClick={handleSaveCompany}>
              <Save className="mr-2 h-4 w-4" /> 保存
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={handleDeleteCompany}>
            <Trash2 className="mr-2 h-4 w-4" /> 削除
          </Button>
        </div>
      </div>

      {/* Pipeline Stepper */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">選考パイプライン</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {stages.map((stage, i) => {
              const isCurrent = stage === company.status;
              const isPast = i < currentStageIndex;
              return (
                <button
                  key={stage}
                  onClick={() => handleUpdateStatus(stage)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : isPast
                      ? "bg-green-100 text-green-800"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {stage}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Mode - Company Info */}
      {editMode && (
        <Card>
          <CardHeader>
            <CardTitle>企業情報編集</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>企業名</Label>
                <Input value={editingCompany.name || ""} onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })} />
              </div>
              <div>
                <Label>業界</Label>
                <Select
                  value={editingCompany.industry || ""}
                  onValueChange={(value) =>
                    setEditingCompany({ ...editingCompany, industry: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="業界を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {(config?.industries || []).map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>URL</Label>
                <Input value={editingCompany.url || ""} onChange={(e) => setEditingCompany({ ...editingCompany, url: e.target.value })} />
              </div>
              <div>
                <Label>所在地</Label>
                <Input value={editingCompany.location || ""} onChange={(e) => setEditingCompany({ ...editingCompany, location: e.target.value })} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="es" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="es" className="gap-2">
            <FileText className="h-4 w-4" /> ES・志望動機
          </TabsTrigger>
          <TabsTrigger value="interviews" className="gap-2">
            <MessageSquare className="h-4 w-4" /> 面接記録
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <CheckSquare className="h-4 w-4" /> タスク
          </TabsTrigger>
          <TabsTrigger value="memo" className="gap-2">
            <BookOpen className="h-4 w-4" /> 企業研究メモ
          </TabsTrigger>
        </TabsList>

        {/* ES Tab */}
        <TabsContent value="es" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold">ES・志望動機</h3>
            <Dialog open={newEsOpen} onOpenChange={setNewEsOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" /> 新規作成</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新しい文書を作成</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>タイトル</Label>
                    <Input value={newEs.title} onChange={(e) => setNewEs({ ...newEs, title: e.target.value })} placeholder="エントリーシート" />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreateEs}
                    disabled={isCreatingEs}
                    className="transition-transform active:scale-95"
                  >
                    {isCreatingEs ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        作成中...
                      </>
                    ) : (
                      "作成"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {esDocs.length === 0 ? (
            <Card><CardContent className="py-8"><p className="text-center text-muted-foreground">まだ文書がありません</p></CardContent></Card>
          ) : (
            <div className="space-y-4">
              {esDocs.map((doc) => (
                <Card key={doc.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{doc.title}</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditEsDoc(doc)}>
                          <Edit className="mr-1 h-3 w-3" /> 編集
                        </Button>
                      </div>
                    </div>
                    <CardDescription>更新: {doc.updatedAt}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {editEsDoc?.id === doc.id ? (
                      <div className="space-y-2">
                        <MarkdownEditor value={editEsDoc.content} onChange={(val) => setEditEsDoc({ ...editEsDoc, content: val })} />
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => setEditEsDoc(null)}>キャンセル</Button>
                          <Button size="sm" onClick={() => handleSaveEs(editEsDoc)}>保存</Button>
                        </div>
                      </div>
                    ) : (
                      <MarkdownViewer content={doc.content} />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Interviews Tab */}
        <TabsContent value="interviews" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold">面接記録</h3>
            <Dialog open={newInterviewOpen} onOpenChange={setNewInterviewOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" /> 面接を追加</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>面接記録を追加</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>面接タイプ *</Label>
                    <Input value={newInterview.type} onChange={(e) => setNewInterview({ ...newInterview, type: e.target.value })} placeholder="1次面接" />
                  </div>
                  <div>
                    <Label>日付 *</Label>
                    <Input type="date" value={newInterview.date} onChange={(e) => setNewInterview({ ...newInterview, date: e.target.value })} />
                  </div>
                  <div>
                    <Label>場所</Label>
                    <Input value={newInterview.location} onChange={(e) => setNewInterview({ ...newInterview, location: e.target.value })} placeholder="オンライン / 本社" />
                  </div>
                  <div>
                    <Label>結果</Label>
                    <Select
                      value={newInterview.result}
                      onValueChange={(value) =>
                        setNewInterview({ ...newInterview, result: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="結果待ち">結果待ち</SelectItem>
                        <SelectItem value="通過">通過</SelectItem>
                        <SelectItem value="不合格">不合格</SelectItem>
                        <SelectItem value="辞退">辞退</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>メモ</Label>
                    <Textarea value={newInterview.memo} onChange={(e) => setNewInterview({ ...newInterview, memo: e.target.value })} placeholder="聞かれたこと、感想など" />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreateInterview}
                    disabled={isCreatingInterview}
                    className="transition-transform active:scale-95"
                  >
                    {isCreatingInterview ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        追加中...
                      </>
                    ) : (
                      "追加"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {interviews.length === 0 ? (
            <Card><CardContent className="py-8"><p className="text-center text-muted-foreground">まだ面接記録がありません</p></CardContent></Card>
          ) : (
            <div className="space-y-4">
              {interviews.sort((a, b) => b.date.localeCompare(a.date)).map((interview) => (
                <Card key={interview.id}>
                  {editingInterview?.id === interview.id ? (
                    <CardContent className="pt-6 space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <Label>面接タイプ</Label>
                          <Input
                            value={editingInterview.type}
                            onChange={(e) =>
                              setEditingInterview({
                                ...editingInterview,
                                type: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>日付</Label>
                          <Input
                            type="date"
                            value={editingInterview.date}
                            onChange={(e) =>
                              setEditingInterview({
                                ...editingInterview,
                                date: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>場所</Label>
                          <Input
                            value={editingInterview.location}
                            onChange={(e) =>
                              setEditingInterview({
                                ...editingInterview,
                                location: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>結果</Label>
                          <Select
                            value={editingInterview.result}
                            onValueChange={(value) =>
                              setEditingInterview({
                                ...editingInterview,
                                result: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="結果待ち">結果待ち</SelectItem>
                              <SelectItem value="通過">通過</SelectItem>
                              <SelectItem value="不合格">不合格</SelectItem>
                              <SelectItem value="辞退">辞退</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>メモ</Label>
                        <Textarea
                          value={editingInterview.memo}
                          onChange={(e) =>
                            setEditingInterview({
                              ...editingInterview,
                              memo: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingInterview(null)}>
                          キャンセル
                        </Button>
                        <Button size="sm" onClick={handleSaveInterview}>保存</Button>
                      </div>
                    </CardContent>
                  ) : (
                    <>
                      <CardHeader className="pb-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <CardTitle className="text-base">{interview.type}</CardTitle>
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={interview.result} />
                            <span className="text-sm text-muted-foreground">{interview.date}</span>
                            <Button variant="outline" size="sm" onClick={() => setEditingInterview(interview)}>
                              <Edit className="mr-1 h-3 w-3" /> 編集
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteInterview(interview.id)}>
                              <Trash2 className="mr-1 h-3 w-3" /> 削除
                            </Button>
                          </div>
                        </div>
                        {interview.location && (
                          <CardDescription>📍 {interview.location}</CardDescription>
                        )}
                      </CardHeader>
                      {interview.memo && (
                        <CardContent>
                          <MarkdownViewer content={interview.memo} />
                        </CardContent>
                      )}
                    </>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold">タスク</h3>
            <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" /> タスク追加</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>タスクを追加</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>タイトル *</Label>
                    <Input value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} placeholder="ES提出" />
                  </div>
                  <div>
                    <Label>カテゴリ</Label>
                    <Select value={newTask.category} onValueChange={(v) => setNewTask({ ...newTask, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(config?.taskCategories || []).map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>優先度</Label>
                    <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v as "high" | "medium" | "low" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">高</SelectItem>
                        <SelectItem value="medium">中</SelectItem>
                        <SelectItem value="low">低</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>締切</Label>
                    <Input type="date" value={newTask.deadline} onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })} />
                  </div>
                  <div>
                    <Label>メモ</Label>
                    <Textarea value={newTask.memo} onChange={(e) => setNewTask({ ...newTask, memo: e.target.value })} />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={newTask.completed}
                      onCheckedChange={(v) =>
                        setNewTask({ ...newTask, completed: !!v })
                      }
                    />
                    完了済みとして作成
                  </label>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreateTask}
                    disabled={isCreatingTask}
                    className="transition-transform active:scale-95"
                  >
                    {isCreatingTask ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        追加中...
                      </>
                    ) : (
                      "追加"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {tasks.length === 0 ? (
            <Card><CardContent className="py-8"><p className="text-center text-muted-foreground">まだタスクがありません</p></CardContent></Card>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
                  {editingTask?.id === task.id ? (
                    <div className="flex-1 space-y-3">
                      <Input
                        value={editingTask.title}
                        onChange={(e) =>
                          setEditingTask({ ...editingTask, title: e.target.value })
                        }
                        placeholder="タイトル"
                      />
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                        <Select
                          value={editingTask.category}
                          onValueChange={(value) =>
                            setEditingTask({ ...editingTask, category: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(config?.taskCategories || []).map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={editingTask.priority}
                          onValueChange={(value) =>
                            setEditingTask({
                              ...editingTask,
                              priority: value as "high" | "medium" | "low",
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">高</SelectItem>
                            <SelectItem value="medium">中</SelectItem>
                            <SelectItem value="low">低</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="date"
                          value={editingTask.deadline}
                          onChange={(e) =>
                            setEditingTask({
                              ...editingTask,
                              deadline: e.target.value,
                            })
                          }
                        />
                      </div>
                      <Textarea
                        value={editingTask.memo}
                        onChange={(e) =>
                          setEditingTask({ ...editingTask, memo: e.target.value })
                        }
                        placeholder="メモ"
                      />
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={editingTask.completed}
                            onCheckedChange={(v) =>
                              setEditingTask({
                                ...editingTask,
                                completed: !!v,
                              })
                            }
                          />
                          完了
                        </label>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingTask(null)}>
                            キャンセル
                          </Button>
                          <Button size="sm" onClick={handleSaveTask}>保存</Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Checkbox checked={task.completed} onCheckedChange={() => handleToggleTask(task)} />
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                        {task.memo && <p className="text-xs text-muted-foreground">{task.memo}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{task.category}</Badge>
                        <PriorityBadge priority={task.priority} />
                        {task.deadline && <span className="text-xs text-muted-foreground">{task.deadline}</span>}
                        <Button variant="outline" size="sm" onClick={() => setEditingTask(task)}>
                          <Edit className="mr-1 h-3 w-3" /> 編集
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteTask(task.id)}>
                          <Trash2 className="mr-1 h-3 w-3" /> 削除
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Memo Tab */}
        <TabsContent value="memo" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold">企業研究メモ</h3>
            <Button size="sm" onClick={handleSaveCompany}>
              <Save className="mr-2 h-4 w-4" /> 保存
            </Button>
          </div>
          <MarkdownEditor value={memoContent} onChange={setMemoContent} height={500} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
