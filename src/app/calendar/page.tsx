"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";
import { Calendar, CalendarDays, Clock3, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/lib/data/calendar";

type FilterKey = "deadline" | "es" | "interview" | "event" | "completed";

const FILTER_CONFIG: { key: FilterKey; label: string; dotColor: string; description: string }[] = [
  { key: "deadline", label: "締切", dotColor: "bg-red-500", description: "タスクの締切日" },
  { key: "es", label: "ES", dotColor: "bg-amber-500", description: "ES関連タスク" },
  { key: "interview", label: "面接", dotColor: "bg-blue-500", description: "面接スケジュール" },
  { key: "event", label: "イベント", dotColor: "bg-cyan-500", description: "説明会・インターン等" },
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

  const filteredEvents = useMemo(() => {
    return rawEvents.filter((e) => {
      if (e.type === "deadline" && !filters.deadline) return false;
      if (e.type === "es" && !filters.es) return false;
      if (e.type === "interview" && !filters.interview) return false;
      if (e.type === "event" && !filters.event) return false;
      return true;
    });
  }, [rawEvents, filters]);

  const events: EventInput[] = useMemo(() => {
    return filteredEvents.map((e) => ({
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
  }, [filteredEvents]);

  const sourceEventCounts = useMemo<Record<FilterKey, number>>(() => {
    const counts: Record<FilterKey, number> = {
      deadline: 0,
      es: 0,
      interview: 0,
      event: 0,
      completed: 0,
    };

    rawEvents.forEach((event) => {
      if (event.type === "deadline") counts.deadline += 1;
      if (event.type === "es") counts.es += 1;
      if (event.type === "interview") counts.interview += 1;
      if (event.type === "event") counts.event += 1;
      if (event.status === "完了") counts.completed += 1;
    });

    return counts;
  }, [rawEvents]);

  const visibleStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    let upcoming = 0;
    let thisWeek = 0;

    filteredEvents.forEach((event) => {
      const date = new Date(event.date);
      if (Number.isNaN(date.getTime())) return;
      if (date >= today) upcoming += 1;
      if (date >= today && date < nextWeek) thisWeek += 1;
    });

    return {
      total: filteredEvents.length,
      upcoming,
      thisWeek,
    };
  }, [filteredEvents]);

  const currentMonthLabel = useMemo(() => {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
    }).format(new Date());
  }, []);

  const toggleFilter = (key: FilterKey) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="relative flex flex-col gap-6 pb-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 rounded-[2rem] bg-[radial-gradient(circle_at_18%_0%,rgba(14,165,233,0.14),transparent_48%),radial-gradient(circle_at_85%_10%,rgba(16,185,129,0.14),transparent_42%)]" />

      <div className="relative overflow-hidden rounded-3xl border border-white/25 bg-linear-to-br from-card via-card to-primary/5 p-5 shadow-xl shadow-primary/10 sm:p-6">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute -left-14 bottom-0 h-36 w-36 rounded-full bg-emerald-400/10 blur-2xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-sm shadow-primary/15">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">カレンダー</h1>
              <p className="mt-1 text-xs font-medium text-muted-foreground">締切・面接・イベントを一覧で可視化</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/70 px-3 py-1 text-[11px] font-semibold text-foreground/85 dark:border-white/10 dark:bg-white/5">
              <CalendarDays className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              {currentMonthLabel}
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/70 px-3 py-1 text-[11px] font-semibold text-foreground/85 dark:border-white/10 dark:bg-white/5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              表示中 {visibleStats.total} 件
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/70 px-3 py-1 text-[11px] font-semibold text-foreground/85 dark:border-white/10 dark:bg-white/5">
              <Clock3 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              今週 {visibleStats.thisWeek} 件
            </div>
          </div>
        </div>

        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          {FILTER_CONFIG.map(({ key, label, dotColor, description }) => {
            const active = filters[key];
            return (
              <button
                key={key}
                onClick={() => toggleFilter(key)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[11px] font-bold tracking-wide transition-all duration-200 select-none",
                  active
                    ? "border-white/40 bg-white/85 text-foreground shadow-sm shadow-primary/10 dark:border-white/25 dark:bg-white/12"
                    : "border-white/10 bg-transparent text-muted-foreground/60 hover:border-white/25 hover:bg-white/40 hover:text-foreground/85 dark:hover:bg-white/8"
                )}
                title={description}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full transition-all",
                    active ? dotColor : "bg-muted-foreground/30",
                    active && "shadow-[0_0_8px_rgba(2,6,23,0.15)]"
                  )}
                />
                {label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[9px] leading-none",
                    active ? "bg-muted text-foreground/80" : "bg-muted/40 text-muted-foreground/70"
                  )}
                >
                  {sourceEventCounts[key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Card className="calendar-surface min-h-175 overflow-hidden rounded-3xl border border-white/20 bg-white/70 p-4 shadow-2xl shadow-primary/10 backdrop-blur-xl dark:border-white/10 dark:bg-white/3 sm:p-6">
        

        <style jsx global>{`
          .calendar-surface .fc {
            --fc-border-color: rgba(148, 163, 184, 0.28);
            --fc-daygrid-event-dot-width: 8px;
            --fc-list-event-dot-width: 8px;
            --fc-neutral-bg-color: transparent;
            --fc-page-bg-color: transparent;
            --fc-today-bg-color: rgba(14, 165, 233, 0.08);
            font-family: inherit;
          }
          .calendar-surface .fc-theme-standard .fc-scrollgrid,
          .calendar-surface .fc-theme-standard td,
          .calendar-surface .fc-theme-standard th {
            border-color: var(--fc-border-color);
          }
          .calendar-surface .fc .fc-toolbar {
            margin-bottom: 1rem;
            gap: 0.75rem;
            flex-wrap: wrap;
          }
          .calendar-surface .fc .fc-toolbar-chunk {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .calendar-surface .fc .fc-toolbar-title {
            font-size: clamp(1.1rem, 1.4vw + 0.7rem, 1.6rem);
            font-weight: 800;
            letter-spacing: -0.02em;
            color: var(--foreground);
          }
          .calendar-surface .fc .fc-button {
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(241, 245, 249, 0.9)) !important;
            border: 1px solid rgba(148, 163, 184, 0.3) !important;
            color: var(--foreground) !important;
            font-weight: 700 !important;
            text-transform: none !important;
            padding: 0.5rem 0.9rem !important;
            border-radius: 0.85rem !important;
            box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08) !important;
            transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease !important;
          }
          .calendar-surface .fc .fc-button:hover {
            transform: translateY(-1px);
            border-color: rgba(14, 165, 233, 0.45) !important;
            box-shadow: 0 8px 18px rgba(14, 165, 233, 0.15) !important;
          }
          .calendar-surface .fc .fc-button-primary:not(:disabled).fc-button-active,
          .calendar-surface .fc .fc-button-primary:not(:disabled):active {
            background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.92)) !important;
            border-color: rgba(15, 23, 42, 0.9) !important;
            color: #f8fafc !important;
            box-shadow: 0 8px 16px rgba(15, 23, 42, 0.24) !important;
          }
          .calendar-surface .fc .fc-col-header-cell {
            padding: 0.65rem 0;
            background: rgba(148, 163, 184, 0.08);
            font-size: 0.73rem;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--muted-foreground);
          }
          .calendar-surface .fc .fc-daygrid-day {
            transition: background-color 0.18s ease;
          }
          .calendar-surface .fc .fc-daygrid-day:hover {
            background: rgba(14, 165, 233, 0.06);
          }
          .calendar-surface .fc .fc-daygrid-day-frame {
            min-height: 108px;
          }
          .calendar-surface .fc .fc-daygrid-day.fc-day-today {
            background: linear-gradient(180deg, rgba(14, 165, 233, 0.12), rgba(16, 185, 129, 0.08));
          }
          .calendar-surface .fc .fc-daygrid-day-number {
            margin: 6px;
            min-width: 2rem;
            border-radius: 9999px;
            padding: 0.35rem 0.55rem !important;
            font-size: 0.85rem;
            font-weight: 700;
            text-align: center;
            line-height: 1;
          }
          .calendar-surface .fc .fc-daygrid-day.fc-day-today .fc-daygrid-day-number {
            background: var(--primary);
            color: var(--primary-foreground) !important;
          }
          .calendar-surface .fc .fc-day-sun .fc-daygrid-day-number {
            color: #dc2626;
          }
          .calendar-surface .fc .fc-day-sat .fc-daygrid-day-number {
            color: #2563eb;
          }
          .calendar-surface .fc .fc-event {
            border-radius: 10px !important;
            padding: 0.22rem 0.5rem !important;
            border: 1px solid transparent !important;
            font-size: 0.75rem !important;
            font-weight: 700 !important;
            letter-spacing: 0.01em;
            box-shadow: 0 6px 14px rgba(15, 23, 42, 0.12) !important;
            cursor: pointer !important;
            transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease !important;
          }
          .calendar-surface .fc .fc-event:hover {
            transform: translateY(-1px) scale(1.015);
            box-shadow: 0 10px 18px rgba(15, 23, 42, 0.2) !important;
            filter: brightness(1.04);
          }
          .calendar-surface .fc .fc-event.calendar-event-deadline {
            background: linear-gradient(180deg, #ef4444, #dc2626) !important;
            color: #ffffff !important;
            border-color: #b91c1c !important;
          }
          .calendar-surface .fc .fc-event.calendar-event-es {
            background: linear-gradient(180deg, #f59e0b, #d97706) !important;
            color: #111827 !important;
            border-color: #b45309 !important;
          }
          .calendar-surface .fc .fc-event.calendar-event-interview {
            background: linear-gradient(180deg, #3b82f6, #2563eb) !important;
            color: #eff6ff !important;
            border-color: #1d4ed8 !important;
          }
          .calendar-surface .fc .fc-event.calendar-event-enterprise {
            background: linear-gradient(180deg, #06b6d4, #0891b2) !important;
            color: #ecfeff !important;
            border-color: #0e7490 !important;
          }
          .calendar-surface .fc .fc-event.calendar-event-completed {
            background: linear-gradient(180deg, #6b7280, #4b5563) !important;
            color: #e5e7eb !important;
            border-color: #374151 !important;
            opacity: 0.68;
            text-decoration: line-through;
          }
          .dark .calendar-surface .fc {
            --fc-border-color: rgba(148, 163, 184, 0.2);
            --fc-today-bg-color: rgba(14, 165, 233, 0.16);
          }
          .dark .calendar-surface .fc .fc-button {
            background: linear-gradient(180deg, rgba(30, 41, 59, 0.82), rgba(15, 23, 42, 0.8)) !important;
            border-color: rgba(148, 163, 184, 0.34) !important;
            color: #e2e8f0 !important;
          }
          .dark .calendar-surface .fc .fc-button:hover {
            border-color: rgba(34, 211, 238, 0.6) !important;
          }
          .dark .calendar-surface .fc .fc-col-header-cell {
            background: rgba(30, 41, 59, 0.5);
          }
          .dark .calendar-surface .fc .fc-event.calendar-event-deadline {
            background: linear-gradient(180deg, #b91c1c, #991b1b) !important;
          }
          .dark .calendar-surface .fc .fc-event.calendar-event-es {
            background: linear-gradient(180deg, #ca8a04, #a16207) !important;
            color: #fef3c7 !important;
          }
          .dark .calendar-surface .fc .fc-event.calendar-event-interview {
            background: linear-gradient(180deg, #1d4ed8, #1e40af) !important;
          }
          .dark .calendar-surface .fc .fc-event.calendar-event-enterprise {
            background: linear-gradient(180deg, #0e7490, #155e75) !important;
          }
          .dark .calendar-surface .fc .fc-event.calendar-event-completed {
            background: linear-gradient(180deg, #4b5563, #374151) !important;
            color: #9ca3af !important;
          }

          @media (max-width: 768px) {
            .calendar-surface .fc .fc-toolbar {
              flex-direction: column;
              align-items: stretch;
            }
            .calendar-surface .fc .fc-toolbar-chunk {
              justify-content: center;
              flex-wrap: wrap;
            }
            .calendar-surface .fc .fc-toolbar-title {
              text-align: center;
            }
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
          buttonText={{
            today: "今日",
            month: "月",
            week: "週",
          }}
          dayHeaderFormat={{ weekday: "short" }}
          titleFormat={{ year: "numeric", month: "long" }}
          dayCellClassNames={(arg) => {
            if (arg.date.getDay() === 0) return ["fc-day-sun"];
            if (arg.date.getDay() === 6) return ["fc-day-sat"];
            return [];
          }}
          dayMaxEventRows={3}
          fixedWeekCount={false}
          locale="ja"
          events={events}
          eventDisplay="block"
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
