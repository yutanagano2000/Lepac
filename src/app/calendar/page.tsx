"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const FullCalendarView = dynamic(
  () => import("@/components/FullCalendarView"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[500px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps?: {
    type: "todo" | "progress" | "meeting" | "custom" | "other";
    projectId?: number;
    projectName?: string;
    description?: string;
    status?: string;
    userName?: string | null;
    category?: string;
  };
}

const getEventColor = (type: string, status?: string) => {
  switch (type) {
    case "todo":
      if (status === "completed") return { bg: "#22c55e", border: "#16a34a", text: "#ffffff" };
      return { bg: "#f59e0b", border: "#d97706", text: "#ffffff" };
    case "progress":
      if (status === "completed") return { bg: "#22c55e", border: "#16a34a", text: "#ffffff" };
      return { bg: "#3b82f6", border: "#2563eb", text: "#ffffff" };
    case "meeting":
      return { bg: "#8b5cf6", border: "#7c3aed", text: "#ffffff" };
    case "other":
    case "custom":
    default:
      return { bg: "#71717a", border: "#52525b", text: "#ffffff" };
  }
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 一括取得APIを使用
        const res = await fetch("/api/calendar/events");
        if (!res.ok) throw new Error("Failed to fetch calendar events");

        const data = await res.json();
        const calendarEvents: CalendarEvent[] = data.map((event: any) => {
          const colors = getEventColor(event.type, event.status);
          return {
            id: event.id,
            title: event.title,
            start: event.start,
            end: event.end,
            allDay: true,
            backgroundColor: colors.bg,
            borderColor: colors.border,
            textColor: colors.text,
            extendedProps: {
              type: event.type,
              projectId: event.projectId,
              projectName: event.projectName,
              description: event.description,
              status: event.status,
              userName: event.userName,
              category: event.category,
            },
          };
        });

        setEvents(calendarEvents);
      } catch (error) {
        console.error("データの取得に失敗しました:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-lg font-semibold">カレンダー</h1>
            <p className="text-sm text-muted-foreground mt-1">
              TODO・進捗・会議の予定を確認
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-[500px]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <FullCalendarView initialEvents={events} />
          )}
        </div>
      </div>
    </div>
  );
}
