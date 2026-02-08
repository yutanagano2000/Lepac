"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
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

// SWR fetcher
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// 日付範囲を計算（現在月の前後3ヶ月）
const getDateRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 4, 0);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
};

export default function CalendarPage() {
  const [dateRange] = useState(getDateRange);

  // SWRでキャッシュ付きデータ取得（5分間キャッシュ）
  const { data, isLoading } = useSWR(
    `/api/calendar/events?start=${dateRange.start}&end=${dateRange.end}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5分
    }
  );

  // イベントデータをメモ化
  const events = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    return data.map((event: any) => {
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
  }, [data]);

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 sm:px-6 py-6 sm:py-8">
        <div className="space-y-4 sm:space-y-6">
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
