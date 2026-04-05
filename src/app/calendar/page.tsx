"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";
import { Calendar } from "lucide-react";
import {
  Card,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/lib/data/calendar";

type FilterKey = "deadline" | "es" | "interview" | "event" | "completed";

const FILTER_CONFIG: { key: FilterKey; label: string; dotColor: string; description: string }[] = [
  { key: "deadline", label: "締切", dotColor: "bg-red-500", description: "タスクの締切日" },
  { key: "es", label: "ES", dotColor: "bg-amber-500", description: "ES関連タスク" },
  { key: "interview", label: "面接", dotColor: "bg-blue-500", description: "面接スケジュール" },
  { key: "event", label: "イベント", dotColor: "bg-purple-500", description: "説明会・インターン等" },
  { key: "completed", label: "完了済み", dotColor: "bg-emerald-500", description: "完了タスクも表示" },
];

export default function CalendarPage() {
  const router = useRouter();
  const [rawEvents, setRawEvents] = useState<CalendarEvent[]>([]);
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    deadline: true,
    es: true,
    interview: true,
    event: true,
    completed: false,
  });

  const fetchEvents = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.completed) params.set("includeCompleted", "true");
    const r = await fetch(`/api/calendar?${params.toString()}`);
    const data: CalendarEvent[] = await r.json();
    setRawEvents(data);
  }, [filters.completed]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const events: EventInput[] = useMemo(() => {
    return rawEvents
      .filter((e) => {
        if (e.type === "deadline" && !filters.deadline) return false;
        if (e.type === "es" && !filters.es) return false;
        if (e.type === "interview" && !filters.interview) return false;
        if (e.type === "event" && !filters.event) return false;
        return true;
      })
      .map((e) => ({
        id: e.id,
        title: e.title,
        start: e.date,
        end: e.end,
        backgroundColor: e.status === "完了" ? "#6b7280" : e.color || "var(--primary)",
        borderColor: "transparent",
        extendedProps: { ...e },
        classNames: [
          ...(e.status === "完了" ? ["calendar-event-completed"] : []),
          ...(e.type === "deadline" && e.status !== "完了" ? ["calendar-event-deadline"] : []),
          ...(e.type === "es" && e.status !== "完了" ? ["calendar-event-es"] : []),
          ...(e.type === "interview" ? ["calendar-event-interview"] : []),
          ...(e.type === "event" ? ["calendar-event-enterprise"] : []),
        ],
      }));
  }, [rawEvents, filters]);

  const toggleFilter = (key: FilterKey) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* Compact Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-card p-4 px-8 shadow-lg shadow-primary/5 flex items-center justify-between">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 h-32 w-32 rounded-full bg-emerald-500/10 blur-[40px]" />

        <div className="relative flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              カレンダー
            </h1>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="relative flex flex-wrap items-center gap-2">
          {FILTER_CONFIG.map(({ key, label, dotColor }) => {
            const active = filters[key];
            return (
              <button
                key={key}
                onClick={() => toggleFilter(key)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wide transition-all duration-200 border cursor-pointer select-none",
                  active
                    ? "bg-white/80 dark:bg-white/10 border-white/40 dark:border-white/20 shadow-sm text-foreground"
                    : "bg-transparent border-white/10 dark:border-white/5 text-muted-foreground/30 hover:text-muted-foreground/80 hover:border-white/20"
                )}
                title={FILTER_CONFIG.find(f => f.key === key)?.description}
              >
                <span className={cn(
                  "h-2 w-2 rounded-full transition-all",
                  active ? dotColor : "bg-muted-foreground/20",
                  active && "shadow-[0_0_6px_rgba(0,0,0,0.15)]"
                )} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <Card className="border-none glass p-6 rounded-3xl overflow-hidden shadow-2xl shadow-primary/5 min-h-[700px]">
        <style jsx global>{`
          .fc {
            --fc-border-color: rgba(255, 255, 255, 0.1);
            --fc-daygrid-event-dot-width: 8px;
            --fc-list-event-dot-width: 8px;
            --fc-neutral-bg-color: transparent;
            --fc-today-bg-color: var(--muted);
            font-family: inherit;
          }
          .fc .fc-toolbar-title {
            font-size: 1.5rem;
            font-weight: 800;
            letter-spacing: -0.025em;
          }
          .fc .fc-button {
            background: var(--muted) !important;
            border: none !important;
            color: var(--muted-foreground) !important;
            font-weight: 700 !important;
            text-transform: capitalize !important;
            padding: 0.5rem 1rem !important;
            border-radius: 0.75rem !important;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
            transition: all 0.2s !important;
          }
          .fc .fc-button:hover {
            background: var(--accent) !important;
            color: var(--accent-foreground) !important;
            transform: translateY(-1px);
          }
          .fc .fc-button-active {
            background: var(--primary) !important;
            color: var(--primary-foreground) !important;
          }
          .fc .fc-col-header-cell {
            padding: 12px 0;
            font-weight: 800;
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.05em;
            color: var(--muted-foreground);
          }
          .fc .fc-daygrid-day-number {
            font-weight: 700;
            padding: 10px !important;
            font-size: 0.9rem;
          }
          .fc .fc-event {
            border-radius: 6px !important;
            padding: 2px 4px !important;
            font-weight: 700 !important;
            font-size: 0.75rem !important;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05) !important;
            border: none !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
          }
          .fc .fc-event:hover {
            transform: translateY(-1px) scale(1.02);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
            filter: brightness(1.1);
          }
          .fc .fc-event.calendar-event-deadline {
            background: #ef4444 !important;
            color: #ffffff !important;
            border: 1px solid #dc2626 !important;
          }
          .fc .fc-event.calendar-event-es {
            background: #f59e0b !important;
            color: #111827 !important;
            border: 1px solid #d97706 !important;
          }
          .fc .fc-event.calendar-event-interview {
            background: #2563eb !important;
            color: #ffffff !important;
            border: 1px solid #1d4ed8 !important;
          }
          .fc .fc-event.calendar-event-enterprise {
            background: #a855f7 !important;
            color: #ffffff !important;
            border: 1px solid #9333ea !important;
          }
          .fc .fc-event.calendar-event-completed {
            background: #6b7280 !important;
            color: #e5e7eb !important;
            border: 1px solid #4b5563 !important;
            opacity: 0.6;
            text-decoration: line-through;
          }
          .dark .fc {
            --fc-border-color: rgba(255, 255, 255, 0.05);
            --fc-today-bg-color: var(--muted);
          }

          .dark .fc .fc-event.calendar-event-deadline {
            background: #b91c1c !important;
            border-color: #991b1b !important;
          }
          .dark .fc .fc-event.calendar-event-es {
            background: #ca8a04 !important;
            color: #111827 !important;
            border-color: #a16207 !important;
          }
          .dark .fc .fc-event.calendar-event-interview {
            background: #1d4ed8 !important;
            border-color: #1e40af !important;
          }
          .dark .fc .fc-event.calendar-event-enterprise {
            background: #7e22ce !important;
            border-color: #6b21a8 !important;
          }
          .dark .fc .fc-event.calendar-event-completed {
            background: #4b5563 !important;
            color: #9ca3af !important;
            border-color: #374151 !important;
          }
        `}</style>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek",
          }}
          locale="ja"
          events={events}
          height="auto"
          eventClick={(info) => {
            const { type, companySlug } = info.event.extendedProps;
            if (companySlug) {
              let tab = "es";
              if (type === "interview") tab = "interviews";
              if (type === "deadline") tab = "tasks";
              if (type === "es") tab = "es";
              if (type === "event") tab = "events";
              
              router.push(`/companies/${companySlug}?tab=${tab}`);
            }
          }}
        />
      </Card>
    </div>
  );
}
