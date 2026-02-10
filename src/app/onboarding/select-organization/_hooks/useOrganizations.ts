"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Organization {
  id: number;
  name: string;
  code: string;
}

export function useOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchOrganizations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/organizations");
      if (!res.ok) {
        // セキュリティ: 内部エラー詳細をクライアントに漏洩させない
        const statusText = res.status >= 500
          ? "サーバーエラーが発生しました"
          : "組織の取得に失敗しました";
        throw new Error(statusText);
      }

      // JSONパースエラーをハンドリング
      let data: Organization[];
      try {
        data = await res.json();
      } catch {
        throw new Error("データの解析に失敗しました");
      }

      // レスポンスの型を検証
      if (!Array.isArray(data)) {
        throw new Error("不正なレスポンス形式です");
      }

      // アンマウント後のステート更新を防止
      if (isMountedRef.current) {
        setOrganizations(data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "予期せぬエラーが発生しました";
      if (isMountedRef.current) {
        setError(message);
        // エラー時はstaleデータをクリア
        setOrganizations([]);
      }
      // セキュリティ: 本番環境ではスタックトレースを除外
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to fetch organizations:", err);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchOrganizations();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchOrganizations]);

  return {
    organizations,
    isLoading,
    error,
    refetch: fetchOrganizations,
  };
}

export type { Organization };
