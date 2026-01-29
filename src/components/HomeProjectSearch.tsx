"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";

type ProjectForSearch = {
  id: number;
  managementNumber: string;
  projectNumber: string | null;
  address: string | null;
  landowner1: string | null;
  landowner2: string | null;
  landowner3: string | null;
  commentSearchText?: string;
};

export function HomeProjectSearch() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectForSearch[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/projects", { cache: "no-store" })
      .then((res) => res.json())
      .then(setProjects)
      .catch((err) => console.error("案件一覧の取得に失敗しました:", err));
  }, []);

  const query = searchQuery.trim().toLowerCase();
  const filteredProjects = query
    ? projects.filter((project) => {
        const addr = (project.address ?? "").toLowerCase();
        const l1 = (project.landowner1 ?? "").toLowerCase();
        const l2 = (project.landowner2 ?? "").toLowerCase();
        const l3 = (project.landowner3 ?? "").toLowerCase();
        const commentText = (project.commentSearchText ?? "").toLowerCase();
        return (
          project.managementNumber.toLowerCase().includes(query) ||
          (project.projectNumber ?? "").toLowerCase().includes(query) ||
          addr.includes(query) ||
          l1.includes(query) ||
          l2.includes(query) ||
          l3.includes(query) ||
          commentText.includes(query)
        );
      })
    : [];

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
    if (e.key !== "Enter" || filteredProjects.length === 0) return;
    e.preventDefault();
    if (filteredProjects.length === 1) {
      router.push(`/projects/${filteredProjects[0].id}`);
      setSearchQuery("");
      setIsOpen(false);
    }
  };

  const maxResults = 10;
  const showDropdown = isOpen && searchQuery.trim() !== "";

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
        <Input
          type="search"
          placeholder="管理番号・案件番号・地権者・現地住所・コメントで検索"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => query && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full pl-12 h-12 text-base bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus-visible:ring-2 rounded-xl"
        />
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden">
          {filteredProjects.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-zinc-500">
              該当する案件がありません
            </div>
          ) : (
            <ul className="max-h-[280px] overflow-y-auto py-2">
              {filteredProjects.slice(0, maxResults).map((project) => (
                <li key={project.id}>
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
          )}
          {filteredProjects.length > maxResults && (
            <div className="px-4 py-2 text-xs text-zinc-500 border-t border-zinc-100 dark:border-zinc-800">
              他 {filteredProjects.length - maxResults} 件
            </div>
          )}
        </div>
      )}
    </div>
  );
}
