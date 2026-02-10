"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { JudgmentResult } from "../_types";

interface SearchParams {
  lat: string;
  lon: string;
  prefecture: string;
}

interface UseLegalSearchProps {
  searchParams: SearchParams | null;
}

export function useLegalSearch({ searchParams }: UseLegalSearchProps) {
  const [result, setResult] = useState<JudgmentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // 検索実行
  const runSearch = useCallback(async (lat: number, lon: number, pref: string) => {
    setHasSearched(true);
    setResult(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/legal-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lon, prefecture: pref }),
      });
      const data: JudgmentResult = await response.json();
      setResult(data);
    } catch (error) {
      console.error("判定エラー:", error);
      toast.error("判定に失敗しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // searchParamsが設定されたら自動検索
  useEffect(() => {
    if (!searchParams) return;
    const lat = parseFloat(searchParams.lat);
    const lon = parseFloat(searchParams.lon);
    if (isNaN(lat) || isNaN(lon)) return;
    runSearch(lat, lon, searchParams.prefecture);
  }, [searchParams, runSearch]);

  return {
    result,
    isLoading,
    hasSearched,
    setHasSearched,
    runSearch,
  };
}
