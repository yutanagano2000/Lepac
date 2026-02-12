"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ArrowRight, FolderKanban, MessageSquare, CheckSquare, AlertCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { SearchResult } from "@/components/home-search/types";

const PROJECT_SEARCH_RECENT_KEY = "geo_checker_recent_project_searches";
const MAX_RECENT_SEARCHES = 3;
const DEBOUNCE_MS = 300;
const MAX_DISPLAY_PER_TYPE = 8;

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

interface HomeProjectSearchProps {
  size?: "default" | "large";
}

export function HomeProjectSearch({ size = "default" }: HomeProjectSearchProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isLarge = size === "large";

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const fetchResults = useCallback(async (query: string) => {
    if (abortRef.current) abortRef.current.abort();

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsSearching(true);
    setFetchError(null);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`検索エラー: ${res.status}`);
      const data: SearchResult[] = await res.json();
      setResults(data);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("検索エラー:", err);
      setFetchError("検索に失敗しました");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setIsOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      fetchResults(value);
    }, DEBOUNCE_MS);
  }, [fetchResults]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const handleSearchFocus = () => {
    setIsOpen(true);
    setShowSuggestions(true);
  };
  const handleSearchBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
    const q = searchQuery.trim();
    if (q) setRecentSearches(addRecentSearch(q));
  };
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const q = searchQuery.trim();
      if (q) setRecentSearches(addRecentSearch(q));
    }
  };
  const handleSuggestionClick = (text: string) => {
    setSearchQuery(text);
    setRecentSearches(addRecentSearch(text));
    setShowSuggestions(false);
    fetchResults(text);
  };

  // 結果をタイプ別に分類
  const projectResults = results.filter((r) => r.type === "project");
  const meetingResults = results.filter((r) => r.type === "meeting");
  const todoResults = results.filter((r) => r.type === "todo");

  const hasResults = results.length > 0;
  const totalCount = results.length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" || totalCount === 0) return;
    e.preventDefault();
    if (totalCount === 1) {
      router.push(results[0].href);
      setSearchQuery("");
      setIsOpen(false);
    }
  };

  const showResultsDropdown = isOpen && searchQuery.trim() !== "";
  const showRecentSuggestions = isOpen && showSuggestions && recentSearches.length > 0 && !searchQuery.trim();

  return (
    <div ref={containerRef} className="relative w-full">
      {fetchError && !isSearching && (
        <div className="mb-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          {fetchError}
        </div>
      )}
      <div className="relative">
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 z-10 pointer-events-none ${isLarge ? "h-6 w-6" : "h-5 w-5"}`} />
        <Input
          type="search"
          placeholder="管理番号・案件番号・地権者・住所・担当者・販売先で検索"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
          onKeyDown={(e) => {
            handleSearchKeyDown(e);
            handleKeyDown(e);
          }}
          className={`w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus-visible:ring-2 rounded-xl ${
            isLarge
              ? "pl-14 h-14 text-lg"
              : "pl-12 h-12 text-base"
          }`}
        />
        {isSearching && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-zinc-400" />
        )}
      </div>

      {showRecentSuggestions && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden"
          onMouseDown={(e) => e.preventDefault()}
        >
          <p className="px-4 py-2 text-xs text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            最近の検索
          </p>
          <ul className="py-1">
            {recentSearches.map((text) => (
              <li key={text}>
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:bg-zinc-50 dark:focus:bg-zinc-800 focus:outline-none"
                  onMouseDown={() => handleSuggestionClick(text)}
                >
                  {text}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showResultsDropdown && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden">
          {isSearching && !hasResults ? (
            <div className="px-4 py-6 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">検索中...</p>
            </div>
          ) : !hasResults && !isSearching ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                「{searchQuery.trim()}」に該当する結果はありません
              </p>
              <p className="text-xs text-zinc-500">
                別のキーワードで検索してみてください
              </p>
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  「{searchQuery.trim()}」で{" "}
                  {[
                    projectResults.length > 0 && `案件 ${projectResults.length} 件`,
                    todoResults.length > 0 && `TODO ${todoResults.length} 件`,
                    meetingResults.length > 0 && `議事録 ${meetingResults.length} 件`,
                  ]
                    .filter(Boolean)
                    .join("、")}{" "}
                  が見つかりました
                </p>
              </div>
              <div className="py-2">
                {projectResults.length > 0 && (
                  <>
                    <div className="px-4 py-1.5 text-xs font-medium text-zinc-500 flex items-center gap-1.5">
                      <FolderKanban className="h-3.5 w-3.5" />
                      案件
                    </div>
                    <ul>
                      {projectResults.slice(0, MAX_DISPLAY_PER_TYPE).map((r) => (
                        <li key={`p-${r.id}`}>
                          <Link
                            href={r.href}
                            onClick={() => {
                              setSearchQuery("");
                              setIsOpen(false);
                            }}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                          >
                            <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                              {r.title}
                            </span>
                            <span className="text-sm text-zinc-500 truncate flex-1 min-w-0">
                              {r.subtitle ?? ""}
                            </span>
                            <ArrowRight className="h-4 w-4 text-zinc-400 shrink-0" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {projectResults.length > MAX_DISPLAY_PER_TYPE && (
                      <div className="px-4 py-1 text-xs text-zinc-500">
                        他 {projectResults.length - MAX_DISPLAY_PER_TYPE} 件
                      </div>
                    )}
                    {projectResults.length >= 20 && (
                      <Link
                        href={`/projects?q=${encodeURIComponent(searchQuery.trim())}`}
                        onClick={() => {
                          setSearchQuery("");
                          setIsOpen(false);
                        }}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-t border-zinc-100 dark:border-zinc-800"
                      >
                        案件一覧で全件表示
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </>
                )}
                {todoResults.length > 0 && (
                  <>
                    <div className="px-4 py-1.5 text-xs font-medium text-zinc-500 flex items-center gap-1.5 mt-1 border-t border-zinc-100 dark:border-zinc-800">
                      <CheckSquare className="h-3.5 w-3.5" />
                      TODO
                    </div>
                    <ul>
                      {todoResults.slice(0, MAX_DISPLAY_PER_TYPE).map((r) => (
                        <li key={`t-${r.id}`}>
                          <Link
                            href={r.href}
                            onClick={() => {
                              setSearchQuery("");
                              setIsOpen(false);
                            }}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                          >
                            <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                              {r.title}
                            </span>
                            <span className="text-sm text-zinc-500 truncate flex-1 min-w-0">
                              {r.subtitle ?? ""}
                            </span>
                            <ArrowRight className="h-4 w-4 text-zinc-400 shrink-0" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {meetingResults.length > 0 && (
                  <>
                    <div className="px-4 py-1.5 text-xs font-medium text-zinc-500 flex items-center gap-1.5 mt-1 border-t border-zinc-100 dark:border-zinc-800">
                      <MessageSquare className="h-3.5 w-3.5" />
                      会議
                    </div>
                    <ul>
                      {meetingResults.slice(0, MAX_DISPLAY_PER_TYPE).map((r) => (
                        <li key={`m-${r.id}`}>
                          <Link
                            href={r.href}
                            onClick={() => {
                              setSearchQuery("");
                              setIsOpen(false);
                            }}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                          >
                            <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                              {r.title}
                            </span>
                            <span className="text-sm text-zinc-500 truncate flex-1 min-w-0">
                              {r.subtitle ?? ""}
                            </span>
                            <ArrowRight className="h-4 w-4 text-zinc-400 shrink-0" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {meetingResults.length > MAX_DISPLAY_PER_TYPE && (
                      <div className="px-4 py-1 text-xs text-zinc-500">
                        他 {meetingResults.length - MAX_DISPLAY_PER_TYPE} 件
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
