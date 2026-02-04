"use client";

import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { EventClickArg, DateSelectArg, EventDropArg } from "@fullcalendar/core";
import jaLocale from "@fullcalendar/core/locales/ja";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Clock, Trash2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// イベントの型定義
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

// イベントカラー（バッジ用のみカラフル、それ以外はモノトーン）
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
    case "custom":
      return { bg: "#71717a", border: "#52525b", text: "#ffffff" };
    default:
      return { bg: "#71717a", border: "#52525b", text: "#ffffff" };
  }
};

interface FullCalendarViewProps {
  initialEvents?: CalendarEvent[];
}

export default function FullCalendarView({ initialEvents = [] }: FullCalendarViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    start: "",
    end: "",
    allDay: true,
    description: "",
    type: "custom" as const,
  });

  const handleEventClick = (info: EventClickArg) => {
    const event = events.find((e) => e.id === info.event.id);
    if (event) {
      setSelectedEvent(event);
      setIsEventDialogOpen(true);
    }
  };

  const handleDateSelect = (info: DateSelectArg) => {
    setNewEvent({
      title: "",
      start: info.startStr,
      end: info.endStr,
      allDay: info.allDay,
      description: "",
      type: "custom",
    });
    setIsCreateDialogOpen(true);
  };

  const handleEventDrop = async (info: EventDropArg) => {
    const updatedEvents = events.map((event) => {
      if (event.id === info.event.id) {
        return {
          ...event,
          start: info.event.startStr,
          end: info.event.endStr || undefined,
        };
      }
      return event;
    });
    setEvents(updatedEvents);
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title.trim()) return;

    const colors = getEventColor(newEvent.type);
    const event: CalendarEvent = {
      id: `custom-${Date.now()}`,
      title: newEvent.title,
      start: newEvent.start,
      end: newEvent.end || undefined,
      allDay: newEvent.allDay,
      backgroundColor: colors.bg,
      borderColor: colors.border,
      textColor: colors.text,
      extendedProps: {
        type: newEvent.type,
        description: newEvent.description,
      },
    };

    setEvents([...events, event]);
    setIsCreateDialogOpen(false);
    setNewEvent({
      title: "",
      start: "",
      end: "",
      allDay: true,
      description: "",
      type: "custom",
    });
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    setEvents(events.filter((e) => e.id !== selectedEvent.id));
    setIsEventDialogOpen(false);
    setSelectedEvent(null);
  };

  return (
    <div className="h-full">
      {/* 凡例 - シンプル */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
          TODO
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
          進捗
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-green-500" />
          完了
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
          会議
        </span>
      </div>

      {/* カレンダー */}
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="dayGridMonth"
        locale={jaLocale}
        headerToolbar={{
          left: "prev,today,next",
          center: "title",
          right: "dayGridMonth,timeGridWeek,listWeek",
        }}
        buttonText={{
          today: "今日",
          month: "月",
          week: "週",
          list: "リスト",
        }}
        events={events}
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={3}
        weekends={true}
        eventClick={handleEventClick}
        select={handleDateSelect}
        eventDrop={handleEventDrop}
        height="auto"
        contentHeight={650}
        eventDisplay="block"
        eventTimeFormat={{
          hour: "2-digit",
          minute: "2-digit",
          meridiem: false,
        }}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        nowIndicator={true}
      />

      {/* イベント詳細ダイアログ */}
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-medium">
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {new Date(selectedEvent.start).toLocaleDateString("ja-JP", {
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })}
                </span>
              </div>

              {selectedEvent.extendedProps?.projectName && (
                <Link
                  href={`/projects/${selectedEvent.extendedProps.projectId}`}
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  {selectedEvent.extendedProps.projectName}
                </Link>
              )}

              {selectedEvent.extendedProps?.description && (
                <p className="text-sm text-muted-foreground">
                  {selectedEvent.extendedProps.description}
                </p>
              )}

              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    selectedEvent.extendedProps?.type === "todo" && "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
                    selectedEvent.extendedProps?.type === "progress" && "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
                    selectedEvent.extendedProps?.type === "meeting" && "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
                    selectedEvent.extendedProps?.status === "completed" && "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                  )}
                >
                  {selectedEvent.extendedProps?.status === "completed" ? "完了" :
                   selectedEvent.extendedProps?.type === "todo" ? "TODO" :
                   selectedEvent.extendedProps?.type === "progress" ? "進捗" :
                   selectedEvent.extendedProps?.type === "meeting" ? "会議" : "予定"}
                </Badge>
              </div>

              <div className="flex justify-between pt-3 border-t">
                {selectedEvent.extendedProps?.projectId && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/projects/${selectedEvent.extendedProps.projectId}`}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      案件
                    </Link>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteEvent}
                  className="text-muted-foreground hover:text-destructive ml-auto"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  削除
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 新規イベント作成ダイアログ */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-medium">予定を追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="event-title" className="text-sm">タイトル</Label>
              <Input
                id="event-title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="予定名"
                className="h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="event-start" className="text-sm">開始</Label>
                <Input
                  id="event-start"
                  type="date"
                  value={newEvent.start.split("T")[0]}
                  onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="event-end" className="text-sm">終了</Label>
                <Input
                  id="event-end"
                  type="date"
                  value={newEvent.end?.split("T")[0] || ""}
                  onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="event-description" className="text-sm">メモ</Label>
              <Textarea
                id="event-description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="メモ（任意）"
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setIsCreateDialogOpen(false)}>
                キャンセル
              </Button>
              <Button size="sm" onClick={handleCreateEvent} disabled={!newEvent.title.trim()}>
                追加
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
