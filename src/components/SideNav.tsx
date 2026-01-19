"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, Home, FolderKanban, Scale, Wrench, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/projects", label: "案件", icon: FolderKanban },
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
        </nav>

        <div className="mt-auto border-t border-sidebar-border pt-4">
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
