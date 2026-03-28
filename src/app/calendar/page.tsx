"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { statusColors } from "@/components/badges";
import type { Task } from "@/types";

export default function CalendarPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventInput[]>([]);

  useEffect(() => {
    fetch("/api/calendar")
      .then((r) => r.json())
      .then((data: any[]) => {
        const evs: EventInput[] = data.map((e) => ({
          id: e.id,
          title: e.title,
          start: e.date,
          backgroundColor: e.color || "var(--primary)",
          borderColor: "transparent",
          extendedProps: { ...e },
        }));
        setEvents(evs);
      });
  }, []);

  return (
    <div className="space-y-8 pb-10">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-card p-8 shadow-xl shadow-primary/5">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 h-48 w-48 rounded-full bg-emerald-500/10 blur-[60px]" />
        <div className="absolute bottom-0 left-0 -ml-12 -mb-12 h-48 w-48 rounded-full bg-blue-500/10 blur-[60px]" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">カレンダー</h1>
            <p className="text-muted-foreground mt-1 font-medium">
              選考スケジュールとタスクの締切を一目で確認しましょう
            </p>
          </div>
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
            background: rgba(255, 255, 255, 0.5) !important;
            border: none !important;
            color: var(--foreground) !important;
            font-weight: 700 !important;
            text-transform: capitalize !important;
            padding: 0.5rem 1rem !important;
            border-radius: 0.75rem !important;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
            transition: all 0.2s !important;
          }
          .fc .fc-button:hover {
            background: rgba(255, 255, 255, 0.8) !important;
            transform: translateY(-1px);
          }
          .fc .fc-button-active {
            background: var(--primary) !important;
            color: white !important;
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
          }
          .dark .fc {
            --fc-border-color: rgba(255, 255, 255, 0.05);
            --fc-today-bg-color: var(--muted);
          }
          .dark .fc .fc-button {
            background: rgba(255, 255, 255, 0.05) !important;
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
              
              router.push(`/companies/${companySlug}?tab=${tab}`);
            }
          }}
        />
      </Card>
    </div>
  );
}
