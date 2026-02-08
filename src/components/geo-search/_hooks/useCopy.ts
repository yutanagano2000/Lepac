"use client";

import { useState, useCallback } from "react";

interface UseCopyReturn {
  copiedText: string | null;
  handleCopy: (text: string) => Promise<void>;
}

export function useCopy(): UseCopyReturn {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      console.error("コピーに失敗しました:", error);
    }
  }, []);

  return { copiedText, handleCopy };
}
