"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ArrowRight, FolderKanban, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";

const PROJECT_SEARCH_RECENT_KEY = "geo_checker_recent_project_searches";
const MAX_RECENT_SEARCHES = 3;

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

type ProjectForSearch = {
  id: number;
  managementNumber: string;
  projectNumber: string | null;
  address: string | null;
  landowner1: string | null;
  landowner2: string | null;
  landowner3: string | null;
  commentSearchText?: string;
  todoSearchText?: string;
};

type MeetingForSearch = {
  id: number;
  title: string | null;
  meetingDate: string | null;
  category: string | null;
  content: string | null;
  agenda: string | null;
};

export function HomeProjectSearch() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectForSearch[]>([]);
  const [meetings, setMeetings] = useState<MeetingForSearch[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
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
  };

  useEffect(() => {
    fetch("/api/projects", { cache: "no-store" })
      .then((res) => res.json())
      .then(setProjects)
      .catch((err) => console.error("案件一覧の取得に失敗しました:", err));
    fetch("/api/meetings", { cache: "no-store" })
      .then((res) => res.json())
      .then(setMeetings)
      .catch((err) => console.error("会議一覧の取得に失敗しました:", err));
  }, []);

  const query = searchQuery.trim().toLowerCase();
  const filteredProjects = query
    ? projects.filter((project) => {
        const addr = (project.address ?? "").toLowerCase();
        const l1 = (project.landowner1 ?? "").toLowerCase();
        const l2 = (project.landowner2 ?? "").toLowerCase();
        const l3 = (project.landowner3 ?? "").toLowerCase();
        const commentText = (project.commentSearchText ?? "").toLowerCase();
        const todoText = (project.todoSearchText ?? "").toLowerCase();
        return (
          project.managementNumber.toLowerCase().includes(query) ||
          (project.projectNumber ?? "").toLowerCase().includes(query) ||
          addr.includes(query) ||
          l1.includes(query) ||
          l2.includes(query) ||
          l3.includes(query) ||
          commentText.includes(query) ||
          todoText.includes(query)
        );
      })
    : [];

  const filteredMeetings = query
    ? meetings.filter((meeting) => {
        const title = (meeting.title ?? "").toLowerCase();
        const content = (meeting.content ?? "").toLowerCase();
        const agenda = (meeting.agenda ?? "").toLowerCase();
        const category = (meeting.category ?? "").toLowerCase();
        return (
          title.includes(query) ||
          content.includes(query) ||
          agenda.includes(query) ||
          category.includes(query)
        );
      })
    : [];

  const hasResults = filteredProjects.length > 0 || filteredMeetings.length > 0;
  const totalCount = filteredProjects.length + filteredMeetings.length;

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
      if (filteredProjects.length === 1) {
        router.push(`/projects/${filteredProjects[0].id}`);
      } else {
        router.push(`/meetings/${filteredMeetings[0].id}`);
      }
      setSearchQuery("");
      setIsOpen(false);
    }
  };

  const maxProjects = 8;
  const maxMeetings = 8;
  const showResultsDropdown = isOpen && searchQuery.trim() !== "";
  const showRecentSuggestions = isOpen && showSuggestions && recentSearches.length > 0 && !searchQuery.trim();

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 z-10 pointer-events-none" />
        <Input
          type="search"
          placeholder="管理番号・案件番号・地権者・現地住所・コメント・TODO・会議で検索"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
          onKeyDown={(e) => {
            handleSearchKeyDown(e);
            handleKeyDown(e);
          }}
          className="w-full pl-12 h-12 text-base bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus-visible:ring-2 rounded-xl"
        />
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
          {!hasResults ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                「{searchQuery.trim()}」に該当する案件・議事録はありません
              </p>
              <p className="text-xs text-zinc-500">
                別のキーワードで検索してみてください
              </p>
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto">
              <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  「{searchQuery.trim()}」で{" "}
                  {[
                    filteredProjects.length > 0 && `案件 ${filteredProjects.length} 件`,
                    filteredMeetings.length > 0 && `議事録 ${filteredMeetings.length} 件`,
                  ]
                    .filter(Boolean)
                    .join("、")}{" "}
                  が見つかりました
                </p>
              </div>
              <div className="py-2">
              {filteredProjects.length > 0 && (
                <>
                  <div className="px-4 py-1.5 text-xs font-medium text-zinc-500 flex items-center gap-1.5">
                    <FolderKanban className="h-3.5 w-3.5" />
                    案件
                  </div>
                  <ul>
                    {filteredProjects.slice(0, maxProjects).map((project) => (
                      <li key={`p-${project.id}`}>
                        <Link
                          href={`/projects/${project.id}`}
                          onClick={() => {
                            setSearchQuery("");
                            setIsOpen(false);
                          }}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {project.managementNumber}
                          </span>
                          <span className="text-sm text-zinc-500 truncate flex-1 min-w-0">
                            {project.projectNumber ?? ""}
                          </span>
                          <ArrowRight className="h-4 w-4 text-zinc-400 shrink-0" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {filteredProjects.length > maxProjects && (
                    <div className="px-4 py-1 text-xs text-zinc-500">
                      他 {filteredProjects.length - maxProjects} 件
                    </div>
                  )}
                </>
              )}
              {filteredMeetings.length > 0 && (
                <>
                  <div className="px-4 py-1.5 text-xs font-medium text-zinc-500 flex items-center gap-1.5 mt-1 border-t border-zinc-100 dark:border-zinc-800">
                    <MessageSquare className="h-3.5 w-3.5" />
                    会議
                  </div>
                  <ul>
                    {filteredMeetings.slice(0, maxMeetings).map((meeting) => (
                      <li key={`m-${meeting.id}`}>
                        <Link
                          href={`/meetings/${meeting.id}`}
                          onClick={() => {
                            setSearchQuery("");
                            setIsOpen(false);
                          }}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {meeting.title ?? "（無題）"}
                          </span>
                          <span className="text-sm text-zinc-500 truncate flex-1 min-w-0">
                            {meeting.meetingDate ?? ""}
                          </span>
                          <ArrowRight className="h-4 w-4 text-zinc-400 shrink-0" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {filteredMeetings.length > maxMeetings && (
                    <div className="px-4 py-1 text-xs text-zinc-500">
                      他 {filteredMeetings.length - maxMeetings} 件
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
