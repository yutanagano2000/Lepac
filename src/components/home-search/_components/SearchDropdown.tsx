"use client";

import {
  ArrowRight,
  Sparkles,
  FolderKanban,
  CheckSquare,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchResult, CategorizedResults } from "../_types";

interface SearchDropdownProps {
  results: SearchResult[];
  categorizedResults: CategorizedResults;
  isSearching: boolean;
  query: string;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  onResultClick: (href: string) => void;
  isFocused: boolean;
}

export function SearchDropdown({
  results,
  categorizedResults,
  isSearching,
  query,
  selectedIndex,
  onSelectedIndexChange,
  onResultClick,
  isFocused,
}: SearchDropdownProps) {
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
        <div
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider",
            colorClass
          )}
        >
          {icon}
          {title}
          <span className="ml-auto text-muted-foreground font-normal">
            {items.length}件
          </span>
        </div>
        <div className="space-y-0.5">
          {items.map((result, index) => {
            const globalIndex = startIndex + index;
            return (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => onResultClick(result.href)}
                onMouseEnter={() => onSelectedIndexChange(globalIndex)}
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
    <div
      className={cn(
        "absolute left-0 right-0 top-full z-50 bg-card border border-t-0 rounded-b-2xl shadow-lg overflow-hidden",
        isFocused && "ring-2 ring-ring ring-t-0 border-transparent"
      )}
    >
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
              <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">
                ↑↓
              </kbd>
              移動
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">
                Enter
              </kbd>
              選択
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">
                Esc
              </kbd>
              閉じる
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
