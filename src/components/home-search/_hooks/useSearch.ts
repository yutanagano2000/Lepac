"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { SearchResult, CategorizedResults } from "../_types";
import { useDebounce } from "./useDebounce";

export interface UseSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  categorizedResults: CategorizedResults;
  flatResults: SearchResult[];
  isSearching: boolean;
  isFocused: boolean;
  setIsFocused: (focused: boolean) => void;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleResultClick: (href: string) => void;
  showSuggestions: boolean;
}

export function useSearch(): UseSearchReturn {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 300msのデバウンス
  const debouncedQuery = useDebounce(query, 300);

  // デバウンスされたクエリで検索を実行
  useEffect(() => {
    const search = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);

      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(debouncedQuery.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error("検索エラー:", err);
      } finally {
        setIsSearching(false);
      }
    };

    search();
  }, [debouncedQuery]);

  // 結果をカテゴリごとに分類
  const categorizedResults = useMemo<CategorizedResults>(() => {
    const projects = results.filter((r) => r.type === "project");
    const todos = results.filter((r) => r.type === "todo");
    const meetings = results.filter((r) => r.type === "meeting");
    return { projects, todos, meetings };
  }, [results]);

  // フラットな結果リスト（キーボードナビゲーション用）
  const flatResults = useMemo(() => {
    return [
      ...categorizedResults.projects,
      ...categorizedResults.todos,
      ...categorizedResults.meetings,
    ];
  }, [categorizedResults]);

  // 選択インデックスをリセット
  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
      } else if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        if (selectedIndex >= 0 && flatResults[selectedIndex]) {
          router.push(flatResults[selectedIndex].href);
        } else if (flatResults.length > 0) {
          router.push(flatResults[0].href);
        }
      } else if (e.key === "Escape") {
        setIsFocused(false);
        inputRef.current?.blur();
      }
    },
    [flatResults, selectedIndex, router]
  );

  const handleResultClick = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router]
  );

  const showSuggestions = isFocused && query.trim().length > 0;

  return {
    query,
    setQuery,
    results,
    categorizedResults,
    flatResults,
    isSearching,
    isFocused,
    setIsFocused,
    selectedIndex,
    setSelectedIndex,
    inputRef,
    handleKeyDown,
    handleResultClick,
    showSuggestions,
  };
}
