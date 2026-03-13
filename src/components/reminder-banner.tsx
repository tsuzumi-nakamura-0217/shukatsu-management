"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Task } from "@/types";

interface ReminderBannerProps {
  tasks: Task[];
}

export function ReminderBanner({ tasks }: ReminderBannerProps) {
  if (tasks.length === 0) return null;

  const today = new Date();
  const urgentTasks = tasks.filter((t) => {
    if (t.completed || !t.deadline) return false;
    const deadline = new Date(t.deadline);
    const diffDays = Math.ceil(
      (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diffDays <= 3 && diffDays >= 0;
  });

  const overdueTasks = tasks.filter((t) => {
    if (t.completed || !t.deadline) return false;
    const deadline = new Date(t.deadline);
    return deadline < today;
  });

  if (urgentTasks.length === 0 && overdueTasks.length === 0) return null;

  return (
    <div className="space-y-2">
      {overdueTasks.length > 0 && (
        <Card className="border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold">
              期限超過のタスクが {overdueTasks.length} 件あります
            </span>
          </div>
          <ul className="mt-2 space-y-1 text-sm text-red-700">
            {overdueTasks.map((task) => (
              <li key={task.id}>
                ・{task.companyName} - {task.title}（期限: {task.deadline}）
              </li>
            ))}
          </ul>
        </Card>
      )}

      {urgentTasks.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <Clock className="h-5 w-5" />
            <span className="font-semibold">
              3日以内に期限のタスクが {urgentTasks.length} 件あります
            </span>
          </div>
          <ul className="mt-2 space-y-1 text-sm text-yellow-700">
            {urgentTasks.map((task) => (
              <li key={task.id}>
                ・{task.companyName} - {task.title}（期限: {task.deadline}）
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
