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
    type: "todo" | "progress" | "meeting" | "custom";
    projectId?: number;
    projectName?: string;
    description?: string;
    status?: string;
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
        const calendarEvents: CalendarEvent[] = [];

        // TODOを取得
        const todosRes = await fetch("/api/todos");
        if (todosRes.ok) {
          const todos = await todosRes.json();
          for (const todo of todos) {
            const colors = getEventColor("todo", todo.completedAt ? "completed" : undefined);
            calendarEvents.push({
              id: `todo-${todo.id}`,
              title: todo.content,
              start: todo.dueDate,
              allDay: true,
              backgroundColor: colors.bg,
              borderColor: colors.border,
              textColor: colors.text,
              extendedProps: {
                type: "todo",
                projectId: todo.projectId,
                status: todo.completedAt ? "completed" : "pending",
              },
            });
          }
        }

        // プロジェクトと進捗を取得
        const projectsRes = await fetch("/api/projects");
        if (projectsRes.ok) {
          const projects = await projectsRes.json();
          for (const project of projects) {
            const progressRes = await fetch(`/api/projects/${project.id}/progress`);
            if (progressRes.ok) {
              const progressList = await progressRes.json();
              for (const progress of progressList) {
                const date = progress.completedAt || progress.createdAt;
                if (!date) continue;

                const colors = getEventColor("progress", progress.status);
                calendarEvents.push({
                  id: `progress-${progress.id}`,
                  title: `${project.managementNumber}: ${progress.title}`,
                  start: date.split("T")[0],
                  allDay: true,
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                  textColor: colors.text,
                  extendedProps: {
                    type: "progress",
                    projectId: project.id,
                    projectName: project.managementNumber,
                    description: progress.description,
                    status: progress.status,
                  },
                });
              }
            }
          }
        }

        // 会議を取得
        const meetingsRes = await fetch("/api/meetings");
        if (meetingsRes.ok) {
          const meetings = await meetingsRes.json();
          for (const meeting of meetings) {
            const colors = getEventColor("meeting");
            calendarEvents.push({
              id: `meeting-${meeting.id}`,
              title: meeting.title,
              start: meeting.meetingDate,
              allDay: true,
              backgroundColor: colors.bg,
              borderColor: colors.border,
              textColor: colors.text,
              extendedProps: {
                type: "meeting",
                description: meeting.content,
              },
            });
          }
        }

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
