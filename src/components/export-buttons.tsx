"use client";

import { useState } from "react";
import { Download, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ExportButtons() {
  const [loading, setLoading] = useState(false);

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportJson = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/export");
      const data = await response.json();
      downloadFile(
        JSON.stringify(data, null, 2),
        `shukatsu-data-${new Date().toISOString().split("T")[0]}.json`,
        "application/json"
      );
    } catch (error) {
      console.error("Failed to export JSON:", error);
      alert("データの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const convertToCsv = (data: any[], headers: string[]) => {
    const csvRows = [];
    csvRows.push(headers.join(","));

    for (const row of data) {
      const values = headers.map((header) => {
        const value = row[header] ?? "";
        const escaped = ("" + value).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(","));
    }

    return csvRows.join("\n");
  };

  const exportCsv = async (type: "companies" | "tasks" | "interviews") => {
    setLoading(true);
    try {
      const response = await fetch("/api/export");
      const data = await response.json();
      
      let csvContent = "";
      let fileName = "";

      if (type === "companies") {
        const headers = ["name", "industry", "status", "priority", "url", "location"];
        csvContent = convertToCsv(data.companies, headers);
        fileName = `companies-${new Date().toISOString().split("T")[0]}.csv`;
      } else if (type === "tasks") {
        const headers = ["title", "companyName", "category", "deadline", "status"];
        csvContent = convertToCsv(data.tasks, headers);
        fileName = `tasks-${new Date().toISOString().split("T")[0]}.csv`;
      } else if (type === "interviews") {
        const headers = ["companyName", "type", "date", "result", "location"];
        csvContent = convertToCsv(data.interviews, headers);
        fileName = `interviews-${new Date().toISOString().split("T")[0]}.csv`;
      }

      downloadFile(csvContent, fileName, "text/csv;charset=utf-8;");
    } catch (error) {
      console.error("Failed to export CSV:", error);
      alert("データの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            エクスポート
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={exportJson}>
            <FileJson className="mr-2 h-4 w-4" />
            JSONでエクスポート (全データ)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportCsv("companies")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            CSVでエクスポート (企業一覧)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportCsv("tasks")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            CSVでエクスポート (タスク一覧)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportCsv("interviews")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            CSVでエクスポート (面接一覧)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
