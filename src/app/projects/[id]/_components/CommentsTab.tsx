"use client";

import { useState, memo } from "react";
import { MessageCircle, Send, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { formatDateJp } from "@/lib/timeline";
import type { Comment } from "@/db/schema";

interface CommentsTabProps {
  projectId: string;
  comments: Comment[];
  onCommentsChange: () => void;
}

function CommentsTabContent({ projectId, comments, onCommentsChange }: CommentsTabProps) {
  const [newComment, setNewComment] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingComment, setDeletingComment] = useState<Comment | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await fetch(`/api/projects/${projectId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment }),
    });
    setNewComment("");
    onCommentsChange();
  };

  const openEditDialog = (comment: Comment) => {
    setEditingComment(comment);
    setEditContent(comment.content);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingComment || !editContent.trim()) return;
    await fetch(`/api/projects/${projectId}/comments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId: editingComment.id, content: editContent }),
    });
    setEditOpen(false);
    setEditingComment(null);
    onCommentsChange();
  };

  const openDeleteDialog = (comment: Comment) => {
    setDeletingComment(comment);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingComment) return;
    await fetch(`/api/projects/${projectId}/comments?commentId=${deletingComment.id}`, {
      method: "DELETE",
    });
    setDeleteOpen(false);
    setDeletingComment(null);
    onCommentsChange();
  };

  return (
    <div className="relative">
      <div className="mb-4 flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold">コメント</h2>
      </div>

      {/* コメント投稿欄 */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="コメントを入力..."
            rows={2}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!newComment.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>

      {/* コメント一覧 */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">コメントはありません</p>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className="bg-muted/50">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm">{comment.content}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateJp(new Date(comment.createdAt))}
                      {comment.userName && (
                        <span className="ml-2">· {comment.userName}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEditDialog(comment)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => openDeleteDialog(comment)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 編集ダイアログ - 遅延マウント */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        {editOpen && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>コメントを編集</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleEdit} disabled={!editContent.trim()}>
                  更新
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* 削除確認ダイアログ - 遅延マウント */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        {deleteOpen && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>コメントを削除</AlertDialogTitle>
              <AlertDialogDescription>
                このコメントを削除しますか？この操作は取り消せません。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>削除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}

export const CommentsTab = memo(CommentsTabContent);
