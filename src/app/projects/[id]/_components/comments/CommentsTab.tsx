"use client";

import { useState } from "react";
import { MessageCircle, Send, Pencil, Trash2 } from "lucide-react";
import { formatDateJp } from "@/lib/timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { Comment } from "../../_types";

interface CommentsTabProps {
  /** コメントリスト */
  comments: Comment[];
  /** コメント追加時のコールバック */
  onAdd: (content: string) => Promise<void>;
  /** コメント編集ダイアログを開く */
  onEditOpen: (comment: Comment) => void;
  /** コメント削除ダイアログを開く */
  onDeleteOpen: (comment: Comment) => void;
}

/**
 * コメントタブコンテンツ
 */
export function CommentsTab({
  comments,
  onAdd,
  onEditOpen,
  onDeleteOpen,
}: CommentsTabProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAdd(newComment.trim());
      setNewComment("");
    } finally {
      setIsSubmitting(false);
    }
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
          <Button
            type="submit"
            size="icon"
            disabled={!newComment.trim() || isSubmitting}
          >
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
            <CommentCard
              key={comment.id}
              comment={comment}
              onEdit={() => onEditOpen(comment)}
              onDelete={() => onDeleteOpen(comment)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface CommentCardProps {
  comment: Comment;
  onEdit: () => void;
  onDelete: () => void;
}

function CommentCard({ comment, onEdit, onDelete }: CommentCardProps) {
  return (
    <Card className="bg-muted/50">
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
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
