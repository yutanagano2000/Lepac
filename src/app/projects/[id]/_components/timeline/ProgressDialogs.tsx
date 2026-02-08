"use client";

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Trash2 } from "lucide-react";
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
import { formatYyyyMd, parseDateText } from "@/hooks/useDatePicker";
import { PROGRESS_TITLES } from "../../_constants";
import type { Progress } from "../../_types";

// ========================================
// 日付入力コンポーネント（内部用）
// ========================================

interface DateInputWithCalendarProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  required?: boolean;
}

function DateInputWithCalendar({
  value,
  onChange,
  placeholder = "例: 2026.1.19",
  required = false,
}: DateInputWithCalendarProps) {
  const [text, setText] = useState(formatYyyyMd(value));
  const [calendarOpen, setCalendarOpen] = useState(false);

  // 外部からvalueが変更された場合にtextを同期
  useEffect(() => {
    setText(formatYyyyMd(value));
  }, [value]);

  const handleTextChange = (inputValue: string) => {
    setText(inputValue);
    if (inputValue === "") {
      onChange(undefined);
      return;
    }
    const parsed = parseDateText(inputValue);
    if (parsed) {
      onChange(parsed);
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onChange(date);
      setText(formatYyyyMd(date));
    } else if (!required) {
      onChange(undefined);
      setText("");
    }
    setCalendarOpen(false);
  };

  return (
    <div className="flex gap-2">
      <Input
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="icon">
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            required={required}
            selected={value}
            onSelect={handleCalendarSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ========================================
// 進捗追加ダイアログ
// ========================================

interface ProgressAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: {
    title: string;
    description: string;
    date: Date;
    status: "planned" | "completed";
  }) => void;
}

export function ProgressAddDialog({
  open,
  onOpenChange,
  onConfirm,
}: ProgressAddDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [status, setStatus] = useState<"planned" | "completed">("planned");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) return;
    onConfirm({ title, description, date, status });
    // リセット
    setTitle("");
    setDescription("");
    setDate(undefined);
    setStatus("planned");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>進捗を追加</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>タイトル</Label>
            <Select value={title} onValueChange={setTitle}>
              <SelectTrigger>
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {PROGRESS_TITLES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">詳細（任意）</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例: 司法書士事務所へ郵送済み"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>日付</Label>
            <DateInputWithCalendar
              value={date}
              onChange={setDate}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>ステータス</Label>
            <Select
              value={status}
              onValueChange={(v: "planned" | "completed") => setStatus(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">予定</SelectItem>
                <SelectItem value="completed">完了</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={!date || !title}>
              追加
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ========================================
// 進捗編集ダイアログ
// ========================================

interface ProgressEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: Progress | null;
  onConfirm: (
    progressId: number,
    data: {
      title: string;
      description: string;
      date: Date;
      completedAt?: Date;
      status: "planned" | "completed";
    }
  ) => void;
  onDelete: (progressId: number) => void;
}

export function ProgressEditDialog({
  open,
  onOpenChange,
  progress,
  onConfirm,
  onDelete,
}: ProgressEditDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [completedAt, setCompletedAt] = useState<Date | undefined>(undefined);
  const [status, setStatus] = useState<"planned" | "completed">("planned");

  // ダイアログが開いたときに初期値をセット
  useEffect(() => {
    if (open && progress) {
      setTitle(progress.title);
      setDescription(progress.description || "");
      setDate(new Date(progress.createdAt));
      setCompletedAt(
        progress.completedAt ? new Date(progress.completedAt) : undefined
      );
      setStatus(progress.status as "planned" | "completed");
    }
  }, [open, progress]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!progress || !title || !date) return;
    onConfirm(progress.id, { title, description, date, completedAt, status });
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!progress) return;
    onDelete(progress.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>進捗を編集</DialogTitle>
        </DialogHeader>
        {progress && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>タイトル</Label>
              <Select value={title} onValueChange={setTitle}>
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {PROGRESS_TITLES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">詳細（任意）</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例: 司法書士事務所へ郵送済み"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>予定日</Label>
              <DateInputWithCalendar
                value={date}
                onChange={setDate}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>完了日（任意）</Label>
              <DateInputWithCalendar
                value={completedAt}
                onChange={setCompletedAt}
              />
            </div>

            <div className="space-y-2">
              <Label>ステータス</Label>
              <Select
                value={status}
                onValueChange={(v: "planned" | "completed") => setStatus(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">予定</SelectItem>
                  <SelectItem value="completed">完了</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                削除
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={!date || !title}>
                  保存
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
