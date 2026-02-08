"use client";

import { useState, useEffect, useCallback } from "react";
import {
  parseCoordinateString,
  normalizeCoordinateString,
} from "@/lib/coordinates";
import type { JudgmentResult } from "../../../_types";

interface UseLegalSearchOptions {
  /** 自動検索用の検索パラメータ */
  searchParams: { lat: string; lon: string; prefecture: string } | null;
  /** プロジェクトの座標 */
  projectCoordinates: string | null;
}

interface UseLegalSearchReturn {
  // 入力状態
  coordinateInput: string;
  latitude: string;
  longitude: string;
  prefecture: string;

  // 検索結果
  result: JudgmentResult | null;
  isLoading: boolean;
  hasSearched: boolean;

  // アクション
  handleCoordinateInput: (value: string) => void;
  setPrefecture: (value: string) => void;
  handleSearch: () => void;
  runSearch: (lat: number, lon: number, pref: string) => Promise<void>;

  // 計算済みの座標
  coordinates: { lat: string; lon: string } | null;
}

/**
 * 法令検索ロジックを管理するフック
 */
export function useLegalSearch(options: UseLegalSearchOptions): UseLegalSearchReturn {
  const { searchParams, projectCoordinates } = options;

  const [coordinateInput, setCoordinateInput] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [result, setResult] = useState<JudgmentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // 座標入力を解析
  const handleCoordinateInput = useCallback((value: string) => {
    setCoordinateInput(value);
    const parsed = parseCoordinateString(value);
    if (parsed) {
      setLatitude(parsed.lat);
      setLongitude(parsed.lon);
      setCoordinateInput(normalizeCoordinateString(value) || value);
    } else {
      setLatitude("");
      setLongitude("");
    }
  }, []);

  // 検索実行
  const runSearch = useCallback(async (lat: number, lon: number, pref: string) => {
    setHasSearched(true);
    setResult(null);
    setIsLoading(true);

    try {
      const response = await fetch(
        "https://geo-checker-backend-aj4j.onrender.com/api/v1/check",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude: lat, longitude: lon, prefecture: pref }),
        }
      );
      const data: JudgmentResult = await response.json();
      setResult(data);
    } catch (error) {
      console.error("判定エラー:", error);
      alert("判定に失敗しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // フォームからの検索実行
  const handleSearch = useCallback(() => {
    if (!latitude || !longitude || !prefecture) return;
    runSearch(parseFloat(latitude), parseFloat(longitude), prefecture);
  }, [latitude, longitude, prefecture, runSearch]);

  // searchParamsが設定されたら自動検索
  useEffect(() => {
    if (!searchParams) return;
    const lat = parseFloat(searchParams.lat);
    const lon = parseFloat(searchParams.lon);
    if (isNaN(lat) || isNaN(lon)) return;
    runSearch(lat, lon, searchParams.prefecture);
  }, [searchParams, runSearch]);

  // 座標を取得
  const getCoordinates = useCallback(() => {
    if (searchParams) {
      return { lat: searchParams.lat, lon: searchParams.lon };
    }
    if (projectCoordinates) {
      const parsed = parseCoordinateString(projectCoordinates);
      if (parsed) return parsed;
    }
    if (latitude && longitude) {
      return { lat: latitude, lon: longitude };
    }
    return null;
  }, [searchParams, projectCoordinates, latitude, longitude]);

  return {
    coordinateInput,
    latitude,
    longitude,
    prefecture,
    result,
    isLoading,
    hasSearched,
    handleCoordinateInput,
    setPrefecture,
    handleSearch,
    runSearch,
    coordinates: getCoordinates(),
  };
}
