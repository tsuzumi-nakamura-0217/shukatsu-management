"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: string;
  companySlug: string;
  companyName: string;
  color: string;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/calendar")
      .then((r) => r.json())
      .then(setEvents);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateView = () => setIsMobile(mediaQuery.matches);
    updateView();
    mediaQuery.addEventListener("change", updateView);

    return () => mediaQuery.removeEventListener("change", updateView);
  }, []);

  const calendarEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    backgroundColor: e.color,
    borderColor: e.color,
    extendedProps: {
      type: e.type,
      companySlug: e.companySlug,
      companyName: e.companyName,
    },
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">カレンダー</h1>
        <p className="text-muted-foreground">面接日程や締切を一覧表示</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-sm">面接</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-sm">タスク締切</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-sm">ES提出期限</span>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <div className="min-w-[720px] md:min-w-0">
              <FullCalendar
                key={isMobile ? "mobile" : "desktop"}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView={isMobile ? "dayGridWeek" : "dayGridMonth"}
                events={calendarEvents}
                locale="ja"
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: isMobile ? "dayGridWeek" : "dayGridMonth,dayGridWeek",
                }}
                buttonText={{
                  today: "今日",
                  month: "月",
                  week: "週",
                }}
                height="auto"
                eventClick={(info) => {
                  const companySlug = info.event.extendedProps.companySlug;
                  if (companySlug) {
                    router.push(`/companies/${companySlug}`);
                  }
                }}
                eventDisplay="block"
                dayMaxEvents={isMobile ? 2 : 3}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
