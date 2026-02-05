"use client";

import { usePathname } from "next/navigation";
import { HomeProjectSearch } from "@/components/HomeProjectSearch";

interface MainContentWrapperProps {
  children: React.ReactNode;
}

export function MainContentWrapper({ children }: MainContentWrapperProps) {
  const pathname = usePathname();

  // 検索バーを表示しないページ
  const hideSearchBar =
    pathname === "/" || // ホーム画面は独自の検索バーを使用
    pathname === "/login" ||
    pathname === "/onboarding/select-organization" ||
    pathname?.startsWith("/projects/");

  return (
    <div className="flex flex-col h-full">
      {/* グローバル検索バー - 固定表示・中央揃え */}
      {!hideSearchBar && (
        <div className="sticky top-14 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="px-6 py-4">
            <div className="max-w-2xl mx-auto">
              <HomeProjectSearch size="large" />
            </div>
          </div>
        </div>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}
