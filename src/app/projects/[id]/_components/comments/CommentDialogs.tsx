"use client";

import { useState, useEffect } from "react";
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
import type { Comment } from "../../_types";

// ========================================
// 編集ダイアログ
// ========================================

interface CommentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comment: Comment | null;
  onConfirm: (commentId: number, content: string) => void;
}

export function CommentEditDialog({
  open,
  onOpenChange,
  comment,
  onConfirm,
}: CommentEditDialogProps) {
  const [content, setContent] = useState("");

  // ダイアログが開いたときに初期値をセット
  useEffect(() => {
    if (open && comment) {
      setContent(comment.content);
    }
  }, [open, comment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment || !content.trim()) return;
    onConfirm(comment.id, content.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>コメントを編集</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-comment-content">内容</Label>
            <Textarea
              id="edit-comment-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
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
            <Button type="submit" disabled={!content.trim()}>
              保存
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ========================================
// 削除確認ダイアログ
// ========================================

interface CommentDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comment: Comment | null;
  onConfirm: (commentId: number) => void;
}

export function CommentDeleteDialog({
  open,
  onOpenChange,
  comment,
  onConfirm,
}: CommentDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>コメントを削除</AlertDialogTitle>
          <AlertDialogDescription>
            このコメントを削除しますか？
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (comment) {
                onConfirm(comment.id);
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
