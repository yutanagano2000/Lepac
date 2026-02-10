"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  ArrowRight,
  Sparkles,
  FolderKanban,
  CheckSquare,
  MessageSquare,
  Loader2,
  AlertTriangle,
  Activity,
  Construction,
  MapPin,
  AlertCircle,
  CalendarClock,
  Clock,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SearchResult, DashboardData } from "@/components/home-search/types";
import { useDebounce } from "@/components/home-search/useDebounce";
import { useSearchQuery } from "@/components/home-search/useSearchQuery";
import { HighlightText } from "@/components/home-search/HighlightText";

const SEARCH_HISTORY_KEY = "home_search_recent";
const MAX_HISTORY = 3;

function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr)
      ? arr.filter((x): x is string => typeof x === "string").slice(0, MAX_HISTORY)
      : [];
  } catch {
    return [];
  }
}

function addSearchHistory(query: string): string[] {
  const q = query.trim();
  if (!q) return getSearchHistory();
  const prev = getSearchHistory();
  const next = [q, ...prev.filter((x) => x !== q)].slice(0, MAX_HISTORY);
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function HomeSearchView() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // ダッシュボード用state
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // 適応型デバウンス（delay省略→文字数ベースで自動調整）
  const debouncedQuery = useDebounce(query);

  // SWRベース検索（キャッシュ + 重複排除 + keepPreviousData）
  const { results, isSearching, searchError } = useSearchQuery(debouncedQuery);

  // 検索履歴を初期ロード
  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  // 検索実行時に履歴保存
  useEffect(() => {
    if (debouncedQuery.trim()) {
      setSearchHistory(addSearchHistory(debouncedQuery));
    }
  }, [debouncedQuery]);

  // Ctrl+K / Cmd+K グローバルショートカット
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ダッシュボードデータ取得
  useEffect(() => {
    const abortController = new AbortController();

    const fetchDashboard = async () => {
      setDashboardError(null);
      try {
        const res = await fetch("/api/dashboard", {
          signal: abortController.signal,
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data: unknown = await res.json();
        if (data && typeof data === "object" && "overdueTodos" in data) {
          setDashboard(data as DashboardData);
        } else {
          throw new Error("不正なレスポンス形式");
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        console.error("ダッシュボード取得エラー:", err);
        setDashboardError("ダッシュボードの取得に失敗しました");
      } finally {
        setIsDashboardLoading(false);
      }
    };
    fetchDashboard();

    return () => {
      abortController.abort();
    };
  }, []);

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

  const handleHistoryClick = (text: string) => {
    setQuery(text);
  };

  // 選択インデックスをリセット
  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  const showSuggestions = isFocused && query.trim().length > 0;
  const showHistory = isFocused && query.trim().length === 0 && searchHistory.length > 0;

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
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleResultClick(result.href);
                }}
                onMouseEnter={() => setSelectedIndex(globalIndex)}
                className={cn(
                  "w-full text-left px-4 py-2.5 transition-colors",
                  "hover:bg-muted/70",
                  selectedIndex === globalIndex && "bg-muted"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate text-sm">
                      <HighlightText text={result.title} query={query.trim()} />
                    </p>
                    {result.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">
                        <HighlightText text={result.subtitle} query={query.trim()} />
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
    <div className="min-h-screen flex flex-col items-center px-4 pt-[10vh]">
      <div className="w-full max-w-3xl space-y-6">
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
            (showSuggestions && results.length > 0) || showHistory
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
              className="min-h-[56px] max-h-[56px] resize-none border-0 bg-transparent pl-12 pr-20 py-4 focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-muted-foreground/60"
              rows={1}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {isSearching && (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              )}
              {!isSearching && (
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground border">
                  {typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent) ? "⌘" : "Ctrl"}K
                </kbd>
              )}
            </div>
          </div>

          {/* 検索履歴ドロップダウン（未入力＋フォーカス時） */}
          {showHistory && (
            <div className={cn(
              "absolute left-0 right-0 top-full z-50 bg-card border border-t-0 rounded-b-2xl shadow-lg overflow-hidden",
              isFocused && "ring-2 ring-ring ring-t-0 border-transparent"
            )}>
              <div className="px-4 py-2 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                最近の検索
              </div>
              <div className="space-y-0.5 pb-2">
                {searchHistory.map((text) => (
                  <button
                    key={text}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleHistoryClick(text);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-muted/70 transition-colors"
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* サジェストドロップダウン */}
          {showSuggestions && (
            <div className={cn(
              "absolute left-0 right-0 top-full z-50 bg-card border border-t-0 rounded-b-2xl shadow-lg overflow-hidden",
              isFocused && "ring-2 ring-ring ring-t-0 border-transparent"
            )}>
              {searchError ? (
                <div className="px-4 py-6 text-center text-red-600 dark:text-red-400 text-sm flex items-center justify-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {searchError}
                </div>
              ) : results.length === 0 ? (
                <div className="px-4 py-6 text-center text-muted-foreground text-sm">
                  {isSearching ? (
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="h-4 w-4 animate-pulse" />
                      検索中...
                    </div>
                  ) : (
                    <>「<HighlightText text={query} query={query.trim()} />」に一致する結果がありません</>
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
          {!showSuggestions && !showHistory && (
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
              <span>入力すると候補が表示されます</span>
            </div>
          )}
        </div>

        {/* ダッシュボード */}
        {!showSuggestions && !showHistory && (
          <div className="mt-8 w-full">
            {isDashboardLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : dashboardError ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2 text-red-500" />
                <p className="text-sm">{dashboardError}</p>
              </div>
            ) : dashboard && (
              <div className="grid grid-cols-3 gap-4">
                {/* 期日超過TODO */}
                <Card className={cn(
                  "transition-all hover:shadow-md cursor-pointer h-[180px]",
                  dashboard.overdueTodos.count > 0 && "border-red-500/50 bg-red-500/5"
                )}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      <AlertTriangle className={cn(
                        "h-4 w-4",
                        dashboard.overdueTodos.count > 0 ? "text-red-500" : "text-muted-foreground"
                      )} />
                      期日超過TODO
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {dashboard.overdueTodos.count}
                    </div>
                    <div className="mt-2 space-y-1">
                      {dashboard.overdueTodos.items.slice(0, 2).map((todo) => (
                        <Link
                          key={todo.id}
                          href={`/projects/${todo.projectId}`}
                          className="block text-xs text-muted-foreground hover:text-foreground truncate"
                        >
                          <span className="font-medium">{todo.managementNumber}</span>: {todo.content}
                        </Link>
                      ))}
                      {dashboard.overdueTodos.count > 2 && (
                        <p className="text-xs text-muted-foreground">他{dashboard.overdueTodos.count - 2}件</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 今日期日のTODO */}
                <Card className={cn(
                  "transition-all hover:shadow-md cursor-pointer h-[180px]",
                  dashboard.todayTodos.count > 0 && "border-orange-500/50 bg-orange-500/5"
                )}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      <CalendarClock className={cn(
                        "h-4 w-4",
                        dashboard.todayTodos.count > 0 ? "text-orange-500" : "text-muted-foreground"
                      )} />
                      今日期日
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                      {dashboard.todayTodos.count}
                    </div>
                    <div className="mt-2 space-y-1">
                      {dashboard.todayTodos.items.slice(0, 2).map((todo) => (
                        <Link
                          key={todo.id}
                          href={`/projects/${todo.projectId}`}
                          className="block text-xs text-muted-foreground hover:text-foreground truncate"
                        >
                          <span className="font-medium">{todo.managementNumber}</span>: {todo.content}
                        </Link>
                      ))}
                      {dashboard.todayTodos.count > 2 && (
                        <p className="text-xs text-muted-foreground">他{dashboard.todayTodos.count - 2}件</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 完工アラート */}
                <Card className={cn(
                  "transition-all hover:shadow-md cursor-pointer h-[180px]",
                  dashboard.completionAlerts.redCount > 0 && "border-red-500/50 bg-red-500/5",
                  dashboard.completionAlerts.redCount === 0 && dashboard.completionAlerts.yellowCount > 0 && "border-yellow-500/50 bg-yellow-500/5"
                )}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      <Construction className={cn(
                        "h-4 w-4",
                        dashboard.completionAlerts.redCount > 0 ? "text-red-500" :
                        dashboard.completionAlerts.yellowCount > 0 ? "text-yellow-500" : "text-muted-foreground"
                      )} />
                      完工アラート
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      {dashboard.completionAlerts.redCount > 0 && (
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {dashboard.completionAlerts.redCount}
                          <span className="text-xs font-normal ml-1">件</span>
                        </div>
                      )}
                      {dashboard.completionAlerts.yellowCount > 0 && (
                        <div className={cn(
                          "font-bold",
                          dashboard.completionAlerts.redCount > 0 ? "text-lg text-yellow-600 dark:text-yellow-400" : "text-2xl text-yellow-600 dark:text-yellow-400"
                        )}>
                          {dashboard.completionAlerts.yellowCount}
                          <span className="text-xs font-normal ml-1">件</span>
                        </div>
                      )}
                      {dashboard.completionAlerts.redCount === 0 && dashboard.completionAlerts.yellowCount === 0 && (
                        <div className="text-2xl font-bold text-muted-foreground">0</div>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      2ヶ月以内:赤 / 3ヶ月以内:黄
                    </p>
                    <div className="mt-2 space-y-1">
                      {dashboard.completionAlerts.items.slice(0, 2).map((alert) => (
                        <Link
                          key={alert.id}
                          href={`/projects/${alert.id}`}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            alert.level === "red" ? "bg-red-500" : "bg-yellow-500"
                          )} />
                          <span className="font-medium truncate">{alert.managementNumber}</span>
                          <span className="text-[10px]">({alert.completionMonth})</span>
                        </Link>
                      ))}
                      {(dashboard.completionAlerts.redCount + dashboard.completionAlerts.yellowCount) > 2 && (
                        <p className="text-xs text-muted-foreground">
                          他{dashboard.completionAlerts.redCount + dashboard.completionAlerts.yellowCount - 2}件
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 案件アラート */}
                <Link href="/todos">
                  <Card className={cn(
                    "transition-all hover:shadow-md cursor-pointer h-[180px]",
                    dashboard.projectAlerts.count > 0 && "border-red-500/50 bg-red-500/5"
                  )}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <AlertTriangle className={cn(
                          "h-4 w-4",
                          dashboard.projectAlerts.count > 0 ? "text-red-500" : "text-muted-foreground"
                        )} />
                        案件アラート
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                        {dashboard.projectAlerts.totalAlerts}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dashboard.projectAlerts.count}件の案件
                      </p>
                      <div className="mt-2 space-y-1">
                        {dashboard.projectAlerts.items.slice(0, 2).map((project) => (
                          <div key={project.id} className="text-xs text-muted-foreground truncate">
                            <span className="font-medium">{project.managementNumber}</span>
                            <Badge variant="destructive" className="ml-1 text-[10px] px-1 py-0">
                              {project.alertCount}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* 進行中案件 */}
                <Link href="/projects">
                  <Card className="transition-all hover:shadow-md cursor-pointer h-[180px]">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <Activity className="h-4 w-4 text-green-500" />
                        進行中案件
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {dashboard.activeProjects.count}
                      </div>
                      <div className="mt-2 space-y-1">
                        {dashboard.activeProjects.items.slice(0, 2).map((project) => (
                          <div key={project.id} className="text-xs text-muted-foreground truncate">
                            <span className="font-medium">{project.managementNumber}</span>
                            {project.client && <span className="ml-1">({project.client})</span>}
                          </div>
                        ))}
                        {dashboard.activeProjects.count > 2 && (
                          <p className="text-xs text-muted-foreground">他{dashboard.activeProjects.count - 2}件</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* 現調未実施アラート */}
                <Card className={cn(
                  "transition-all hover:shadow-md h-[180px]",
                  dashboard.siteInvestigationAlerts.redCount > 0 && "border-red-500/50 bg-red-500/5",
                  dashboard.siteInvestigationAlerts.redCount === 0 && dashboard.siteInvestigationAlerts.yellowCount > 0 && "border-yellow-500/50 bg-yellow-500/5"
                )}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      <MapPin className={cn(
                        "h-4 w-4",
                        dashboard.siteInvestigationAlerts.redCount > 0 ? "text-red-500" :
                        dashboard.siteInvestigationAlerts.yellowCount > 0 ? "text-yellow-500" : "text-muted-foreground"
                      )} />
                      現調未実施
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      {dashboard.siteInvestigationAlerts.redCount > 0 && (
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {dashboard.siteInvestigationAlerts.redCount}
                          <span className="text-xs font-normal ml-1">件</span>
                        </div>
                      )}
                      {dashboard.siteInvestigationAlerts.yellowCount > 0 && (
                        <div className={cn(
                          "font-bold",
                          dashboard.siteInvestigationAlerts.redCount > 0 ? "text-lg text-yellow-600 dark:text-yellow-400" : "text-2xl text-yellow-600 dark:text-yellow-400"
                        )}>
                          {dashboard.siteInvestigationAlerts.yellowCount}
                          <span className="text-xs font-normal ml-1">件</span>
                        </div>
                      )}
                      {dashboard.siteInvestigationAlerts.redCount === 0 && dashboard.siteInvestigationAlerts.yellowCount === 0 && (
                        <div className="text-2xl font-bold text-muted-foreground">0</div>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      完工間近で現調未実施
                    </p>
                    <div className="mt-2 space-y-1">
                      {dashboard.siteInvestigationAlerts.items.slice(0, 2).map((alert) => (
                        <Link
                          key={alert.id}
                          href={`/projects/${alert.id}`}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            alert.level === "red" ? "bg-red-500" : "bg-yellow-500"
                          )} />
                          <span className="font-medium truncate">{alert.managementNumber}</span>
                          <span className="text-[10px]">({alert.completionMonth})</span>
                        </Link>
                      ))}
                      {(dashboard.siteInvestigationAlerts.redCount + dashboard.siteInvestigationAlerts.yellowCount) > 2 && (
                        <p className="text-xs text-muted-foreground">
                          他{dashboard.siteInvestigationAlerts.redCount + dashboard.siteInvestigationAlerts.yellowCount - 2}件
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
