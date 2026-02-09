"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  ThumbsUp,
  MessageCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  User,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { cn } from "@/lib/utils";
import type { Feedback } from "@/db/schema";
import { useFeedbacksData, useFeedbacksActions, parseReplies } from "./_hooks";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const h = date.getHours();
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${m}/${d} ${h}:${min}`;
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}/${d}`;
}

const STATUS_CONFIG = {
  pending: {
    label: "未対応",
    icon: Clock,
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  in_progress: {
    label: "対応中",
    icon: Loader2,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  completed: {
    label: "完了",
    icon: CheckCircle2,
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  rejected: {
    label: "見送り",
    icon: XCircle,
    color: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
  },
};

export default function FeedbacksPage() {
  const { data: session } = useSession();
  const { feedbacks, isLoading, error, refetch } = useFeedbacksData();

  const userId = session?.user?.id ? parseInt(session.user.id) : null;
  const userName = session?.user?.name || session?.user?.username || null;

  const { handleLike, handleStatusChange, handleReply, handleDelete } = useFeedbacksActions({
    onRefresh: refetch,
    userId,
    userName,
  });

  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const toggleExpand = (id: number) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((f) => {
      if (statusFilter === "all") return true;
      return f.status === statusFilter;
    });
  }, [feedbacks, statusFilter]);

  const statusCounts = useMemo(() => ({
    all: feedbacks.length,
    pending: feedbacks.filter((f) => f.status === "pending").length,
    in_progress: feedbacks.filter((f) => f.status === "in_progress").length,
    completed: feedbacks.filter((f) => f.status === "completed").length,
    rejected: feedbacks.filter((f) => f.status === "rejected").length,
  }), [feedbacks]);

  const onReplySubmit = async () => {
    const feedback = feedbacks.find((f) => f.id === replyingId);
    if (feedback) {
      try {
        await handleReply(feedback, replyContent);
        setReplyContent("");
        setReplyingId(null);
      } catch {
        // エラーはフック内でログ出力済み
      }
    }
  };

  const onDeleteConfirm = async () => {
    if (deleteId === null) return;
    try {
      await handleDelete(deleteId);
      setDeleteId(null);
    } catch {
      // エラーはフック内でログ出力済み
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <Card className="border-destructive">
          <CardContent className="py-8 flex flex-col items-center gap-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={refetch}>
              再試行
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">要望</h1>
        <p className="text-sm text-muted-foreground">
          ユーザーからのフィードバック
        </p>
      </div>

      {/* ステータスフィルター */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {[
          { key: "all", label: "すべて", icon: null, color: "" },
          { key: "pending", label: "未対応", icon: Clock, color: "text-yellow-600" },
          { key: "in_progress", label: "対応中", icon: Loader2, color: "text-blue-600" },
          { key: "completed", label: "完了", icon: CheckCircle2, color: "text-green-600" },
          { key: "rejected", label: "見送り", icon: XCircle, color: "text-gray-500" },
        ].map(({ key, label, icon: Icon, color }) => (
          <Button
            key={key}
            variant={statusFilter === key ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(key)}
            className={cn("h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3", statusFilter !== key && color)}
          >
            {Icon && <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />}
            <span className="hidden xs:inline">{label}</span>
            <span className="xs:hidden">{label.slice(0, 2)}</span>
            <span className="ml-1">({statusCounts[key as keyof typeof statusCounts]})</span>
          </Button>
        ))}
      </div>

      {/* 要望リスト */}
      {filteredFeedbacks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-base text-muted-foreground">
            要望はまだありません
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredFeedbacks.map((feedback) => {
            const statusConfig = STATUS_CONFIG[feedback.status as keyof typeof STATUS_CONFIG];
            const StatusIcon = statusConfig.icon;
            const replies = parseReplies(feedback.replies);
            const isExpanded = expandedIds.has(feedback.id);

            return (
              <Card key={feedback.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* メインコンテンツ */}
                  <div className="p-3 sm:p-4">
                    <div className="flex items-start gap-2 sm:gap-3">
                      {/* 展開ボタン */}
                      <button
                        onClick={() => toggleExpand(feedback.id)}
                        className={cn(
                          "mt-1 p-1 rounded hover:bg-muted transition-colors shrink-0",
                          replies.length === 0 && "invisible"
                        )}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>

                      {/* コンテンツ */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                          <p className="text-sm sm:text-base leading-relaxed">{feedback.content}</p>
                          <Badge className={cn("shrink-0 text-xs px-2 py-0.5 w-fit", statusConfig.color)}>
                            <StatusIcon className={cn("h-3.5 w-3.5 mr-1", feedback.status === "in_progress" && "animate-spin")} />
                            {statusConfig.label}
                          </Badge>
                        </div>

                        {/* メタ情報 */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs text-muted-foreground">
                          {feedback.userName && (
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5" />
                              {feedback.userName}
                            </span>
                          )}
                          <span>{formatDate(feedback.createdAt)}</span>
                          <span className="px-2 py-1 rounded bg-muted text-xs hidden sm:inline">
                            {feedback.pageTitle || feedback.pagePath}
                          </span>
                          {replies.length > 0 && (
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3.5 w-3.5" />
                              {replies.length}
                            </span>
                          )}
                        </div>

                        {/* モバイル用アクション */}
                        <div className="flex items-center gap-1 mt-3 sm:hidden">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-3"
                            onClick={() => handleLike(feedback.id)}
                          >
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            <span className="text-sm">{feedback.likes}</span>
                          </Button>
                          <Select
                            value={feedback.status}
                            onValueChange={(value) => handleStatusChange(feedback.id, value)}
                          >
                            <SelectTrigger className="h-9 w-24 text-xs px-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending" className="text-sm">未対応</SelectItem>
                              <SelectItem value="in_progress" className="text-sm">対応中</SelectItem>
                              <SelectItem value="completed" className="text-sm">完了</SelectItem>
                              <SelectItem value="rejected" className="text-sm">見送り</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(feedback.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* デスクトップ用アクション */}
                      <div className="hidden sm:flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleLike(feedback.id)}
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          <span className="text-sm">{feedback.likes}</span>
                        </Button>
                        <Select
                          value={feedback.status}
                          onValueChange={(value) => handleStatusChange(feedback.id, value)}
                        >
                          <SelectTrigger className="h-8 w-24 text-xs px-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending" className="text-sm">未対応</SelectItem>
                            <SelectItem value="in_progress" className="text-sm">対応中</SelectItem>
                            <SelectItem value="completed" className="text-sm">完了</SelectItem>
                            <SelectItem value="rejected" className="text-sm">見送り</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(feedback.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* 返信ツリー */}
                  {isExpanded && replies.length > 0 && (
                    <div className="border-t bg-muted/30 px-4 py-3">
                      <div className="ml-6 space-y-2">
                        {replies.map((reply, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <div className="flex flex-col items-center">
                              <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                              {idx < replies.length - 1 && (
                                <div className="w-0.5 flex-1 bg-border min-h-[20px]" />
                              )}
                            </div>
                            <div className="flex-1 p-2 rounded bg-background border text-sm">
                              <p>{reply.message}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                {reply.userName && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {reply.userName}
                                  </span>
                                )}
                                <span>{formatDateShort(reply.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 返信追加ボタン */}
                  <div className="border-t px-4 py-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => {
                        setReplyingId(feedback.id);
                        if (!expandedIds.has(feedback.id)) {
                          toggleExpand(feedback.id);
                        }
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      返信
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 返信ダイアログ */}
      <Dialog open={replyingId !== null} onOpenChange={() => setReplyingId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">返信を追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="対応状況やコメントを入力..."
              rows={4}
              className="text-base"
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setReplyingId(null)}>
                キャンセル
              </Button>
              <Button
                onClick={onReplySubmit}
                disabled={!replyContent.trim()}
              >
                追加
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">要望を削除</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              この要望を削除しますか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
