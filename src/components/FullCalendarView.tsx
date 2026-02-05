"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Trash2, ExternalLink, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";

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
    type: "todo" | "progress" | "meeting" | "custom" | "other";
    projectId?: number;
    projectName?: string;
    description?: string;
    status?: string;
    userName?: string | null;
    category?: string; // 会議の種別
  };
}

// イベントタイプのオプション
const EVENT_TYPE_OPTIONS = [
  { value: "todo", label: "TODO", color: "bg-amber-500" },
  { value: "meeting", label: "会議", color: "bg-purple-500" },
  { value: "other", label: "その他", color: "bg-zinc-500" },
];

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
    case "other":
    case "custom":
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    start: "",
    end: "",
    allDay: true,
    description: "",
    type: "other" as "todo" | "meeting" | "other",
  });

  // 削除確認ダイアログ用
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // モバイル判定
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
      type: "other",
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

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newEvent.title,
          eventType: newEvent.type,
          eventDate: newEvent.start,
          endDate: newEvent.end || null,
          description: newEvent.description,
        }),
      });

      if (!res.ok) throw new Error("Failed to create event");

      const data = await res.json();
      const colors = getEventColor(data.type);
      const event: CalendarEvent = {
        id: data.id,
        title: data.title,
        start: data.start,
        end: data.end || undefined,
        allDay: true,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        textColor: colors.text,
        extendedProps: {
          type: data.type,
          description: data.description,
          userName: data.userName,
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
        type: "other",
      });
    } catch (error) {
      console.error("イベントの作成に失敗しました:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteDialog = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    // カスタムイベントの場合はAPIで削除
    if (selectedEvent.id.startsWith("custom-")) {
      try {
        const res = await fetch(`/api/calendar/events/${selectedEvent.id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete event");
      } catch (error) {
        console.error("イベントの削除に失敗しました:", error);
        return;
      }
    }

    setEvents(events.filter((e) => e.id !== selectedEvent.id));
    setDeleteDialogOpen(false);
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
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-zinc-500" />
          その他
        </span>
      </div>

      {/* カレンダー */}
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView={isMobile ? "listWeek" : "dayGridMonth"}
        locale={jaLocale}
        headerToolbar={isMobile ? {
          left: "prev,next",
          center: "title",
          right: "listWeek,dayGridMonth",
        } : {
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
        dayMaxEvents={isMobile ? 2 : 3}
        weekends={true}
        eventClick={handleEventClick}
        select={handleDateSelect}
        eventDrop={handleEventDrop}
        height="auto"
        contentHeight={isMobile ? 500 : 650}
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

              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    selectedEvent.extendedProps?.type === "todo" && "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
                    selectedEvent.extendedProps?.type === "progress" && "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
                    selectedEvent.extendedProps?.type === "meeting" && "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
                    selectedEvent.extendedProps?.type === "other" && "bg-zinc-100 text-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200",
                    selectedEvent.extendedProps?.status === "completed" && "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                  )}
                >
                  {selectedEvent.extendedProps?.status === "completed" ? "完了" :
                   selectedEvent.extendedProps?.type === "todo" ? "TODO" :
                   selectedEvent.extendedProps?.type === "progress" ? "進捗" :
                   selectedEvent.extendedProps?.type === "meeting" ? "会議" :
                   selectedEvent.extendedProps?.type === "other" ? "その他" : "予定"}
                </Badge>
                {selectedEvent.extendedProps?.userName && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    {selectedEvent.extendedProps.userName}
                  </span>
                )}
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
                  onClick={openDeleteDialog}
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

            <div className="space-y-1.5">
              <Label className="text-sm">種別</Label>
              <Select
                value={newEvent.type}
                onValueChange={(value: "todo" | "meeting" | "other") => setNewEvent({ ...newEvent, type: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="種別を選択" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <span className={cn("w-2.5 h-2.5 rounded-sm", option.color)} />
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Button variant="ghost" size="sm" onClick={() => setIsCreateDialogOpen(false)} disabled={isSubmitting}>
                キャンセル
              </Button>
              <Button size="sm" onClick={handleCreateEvent} disabled={!newEvent.title.trim() || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    追加中...
                  </>
                ) : (
                  "追加"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteEvent}
        title="予定の削除"
        description="この予定を削除してもよろしいですか？"
      />
    </div>
  );
}
