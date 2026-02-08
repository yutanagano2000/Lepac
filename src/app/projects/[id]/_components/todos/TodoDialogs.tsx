"use client";

import { useState } from "react";
import { Plus, CheckCircle2, Calendar as CalendarIcon } from "lucide-react";
import { formatDateJp } from "@/lib/timeline";
import { cn, parseTodoMessages } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Todo } from "../../_types";

// ========================================
// 削除確認ダイアログ
// ========================================

interface TodoDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todo: Todo | null;
  onConfirm: (todoId: number) => void;
}

export function TodoDeleteDialog({
  open,
  onOpenChange,
  todo,
  onConfirm,
}: TodoDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>TODOを削除</AlertDialogTitle>
          <AlertDialogDescription>
            このTODOを削除しますか？
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (todo) {
                onConfirm(todo.id);
              }
              onOpenChange(false);
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            削除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ========================================
// 完了ダイアログ
// ========================================

interface TodoCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todo: Todo | null;
  onConfirm: (todoId: number, memo: string) => void;
}

export function TodoCompleteDialog({
  open,
  onOpenChange,
  todo,
  onConfirm,
}: TodoCompleteDialogProps) {
  const [memo, setMemo] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!todo) return;
    onConfirm(todo.id, memo);
    setMemo("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>TODOを完了</DialogTitle>
          <p className="text-sm text-muted-foreground">
            完了メモを残すことができます（任意）
          </p>
        </DialogHeader>
        {todo && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="complete-todo-memo">完了メモ</Label>
              <Textarea
                id="complete-todo-memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="完了時のメモを入力..."
                rows={3}
                className="resize-y"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                キャンセル
              </Button>
              <Button type="submit">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                完了する
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ========================================
// メッセージ追加ダイアログ
// ========================================

interface TodoAddMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todo: Todo | null;
  onConfirm: (todo: Todo, message: string) => void;
}

export function TodoAddMessageDialog({
  open,
  onOpenChange,
  todo,
  onConfirm,
}: TodoAddMessageDialogProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!todo || !message.trim()) return;
    onConfirm(todo, message.trim());
    setMessage("");
    onOpenChange(false);
  };

  const existingMessages = todo?.completedMemo
    ? parseTodoMessages(todo.completedMemo)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>メッセージを追加</DialogTitle>
          <p className="text-sm text-muted-foreground">
            完了済みTODOにメッセージを追加します
          </p>
        </DialogHeader>
        {todo && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 既存メッセージの表示 */}
            {existingMessages.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                <Label className="text-xs text-muted-foreground">
                  既存のメッセージ
                </Label>
                {existingMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className="text-xs p-2 rounded bg-muted/50 border border-border/50"
                  >
                    <p>{msg.message}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {formatDateJp(new Date(msg.createdAt))}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="new-todo-message">新しいメッセージ</Label>
              <Textarea
                id="new-todo-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="メッセージを入力..."
                rows={3}
                className="resize-y"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={!message.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                追加
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ========================================
// 編集ダイアログ
// ========================================

interface TodoEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todo: Todo | null;
  onConfirm: (todoId: number, content: string, dueDate: string) => void;
}

export function TodoEditDialog({
  open,
  onOpenChange,
  todo,
  onConfirm,
}: TodoEditDialogProps) {
  const [content, setContent] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // ダイアログが開いたときに初期値をセット
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && todo) {
      setContent(todo.content);
      setDueDate(todo.dueDate);
      setSelectedDate(new Date(todo.dueDate + "T00:00:00"));
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!todo || !content.trim() || !dueDate) return;
    onConfirm(todo.id, content.trim(), dueDate);
    onOpenChange(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      setDueDate(`${y}-${m}-${d}`);
      setCalendarOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>TODOを編集</DialogTitle>
        </DialogHeader>
        {todo && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-todo-content">内容</Label>
              <Textarea
                id="edit-todo-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="この日までに行うことを入力..."
                rows={3}
                className="resize-y"
              />
            </div>
            <div className="space-y-2">
              <Label>期日</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
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
                    {selectedDate ? formatDateJp(selectedDate) : "期日を選択"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={!content.trim() || !dueDate}>
                保存
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
