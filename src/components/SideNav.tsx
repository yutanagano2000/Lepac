"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderKanban, Wrench, LogOut, Calendar, GitBranch, ListTodo, MessageSquarePlus, HardHat, X, Mountain, Workflow, Wallet, ClipboardList, Users, LucideIcon } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useMobileMenu } from "@/components/MobileMenuContext";

// メニューアイテムの型定義
type MenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const baseItems: MenuItem[] = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/projects", label: "案件", icon: FolderKanban },
  { href: "/construction", label: "工事", icon: HardHat },
  { href: "/survey", label: "現地調査", icon: Mountain },
  { href: "/todo", label: "TODO", icon: ListTodo },
  { href: "/todos", label: "タイムライン", icon: GitBranch },
  { href: "/calendar", label: "カレンダー", icon: Calendar },
  { href: "/workflows", label: "ワークフロー", icon: Workflow },
  { href: "/workflows/my-tasks", label: "マイタスク", icon: ClipboardList },
  { href: "/workflows/members", label: "メンバー状況", icon: Users },
  { href: "/tools", label: "ツール", icon: Wrench },
  { href: "/feedbacks", label: "要望", icon: MessageSquarePlus },
];

// ファイナンスメニュー（権限必要）
const financeItem: MenuItem = { href: "/finance", label: "ファイナンス", icon: Wallet };

function SideNavContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  // 権限に基づいてメニューを構築
  const items = useMemo(() => {
    const menuItems = [...baseItems];
    // canViewFinance 権限があればファイナンスメニューを追加
    if (session?.user?.permissions?.canViewFinance) {
      // 「要望」の前に挿入（インデックス9）
      menuItems.splice(9, 0, financeItem);
    }
    return menuItems;
  }, [session?.user?.permissions?.canViewFinance]);

  return (
    <div className="flex h-full flex-col p-4">
      {/* ロゴ */}
      <div className="mb-4 rounded-xl px-3 py-2">
        <span className="text-lg font-semibold tracking-tight">ALAN</span>
      </div>

      <nav className="space-y-1">
        {items.map((item) => {
          const active = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors hover:bg-sidebar-accent",
                active && "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-sidebar-border pt-4 space-y-2">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-muted-foreground">テーマ</span>
          <ThemeToggle />
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors hover:bg-sidebar-accent text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-5 w-5" />
          <span>ログアウト</span>
        </button>
      </div>
    </div>
  );
}

export function SideNav() {
  const pathname = usePathname();
  const { isOpen, close } = useMobileMenu();

  if (pathname === "/login" || pathname === "/onboarding/select-organization") return null;

  return (
    <>
      {/* デスクトップサイドバー */}
      <aside className="sticky top-0 h-screen w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground hidden md:block">
        <SideNavContent />
      </aside>

      {/* モバイルオーバーレイ */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={close}
        />
      )}

      {/* モバイルサイドバー */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transform transition-transform duration-300 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* 閉じるボタン - 44x44pxタッチターゲット */}
        <button
          onClick={close}
          className="absolute top-3 right-3 flex items-center justify-center h-11 w-11 rounded-lg hover:bg-sidebar-accent transition-colors"
          aria-label="メニューを閉じる"
        >
          <X className="h-5 w-5" />
        </button>
        <SideNavContent onLinkClick={close} />
      </aside>
    </>
  );
}
