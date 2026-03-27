import { NextRequest, NextResponse } from "next/server";
import { getAllTasks, updateTask } from "@/lib/data";
import { syncTaskToNotion, testNotionConnection, searchNotionDatabases, fetchTasksFromNotion } from "@/lib/notion";
import { getConfig } from "@/lib/data";
import { withAuthenticatedUser } from "@/lib/auth-server";
import type { Task } from "@/types";

export async function POST(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { action, apiKey, databaseId, taskId } = await request.json();

      if (action === "test") {
        const result = await testNotionConnection(apiKey, databaseId);
        return NextResponse.json(result);
      }

      if (action === "search-databases") {
        if (!apiKey) {
          return NextResponse.json({ success: false, error: "APIキーが必要です" }, { status: 400 });
        }
        const result = await searchNotionDatabases(apiKey);
        return NextResponse.json(result);
      }

      if (action === "sync-from-notion") {
        const config = await getConfig();
        if (!config.notion.enabled || !config.notion.apiKey || !config.notion.databaseId) {
          return NextResponse.json({ success: false, error: "Notion連携が無効または設定されていません" }, { status: 400 });
        }

        const notionResult = await fetchTasksFromNotion(config.notion.apiKey, config.notion.databaseId);
        if (!notionResult.success || !notionResult.tasks) {
          return NextResponse.json({ success: false, error: notionResult.error || "Notionからの取得に失敗しました" }, { status: 500 });
        }

        const localTasks = await getAllTasks();
        let updatedCount = 0;
        let importedCount = 0;

        console.log(`Syncing from Notion: Found ${notionResult.tasks.length} tasks in Notion. Local tasks count: ${localTasks.length}`);
        console.log("Local Task Details:", localTasks.map(t => ({ id: t.id, title: t.title, notionPageId: t.notionPageId })));

        const normalizeId = (id: string) => id.replace(/-/g, "").toLowerCase();

        // Pre-fetch companies for matching during import
        const { getAllCompanies, createCompany, createTask } = await import("@/lib/data");
        const allCompanies = await getAllCompanies();

        for (const notionTask of notionResult.tasks) {
          if (!notionTask.notionPageId) continue;

          const localTask = localTasks.find(t => t.notionPageId && normalizeId(t.notionPageId) === normalizeId(notionTask.notionPageId!));
          console.log(`Matching page ${notionTask.notionPageId}: Local match found? ${!!localTask}`);

          if (localTask) {
            // Check if status or other fields changed
            const updates: any = {};
            console.log(`Comparing status: Notion="${notionTask.status}", Local="${localTask.status}"`);
            if (notionTask.status && notionTask.status !== localTask.status) {
              updates.status = notionTask.status;
            }
            if (notionTask.title && notionTask.title !== localTask.title) {
              updates.title = notionTask.title;
            }

            if (Object.keys(updates).length > 0) {
              await updateTask(localTask.id, updates);
              updatedCount++;
            }
          } else {
            // OPTIONAL: Import new task from Notion
            // Only import if it has a title
            if (notionTask.title) {
              let companySlug = "";
              let companyName = notionTask.companyName || "不明";

              const matchedCompany = allCompanies.find(c =>
                c.name.toLowerCase().trim() === notionTask.companyName?.toLowerCase().trim()
              );
              if (matchedCompany) {
                companySlug = matchedCompany.slug;
                companyName = matchedCompany.name;
              } else {
                // If company not found, we might want to create it or skip
                // For now, let's skip or handle gracefully if possible
                // Using a default slug if no company is found is risky.
                // Let's only import if we can match a company OR if we allow orphan tasks.
                // The app requires companySlug.
                continue;
              }

              const newTaskObj = await createTask({
                title: notionTask.title,
                companySlug: companySlug,
                category: notionTask.category || "その他",
                executionDate: notionTask.executionDate,
                deadline: notionTask.deadline,
                status: (notionTask.status as any) || "未着手",
                memo: notionTask.memo || "",
              });

              if (newTaskObj) {
                await updateTask(newTaskObj.id, { notionPageId: notionTask.notionPageId });
                importedCount++;
              }
            }
          }
        }

        return NextResponse.json({ success: true, updatedCount, importedCount });
      }

      if (action === "sync-one" && taskId) {
        const tasks = await getAllTasks();
        const task = tasks.find((t) => t.id === taskId);
        if (!task) {
          return NextResponse.json(
            { error: "タスクが見つかりません" },
            { status: 404 }
          );
        }
        const notionPageId = await syncTaskToNotion(task);
        if (notionPageId) {
          await updateTask(task.id, { notionPageId });
          return NextResponse.json({ success: true, notionPageId });
        }
        return NextResponse.json(
          { error: "Notion同期に失敗しました" },
          { status: 500 }
        );
      }

      if (action === "sync-all") {
        const tasks = await getAllTasks();
        const results: { id: string; success: boolean }[] = [];
        for (const task of tasks) {
          const notionPageId = await syncTaskToNotion(task);
          if (notionPageId) {
            await updateTask(task.id, { notionPageId });
            results.push({ id: task.id, success: true });
          } else {
            results.push({ id: task.id, success: false });
          }
        }
        return NextResponse.json({ results });
      }

      return NextResponse.json(
        { error: "無効なアクションです" },
        { status: 400 }
      );
    } catch {
      return NextResponse.json(
        { error: "Notion操作に失敗しました" },
        { status: 500 }
      );
    }
  });
}
