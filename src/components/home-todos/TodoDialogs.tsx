"use client";

import { useState } from "react";
import { CheckCircle2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateJp } from "@/lib/timeline";
import type { TodoWithProject } from "@/components/HomeTodosView";

// 完了ダイアログ
interface CompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todo: TodoWithProject | null;
  onSubmit: (todoId: number, memo: string) => Promise<void>;
}

export function TodoCompleteDialog({ open, onOpenChange, todo, onSubmit }: CompleteDialogProps) {
  const [memo, setMemo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todo) return;
    setIsSubmitting(true);
    try {
      await onSubmit(todo.id, memo);
      setMemo("");
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setMemo(""); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            TODOを完了
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {todo && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm font-medium">{todo.content}</p>
              <p className="text-xs text-muted-foreground mt-1">
                期日: {formatDateJp(new Date(todo.dueDate + "T00:00:00"))}
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="complete-memo">完了メモ（任意）</Label>
            <Textarea
              id="complete-memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="完了時のメモを入力..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
              {isSubmitting ? "処理中..." : "完了にする"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// 編集ダイアログ
interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todo: TodoWithProject | null;
  onSubmit: (todoId: number, content: string, dueDate: string) => Promise<void>;
}

export function TodoEditDialog({ open, onOpenChange, todo, onSubmit }: EditDialogProps) {
  const [content, setContent] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ダイアログが開いたときにtodoの値を設定
  const handleOpenChange = (v: boolean) => {
    if (v && todo) {
      setContent(todo.content);
      setDueDate(todo.dueDate);
    } else if (!v) {
      setContent("");
      setDueDate("");
    }
    onOpenChange(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todo || !content.trim() || !dueDate) return;
    setIsSubmitting(true);
    try {
      await onSubmit(todo.id, content.trim(), dueDate);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            TODOを編集
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-content">内容</Label>
            <Textarea
              id="edit-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>期日</Label>
            <DatePicker
              value={dueDate || null}
              onChange={(val) => setDueDate(val || "")}
              placeholder="期日を選択"
              className="w-full"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting || !content.trim() || !dueDate}>
              {isSubmitting ? "保存中..." : "保存"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// メッセージ追加ダイアログ
interface AddMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todo: TodoWithProject | null;
  onSubmit: (todoId: number, message: string, existingMemo: string | null) => Promise<void>;
}

export function TodoAddMessageDialog({ open, onOpenChange, todo, onSubmit }: AddMessageDialogProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todo || !message.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(todo.id, message.trim(), todo.completedMemo);
      setMessage("");
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setMessage(""); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            メモを追加
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {todo && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm font-medium line-through text-muted-foreground">{todo.content}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="new-message">メッセージ</Label>
            <Textarea
              id="new-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="メッセージを入力..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting || !message.trim()}>
              {isSubmitting ? "追加中..." : "追加"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
