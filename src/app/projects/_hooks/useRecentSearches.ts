"use client";

import { useState, useEffect, useCallback } from "react";
import { PROJECT_SEARCH_RECENT_KEY, MAX_RECENT_SEARCHES } from "../_constants";

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROJECT_SEARCH_RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr)
      ? arr.filter((x): x is string => typeof x === "string").slice(0, MAX_RECENT_SEARCHES)
      : [];
  } catch {
    return [];
  }
}

function addRecentSearch(query: string): string[] {
  const q = query.trim();
  if (!q) return getRecentSearches();
  const prev = getRecentSearches();
  const next = [q, ...prev.filter((x) => x !== q)].slice(0, MAX_RECENT_SEARCHES);
  try {
    localStorage.setItem(PROJECT_SEARCH_RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

interface UseRecentSearchesReturn {
  recentSearches: string[];
  showSuggestions: boolean;
  handleSearchFocus: () => void;
  handleSearchBlur: (currentQuery: string) => void;
  handleSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, currentQuery: string) => void;
  handleSuggestionClick: (text: string, setQuery: (q: string) => void) => void;
}

export function useRecentSearches(): UseRecentSearchesReturn {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const handleSearchFocus = useCallback(() => {
    setShowSuggestions(true);
  }, []);

  const handleSearchBlur = useCallback((currentQuery: string) => {
    setTimeout(() => setShowSuggestions(false), 200);
    const q = currentQuery.trim();
    if (q) setRecentSearches(addRecentSearch(q));
  }, []);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, currentQuery: string) => {
      if (e.key === "Enter") {
        const q = currentQuery.trim();
        if (q) setRecentSearches(addRecentSearch(q));
      }
    },
    []
  );

  const handleSuggestionClick = useCallback(
    (text: string, setQuery: (q: string) => void) => {
      setQuery(text);
      setRecentSearches(addRecentSearch(text));
      setShowSuggestions(false);
    },
    []
  );

  return {
    recentSearches,
    showSuggestions,
    handleSearchFocus,
    handleSearchBlur,
    handleSearchKeyDown,
    handleSuggestionClick,
  };
}
