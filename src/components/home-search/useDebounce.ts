import { useState, useEffect } from "react";

/**
 * 適応型デバウンスフック
 * 入力文字数に応じてデバウンス時間を自動調整:
 * - 1文字: 400ms（候補が多すぎるため遅延）
 * - 2文字: 250ms
 * - 3文字以上: 150ms（即座に検索）
 */
function getAdaptiveDelay(value: unknown): number {
  if (typeof value !== "string") return 300;
  const len = value.trim().length;
  if (len <= 1) return 400;
  if (len === 2) return 250;
  return 150;
}

export function useDebounce<T>(value: T, delay?: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const effectiveDelay = delay ?? getAdaptiveDelay(value);
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, effectiveDelay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
