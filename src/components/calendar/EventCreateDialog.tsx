"use client";

import { Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { TimeInput } from "./TimeInput";
import { cn } from "@/lib/utils";
import { EVENT_TYPE_OPTIONS } from "./constants";

export interface NewEventData {
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  description: string;
  type: "todo" | "meeting" | "other";
  startTime: string | null;
  endTime: string | null;
}

interface EventCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newEvent: NewEventData;
  onNewEventChange: (event: NewEventData) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function EventCreateDialog({
  open,
  onOpenChange,
  newEvent,
  onNewEventChange,
  onSubmit,
  isSubmitting,
}: EventCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onChange={(e) => onNewEventChange({ ...newEvent, title: e.target.value })}
              placeholder="予定名"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">種別</Label>
            <Select
              value={newEvent.type}
              onValueChange={(value: "todo" | "meeting" | "other") =>
                onNewEventChange({ ...newEvent, type: value })
              }
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
              <Label className="text-sm">開始日</Label>
              <DatePicker
                value={newEvent.start?.split("T")[0] || null}
                onChange={(val) => onNewEventChange({ ...newEvent, start: val || "" })}
                placeholder="開始日"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">終了日</Label>
              <DatePicker
                value={newEvent.end?.split("T")[0] || null}
                onChange={(val) => onNewEventChange({ ...newEvent, end: val || "" })}
                placeholder="終了日"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TimeInput
              value={newEvent.startTime}
              onChange={(time) => onNewEventChange({ ...newEvent, startTime: time })}
              label="開始時刻"
            />
            <TimeInput
              value={newEvent.endTime}
              onChange={(time) => onNewEventChange({ ...newEvent, endTime: time })}
              label="終了時刻"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-description" className="text-sm">メモ</Label>
            <Textarea
              id="event-description"
              value={newEvent.description}
              onChange={(e) => onNewEventChange({ ...newEvent, description: e.target.value })}
              placeholder="メモ（任意）"
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              キャンセル
            </Button>
            <Button size="sm" onClick={onSubmit} disabled={!newEvent.title.trim() || isSubmitting}>
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
  );
}
