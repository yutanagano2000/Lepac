"use client";

import { useState, useEffect, useCallback } from "react";

interface Organization {
  id: number;
  name: string;
  code: string;
}

export function useOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/organizations");
      if (!res.ok) {
        throw new Error("組織の取得に失敗しました");
      }
      const data = await res.json();
      setOrganizations(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "予期せぬエラーが発生しました";
      setError(message);
      console.error("Failed to fetch organizations:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  return {
    organizations,
    isLoading,
    error,
    refetch: fetchOrganizations,
  };
}

export type { Organization };
