"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderKanban, Wrench, LogOut, Calendar, GitBranch, ListTodo, MessageSquarePlus, HardHat } from "lucide-react";
import { signOut } from "next-auth/react";

import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

const items = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/projects", label: "案件", icon: FolderKanban },
  { href: "/construction", label: "工事", icon: HardHat },
  { href: "/todo", label: "TODO", icon: ListTodo },
  { href: "/todos", label: "タイムライン", icon: GitBranch },
  { href: "/calendar", label: "カレンダー", icon: Calendar },
  { href: "/tools", label: "ツール", icon: Wrench },
  { href: "/feedbacks", label: "要望", icon: MessageSquarePlus },
] as const;

export function SideNav() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <aside className="sticky top-0 h-screen w-72 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-full flex-col p-4">
        {/* ロゴ */}
        <div className="mb-4 rounded-xl px-3 py-2">
          <span className="text-lg font-semibold tracking-tight">ALAN</span>
        </div>

        <nav className="space-y-1">
          {items.map((item) => {
            // サブパスでもアクティブにする
            const active = item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
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
