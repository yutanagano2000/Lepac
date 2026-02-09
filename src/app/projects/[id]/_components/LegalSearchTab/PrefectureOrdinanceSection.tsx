"use client";

import { Button } from "@/components/ui/button";

interface PrefectureOrdinanceSectionProps {
  hasSearched: boolean;
  prefecture: string;
  projectAddress: string | null;
}

export function PrefectureOrdinanceSection({
  hasSearched,
  prefecture,
  projectAddress,
}: PrefectureOrdinanceSectionProps) {
  if (!hasSearched) return null;

  const prefectureName = prefecture === "hiroshima" ? "広島県" : prefecture === "okayama" ? "岡山県" : "";

  return (
    <>
      {/* ○○県の太陽光に関する条例 */}
      {prefecture && (
        <div className="bg-card rounded-4xl border border-border shadow-lg p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            {prefectureName}の太陽光に関する条例
          </h2>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium text-foreground">
                {prefectureName}の太陽光発電に関する条例を検索
              </p>
            </div>
            <Button
              onClick={() => {
                const query = encodeURIComponent(`${prefectureName}　太陽光　条例`);
                window.open(`https://www.google.com/search?q=${query}`, "_blank");
              }}
              className="shrink-0 ml-4"
            >
              Googleで検索
            </Button>
          </div>
        </div>
      )}

      {/* 都道府県条例カード（岡山県） */}
      {prefecture === "okayama" && (
        <div className="bg-card rounded-4xl border border-border shadow-lg p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-xl font-semibold text-foreground mb-4">都道府県条例</h2>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium text-foreground">岡山県太陽光発電施設の安全な導入を促進する条例</p>
            </div>
            <Button
              onClick={() => window.open("https://www.pref.okayama.jp/page/619095.html", "_blank")}
              className="shrink-0 ml-4"
            >
              詳細を確認
            </Button>
          </div>
        </div>
      )}

      {/* 市区町村条例カード（井原市） */}
      {projectAddress?.includes("井原市") && (
        <div className="bg-card rounded-4xl border border-border shadow-lg p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-xl font-semibold text-foreground mb-4">市区町村条例</h2>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium text-foreground">井原市開発事業の調整に関する条例</p>
            </div>
            <Button
              onClick={() => window.open("https://www.city.ibara.okayama.jp/soshiki/3/1214.html", "_blank")}
              className="shrink-0 ml-4"
            >
              詳細を確認
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
