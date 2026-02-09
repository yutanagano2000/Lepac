"use client";

import { useState, useEffect, useCallback } from "react";
import type { Feedback } from "@/db/schema";

export function useFeedbacksData() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedbacks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/feedbacks");
      if (!res.ok) {
        throw new Error("フィードバックの取得に失敗しました");
      }
      const data = await res.json();
      setFeedbacks(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "予期せぬエラーが発生しました";
      setError(message);
      console.error("fetchFeedbacks error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  return { feedbacks, isLoading, error, refetch: fetchFeedbacks };
}
