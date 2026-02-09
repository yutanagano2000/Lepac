"use client";

import { useCallback } from "react";
import type { Feedback } from "@/db/schema";

interface ReplyMessage {
  message: string;
  createdAt: string;
  userId?: number | null;
  userName?: string | null;
}

export function parseReplies(repliesStr: string | null): ReplyMessage[] {
  if (!repliesStr) return [];
  try {
    return JSON.parse(repliesStr);
  } catch {
    return [];
  }
}

interface UseFeedbacksActionsProps {
  onRefresh: () => Promise<void>;
  userId: number | null;
  userName: string | null;
}

export function useFeedbacksActions({ onRefresh, userId, userName }: UseFeedbacksActionsProps) {
  const handleLike = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/feedbacks/${id}/like`, { method: "POST" });
      if (!res.ok) {
        throw new Error("いいねの追加に失敗しました");
      }
      await onRefresh();
    } catch (err) {
      console.error("handleLike error:", err);
      throw err;
    }
  }, [onRefresh]);

  const handleStatusChange = useCallback(async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/feedbacks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        throw new Error("ステータスの変更に失敗しました");
      }
      await onRefresh();
    } catch (err) {
      console.error("handleStatusChange error:", err);
      throw err;
    }
  }, [onRefresh]);

  const handleReply = useCallback(async (feedback: Feedback, replyContent: string) => {
    if (!replyContent.trim()) return;

    const currentReplies = parseReplies(feedback.replies);
    const newReplies = [
      ...currentReplies,
      {
        message: replyContent.trim(),
        createdAt: new Date().toISOString(),
        userId,
        userName,
      },
    ];

    try {
      const res = await fetch(`/api/feedbacks/${feedback.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replies: JSON.stringify(newReplies) }),
      });
      if (!res.ok) {
        throw new Error("返信の追加に失敗しました");
      }
      await onRefresh();
    } catch (err) {
      console.error("handleReply error:", err);
      throw err;
    }
  }, [onRefresh, userId, userName]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/feedbacks/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("削除に失敗しました");
      }
      await onRefresh();
    } catch (err) {
      console.error("handleDelete error:", err);
      throw err;
    }
  }, [onRefresh]);

  return {
    handleLike,
    handleStatusChange,
    handleReply,
    handleDelete,
  };
}
