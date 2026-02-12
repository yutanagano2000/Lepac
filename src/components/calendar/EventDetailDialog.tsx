"use client";

import { useState } from "react";
import { Clock, Trash2, ExternalLink, User, Pencil, Loader2 } from "lucide-react";
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
import { DatePicker } from "@/components/ui/date-picker";
import { TimeInput } from "./TimeInput";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { EVENT_TYPE_OPTIONS } from "./constants";
import type { CalendarEventData } from "./types";

interface EventDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEventData | null;
  onDelete: () => void;
  onUpdate: (updatedEvent: CalendarEventData) => void;
}

export function EventDetailDialog({
  open,
  onOpenChange,
  event,
  onDelete,
  onUpdate,
}: EventDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    type: "other" as "todo" | "meeting" | "other",
    start: "",
    end: "",
    startTime: null as string | null,
    endTime: null as string | null,
    description: "",
  });

  const startEdit = () => {
    if (!event) return;
    setEditForm({
      title: event.title,
      type: (event.extendedProps?.type as "todo" | "meeting" | "other") || "other",
      start: event.start?.split("T")[0] || "",
      end: event.end?.split("T")[0] || "",
      startTime: event.extendedProps?.startTime || null,
      endTime: event.extendedProps?.endTime || null,
      description: event.extendedProps?.description || "",
    });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!event || !event.id.startsWith("custom-")) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/calendar/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          eventType: editForm.type,
          eventDate: editForm.start,
          endDate: editForm.end || null,
          startTime: editForm.startTime,
          endTime: editForm.endTime,
          description: editForm.description || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to update event");
      const data = await res.json();

      // 親にフィードバック
      onUpdate({
        ...event,
        title: data.title,
        start: data.startTime ? `${data.start}T${data.startTime}:00` : data.start,
        end: data.endTime
          ? `${data.end || data.start}T${data.endTime}:00`
          : data.end || undefined,
        allDay: !data.startTime && !data.endTime,
        extendedProps: {
          ...event.extendedProps,
          type: data.type,
          description: data.description,
          startTime: data.startTime,
          endTime: data.endTime,
        },
      });
      setIsEditing(false);
      onOpenChange(false);
    } catch (error) {
      console.error("イベントの更新に失敗:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const isCustomEvent = event?.id.startsWith("custom-");

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setIsEditing(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-medium">
              {isEditing ? "予定を編集" : event?.title}
            </DialogTitle>
          </DialogHeader>

          {event && !isEditing && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {new Date(event.start).toLocaleDateString("ja-JP", {
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })}
                  {event.extendedProps?.startTime && (
                    <span className="ml-1">{event.extendedProps.startTime}</span>
                  )}
                  {event.extendedProps?.endTime && (
                    <span> - {event.extendedProps.endTime}</span>
                  )}
                </span>
              </div>

              {event.extendedProps?.projectName && (
                <Link
                  href={`/projects/${event.extendedProps.projectId}`}
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  {event.extendedProps.projectName}
                </Link>
              )}

              {event.extendedProps?.description && (
                <p className="text-sm text-muted-foreground">
                  {event.extendedProps.description}
                </p>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    event.extendedProps?.type === "todo" && "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
                    event.extendedProps?.type === "progress" && "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
                    event.extendedProps?.type === "meeting" && "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
                    event.extendedProps?.type === "other" && "bg-zinc-100 text-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200",
                    event.extendedProps?.status === "completed" && "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                  )}
                >
                  {event.extendedProps?.status === "completed" ? "完了" :
                   event.extendedProps?.type === "todo" ? "TODO" :
                   event.extendedProps?.type === "progress" ? "進捗" :
                   event.extendedProps?.type === "meeting" ? "会議" :
                   event.extendedProps?.type === "other" ? "その他" : "予定"}
                </Badge>
                {event.extendedProps?.userName && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    {event.extendedProps.userName}
                  </span>
                )}
              </div>

              <div className="flex justify-between pt-3 border-t">
                {event.extendedProps?.projectId && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/projects/${event.extendedProps.projectId}`}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      案件
                    </Link>
                  </Button>
                )}
                <div className="flex gap-1 ml-auto">
                  {isCustomEvent && (
                    <Button variant="ghost" size="sm" onClick={startEdit}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      編集
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    削除
                  </Button>
                </div>
              </div>
            </div>
          )}

          {event && isEditing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">タイトル</Label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">種別</Label>
                <Select
                  value={editForm.type}
                  onValueChange={(value: "todo" | "meeting" | "other") =>
                    setEditForm({ ...editForm, type: value })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
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
                  <Label className="text-sm">開始日</Label>
                  <DatePicker
                    value={editForm.start || null}
                    onChange={(val) => setEditForm({ ...editForm, start: val || "" })}
                    placeholder="開始日"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">終了日</Label>
                  <DatePicker
                    value={editForm.end || null}
                    onChange={(val) => setEditForm({ ...editForm, end: val || "" })}
                    placeholder="終了日"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <TimeInput
                  value={editForm.startTime}
                  onChange={(time) => setEditForm({ ...editForm, startTime: time })}
                  label="開始時刻"
                />
                <TimeInput
                  value={editForm.endTime}
                  onChange={(time) => setEditForm({ ...editForm, endTime: time })}
                  label="終了時刻"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">メモ</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="メモ（任意）"
                  rows={2}
                  className="resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={isSaving}>
                  キャンセル
                </Button>
                <Button size="sm" onClick={handleSave} disabled={!editForm.title.trim() || !editForm.start || isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      保存中...
                    </>
                  ) : (
                    "保存"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={onDelete}
        title="予定の削除"
        description="この予定を削除してもよろしいですか？"
      />
    </>
  );
}
