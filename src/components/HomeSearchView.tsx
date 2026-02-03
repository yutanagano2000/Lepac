"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Sparkles, FolderKanban, CheckSquare, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface SearchResult {
  type: "project" | "todo" | "meeting";
  id: number;
  title: string;
  subtitle?: string;
  href: string;
}

// デバウンス用のカスタムフック
function useDebounce<T>(value: T, delay: number): T {
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

export function HomeSearchView() {
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
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery.trim())}`);
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
  const categorizedResults = useMemo(() => {
    const projects = results.filter(r => r.type === "project");
    const todos = results.filter(r => r.type === "todo");
    const meetings = results.filter(r => r.type === "meeting");
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
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
  };

  const handleResultClick = (href: string) => {
    router.push(href);
  };

  // 選択インデックスをリセット
  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  const showSuggestions = isFocused && query.trim().length > 0;

  // カテゴリのレンダリング用ヘルパー
  const renderCategory = (
    title: string,
    icon: React.ReactNode,
    items: SearchResult[],
    colorClass: string,
    startIndex: number
  ) => {
    if (items.length === 0) return null;

    return (
      <div className="py-2">
        <div className={cn("flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider", colorClass)}>
          {icon}
          {title}
          <span className="ml-auto text-muted-foreground font-normal">{items.length}件</span>
        </div>
        <div className="space-y-0.5">
          {items.map((result, index) => {
            const globalIndex = startIndex + index;
            return (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleResultClick(result.href)}
                onMouseEnter={() => setSelectedIndex(globalIndex)}
                className={cn(
                  "w-full text-left px-4 py-2.5 transition-colors",
                  "hover:bg-muted/70",
                  selectedIndex === globalIndex && "bg-muted"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate text-sm">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">
                        {result.subtitle}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 pt-[20vh]">
      <div className="w-full max-w-2xl space-y-6">
        {/* ブランド名 */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            ALAN
          </h1>
          <p className="text-muted-foreground text-sm">
            案件・TODO・あらゆる情報を検索
          </p>
        </div>

        {/* 検索フォーム */}
        <div className="relative">
          <div className={cn(
            "relative flex items-end border bg-card shadow-sm transition-all",
            showSuggestions && results.length > 0
              ? "rounded-t-2xl border-b-0"
              : "rounded-2xl",
            isFocused && "ring-2 ring-ring border-transparent"
          )}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Textarea
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 150)}
              placeholder="管理番号、地権者名、現地住所、TODOなどを検索..."
              className="min-h-[56px] max-h-[56px] resize-none border-0 bg-transparent pl-12 pr-14 py-4 focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-muted-foreground/60"
              rows={1}
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {/* サジェストドロップダウン */}
          {showSuggestions && (
            <div className={cn(
              "absolute left-0 right-0 top-full z-50 bg-card border border-t-0 rounded-b-2xl shadow-lg overflow-hidden",
              isFocused && "ring-2 ring-ring ring-t-0 border-transparent"
            )}>
              {results.length === 0 ? (
                <div className="px-4 py-6 text-center text-muted-foreground text-sm">
                  {isSearching ? (
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="h-4 w-4 animate-pulse" />
                      検索中...
                    </div>
                  ) : (
                    <>「{query}」に一致する結果がありません</>
                  )}
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto divide-y divide-border">
                  {renderCategory(
                    "案件",
                    <FolderKanban className="h-3.5 w-3.5" />,
                    categorizedResults.projects,
                    "text-blue-600 dark:text-blue-400",
                    0
                  )}
                  {renderCategory(
                    "TODO",
                    <CheckSquare className="h-3.5 w-3.5" />,
                    categorizedResults.todos,
                    "text-green-600 dark:text-green-400",
                    categorizedResults.projects.length
                  )}
                  {renderCategory(
                    "会議",
                    <MessageSquare className="h-3.5 w-3.5" />,
                    categorizedResults.meetings,
                    "text-purple-600 dark:text-purple-400",
                    categorizedResults.projects.length + categorizedResults.todos.length
                  )}
                </div>
              )}

              {/* フッター */}
              {results.length > 0 && (
                <div className="px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
                  <span>{results.length}件の結果</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">↑↓</kbd>
                      移動
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd>
                      選択
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Esc</kbd>
                      閉じる
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ヒント（サジェストが表示されていない時のみ） */}
          {!showSuggestions && (
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
              <span>入力すると候補が表示されます</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
