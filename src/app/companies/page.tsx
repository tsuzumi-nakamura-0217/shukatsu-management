"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, LayoutGrid, List, Star, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/badges";
import { toast } from "sonner";
import type { Company, AppConfig } from "@/types";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: "",
    industry: "",
    url: "",
    location: "",
  });

  function fetchCompanies() {
    fetch("/api/companies")
      .then((r) => r.json())
      .then(setCompanies);
  }

  useEffect(() => {
    fetchCompanies();
    fetch("/api/config")
      .then((r) => r.json())
      .then((data: AppConfig) => {
        setConfig(data);
        setNewCompany((prev) => ({
          ...prev,
          industry: prev.industry || data.industries?.[0] || "",
        }));
      });
  }, []);

  const handleCreate = async () => {
    if (isCreating) return;
    if (!newCompany.name) {
      toast.error("企業名を入力してください");
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCompany),
      });
      if (res.ok) {
        toast.success("企業を追加しました");
        setDialogOpen(false);
        setNewCompany({ name: "", industry: config?.industries?.[0] || "", url: "", location: "" });
        fetchCompanies();
      } else {
        toast.error("企業の追加に失敗しました");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const filtered = companies
    .filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .filter((c) => {
      if (statusFilter !== "all") return c.status === statusFilter;
      return true;
    })
    .sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));

  const allStatuses = config?.defaultStages || [];
  const allIndustries = config?.industries || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">企業一覧</h1>
          <p className="text-muted-foreground">
            {companies.length} 社が登録されています
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              企業を追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新しい企業を追加</DialogTitle>
              <DialogDescription>
                企業の基本情報を入力してください
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">企業名 *</Label>
                <Input
                  id="name"
                  value={newCompany.name}
                  onChange={(e) =>
                    setNewCompany({ ...newCompany, name: e.target.value })
                  }
                  placeholder="株式会社サンプル"
                />
              </div>
              <div>
                <Label htmlFor="industry">業界</Label>
                <Select
                  value={newCompany.industry}
                  onValueChange={(value) =>
                    setNewCompany({ ...newCompany, industry: value })
                  }
                >
                  <SelectTrigger id="industry">
                    <SelectValue placeholder="業界を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {allIndustries.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="url">企業URL</Label>
                <Input
                  id="url"
                  value={newCompany.url}
                  onChange={(e) =>
                    setNewCompany({ ...newCompany, url: e.target.value })
                  }
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <Label htmlFor="location">所在地</Label>
                <Input
                  id="location"
                  value={newCompany.location}
                  onChange={(e) =>
                    setNewCompany({ ...newCompany, location: e.target.value })
                  }
                  placeholder="東京都渋谷区"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" disabled={isCreating} onClick={() => setDialogOpen(false)}>
                キャンセル
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isCreating}
                className="transition-transform active:scale-95"
              >
                {isCreating ? (
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

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="企業名・業界で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {allStatuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 self-start rounded-md border p-1 md:self-auto">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Company List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              {companies.length === 0
                ? "まだ企業が登録されていません。「企業を追加」ボタンから始めましょう。"
                : "条件に一致する企業がありません"}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((company) => (
            <Link key={company.slug} href={`/companies/${company.slug}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{company.name}</CardTitle>
                    <StatusBadge status={company.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {company.industry}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {company.location && (
                      <p className="text-sm text-muted-foreground">
                        📍 {company.location}
                      </p>
                    )}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < company.priority
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      更新: {company.updatedAt}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <div className="divide-y">
            {filtered.map((company) => (
              <Link
                key={company.slug}
                href={`/companies/${company.slug}`}
                className="flex flex-col gap-3 p-4 transition-colors hover:bg-accent md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">{company.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {company.industry}
                      {company.location && ` ・ ${company.location}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-start md:self-auto">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i < company.priority
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <StatusBadge status={company.status} />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
