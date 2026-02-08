"use client";

import { useState, useEffect } from "react";

/**
 * デバウンス用のカスタムフック
 * 指定したミリ秒間、値の変更がなければ更新を反映する
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
