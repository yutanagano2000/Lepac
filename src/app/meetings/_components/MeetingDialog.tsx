"use client";

import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { MeetingFormData } from "../_types";
import { CATEGORY_OPTIONS } from "../_constants";

interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: MeetingFormData;
  onFormChange: (updates: Partial<MeetingFormData>) => void;
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  calendarOpen: boolean;
  onCalendarOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function MeetingDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  selectedDate,
  onDateSelect,
  calendarOpen,
  onCalendarOpenChange,
  isSubmitting,
  onSubmit,
}: MeetingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>議事録を新規登録</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meeting-title">タイトル</Label>
            <Input
              id="meeting-title"
              value={form.title}
              onChange={(e) => onFormChange({ title: e.target.value })}
              placeholder="例: 〇〇案件 定例ミーティング"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>日付</Label>
            <Popover open={calendarOpen} onOpenChange={onCalendarOpenChange}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate
                    ? format(selectedDate, "yyyy年M月d日", { locale: ja })
                    : "選択してください"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={onDateSelect}
                  locale={ja}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="meeting-category">カテゴリ</Label>
            <Select
              value={form.category}
              onValueChange={(value) => onFormChange({ category: value })}
            >
              <SelectTrigger id="meeting-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="meeting-content">内容</Label>
            <Textarea
              id="meeting-content"
              value={form.content}
              onChange={(e) => onFormChange({ content: e.target.value })}
              placeholder="議事録の長文テキストをペーストしてください"
              className="min-h-[200px] resize-y font-mono text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  登録中...
                </>
              ) : (
                "登録"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
