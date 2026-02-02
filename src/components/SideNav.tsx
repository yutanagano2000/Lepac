"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, Home, FolderKanban, Scale, Wrench, LogOut, CheckSquare, ExternalLink, Calendar, CalendarDays, MessageSquare, MapPin, GitBranch } from "lucide-react";
import { signOut } from "next-auth/react";

import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

const items = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/projects", label: "案件", icon: FolderKanban },
  { href: "/todos", label: "タイムライン", icon: GitBranch },
  { href: "/meetings", label: "会議", icon: MessageSquare },
  { href: "/map", label: "マップ", icon: MapPin },
  { href: "/schedule", label: "スケジュール", icon: CalendarDays },
  { href: "/legal", label: "法令確認", icon: Scale },
  { href: "/tools", label: "ツール", icon: Wrench },
] as const;

export function SideNav() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <aside className="sticky top-0 h-screen w-72 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-full flex-col p-4">
        {/* ロゴ：遷移なし（クリック不可） */}
        <div className="mb-4 flex items-center gap-2 rounded-xl px-3 py-2">
          <Globe className="h-5 w-5" />
          <span className="text-lg font-semibold tracking-tight">ALAN</span>
        </div>

        <nav className="space-y-1">
          {items.map((item) => {
            // ツールの場合は、/tools で始まるパスでもアクティブにする
            const active = item.href === "/tools"
              ? pathname.startsWith("/tools")
              : item.href === "/meetings"
                ? pathname.startsWith("/meetings")
                : item.href === "/todos"
                  ? pathname.startsWith("/todos")
                  : item.href === "/map"
                    ? pathname.startsWith("/map")
                    : pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent",
                  active && "bg-sidebar-accent text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          {/* 外部リンク: Notion ミーティング */}
          <a
            href="https://www.notion.so/Meeting-2f0f2fd6b7ad80de99b7f18d709b1bfa"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent"
          >
            <CheckSquare className="h-4 w-4" />
            <span>ミーティング</span>
            <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
          </a>
          {/* 外部リンク: Notion Calendar */}
          <a
            href="https://calendar.notion.so/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent"
          >
            <Calendar className="h-4 w-4" />
            <span>カレンダー</span>
            <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
          </a>
        </nav>

        <div className="mt-auto border-t border-sidebar-border pt-4 space-y-2">
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-sm text-muted-foreground">テーマ</span>
            <ThemeToggle />
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span>ログアウト</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
