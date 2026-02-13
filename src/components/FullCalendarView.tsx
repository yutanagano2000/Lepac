"use client";

import { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { EventClickArg, DateSelectArg, EventDropArg } from "@fullcalendar/core";
import jaLocale from "@fullcalendar/core/locales/ja";
import { EventDetailDialog } from "@/components/calendar/EventDetailDialog";
import { EventCreateDialog, type NewEventData } from "@/components/calendar/EventCreateDialog";
import { getEventColor } from "@/components/calendar/constants";
import type { CalendarEventData } from "@/components/calendar/types";

interface FullCalendarViewProps {
  initialEvents?: CalendarEventData[];
}

export default function FullCalendarView({ initialEvents = [] }: FullCalendarViewProps) {
  const [events, setEvents] = useState<CalendarEventData[]>(initialEvents);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventData | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState<NewEventData>({
    title: "",
    start: "",
    end: "",
    allDay: true,
    description: "",
    type: "other",
    startTime: null,
    endTime: null,
  });

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
      startTime: null,
      endTime: null,
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
    setError(null);
    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newEvent.title,
          eventType: newEvent.type,
          eventDate: newEvent.start,
          endDate: newEvent.end || null,
          startTime: newEvent.startTime,
          endTime: newEvent.endTime,
          description: newEvent.description,
        }),
      });

      if (!res.ok) throw new Error("Failed to create event");

      const data = await res.json();
      const colors = getEventColor(data.type);
      const event: CalendarEventData = {
        id: data.id,
        title: data.title,
        start: data.startTime ? `${data.start}T${data.startTime}:00` : data.start,
        end: data.endTime
          ? `${data.end || data.start}T${data.endTime}:00`
          : data.end || undefined,
        allDay: !data.startTime && !data.endTime,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        textColor: colors.text,
        extendedProps: {
          type: data.type,
          description: data.description,
          userName: data.userName,
          startTime: data.startTime,
          endTime: data.endTime,
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
        startTime: null,
        endTime: null,
      });
    } catch (err) {
      console.error("イベントの作成に失敗しました:", err);
      setError("予定の追加に失敗しました。再度お試しください。");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    if (selectedEvent.id.startsWith("custom-")) {
      try {
        const res = await fetch(`/api/calendar/events/${selectedEvent.id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete event");
      } catch (err) {
        console.error("イベントの削除に失敗しました:", err);
        setError("予定の削除に失敗しました。再度お試しください。");
        setTimeout(() => setError(null), 3000);
        return;
      }
    }

    setEvents(events.filter((e) => e.id !== selectedEvent.id));
    setIsEventDialogOpen(false);
    setSelectedEvent(null);
  };

  const handleUpdateEvent = (updatedEvent: CalendarEventData) => {
    setEvents(events.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)));
    setSelectedEvent(updatedEvent);
  };

  return (
    <div className="h-full">
      {/* エラーメッセージ */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}

      {/* 凡例 */}
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
      <EventDetailDialog
        open={isEventDialogOpen}
        onOpenChange={setIsEventDialogOpen}
        event={selectedEvent}
        onDelete={handleDeleteEvent}
        onUpdate={handleUpdateEvent}
      />

      {/* 新規イベント作成ダイアログ */}
      <EventCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        newEvent={newEvent}
        onNewEventChange={setNewEvent}
        onSubmit={handleCreateEvent}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
