"use client";

import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "next-auth/react";
import { LogOut, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMobileMenu } from "@/components/MobileMenuContext";

export function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { toggle } = useMobileMenu();

  // ログインページと組織選択ページでは非表示
  if (pathname === "/login" || pathname === "/onboarding/select-organization") return null;

  const user = session?.user;
  const userName = user?.name || user?.username || "ユーザー";
  const userImage = user?.image;
  const initials = userName.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6">
      {/* ハンバーガーメニュー（モバイルのみ） - 44x44pxタッチターゲット */}
      <button
        onClick={toggle}
        className="flex items-center justify-center h-11 w-11 -ml-2 rounded-lg hover:bg-muted transition-colors md:hidden"
        aria-label="メニューを開く"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* デスクトップ用スペーサー */}
      <div className="hidden md:block" />

      {/* ユーザーメニュー */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 rounded-full p-1 hover:bg-muted transition-colors"
            suppressHydrationWarning
          >
            <Avatar className="h-8 w-8">
              {userImage && <AvatarImage src={userImage} alt={userName} />}
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium hidden sm:inline-block max-w-[150px] truncate">
              {userName}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{userName}</p>
              {user?.email && (
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            ログアウト
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
