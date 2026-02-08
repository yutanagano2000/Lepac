"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { parsePrefectureAndCity } from "@/lib/address";

// ローカルモジュール
import { useLegalSearch, useLegalStatuses } from "./hooks";
import { SearchForm } from "./SearchForm";
import { ProjectInfoDisplay } from "./ProjectInfoDisplay";
import { JudgmentResultSection } from "./JudgmentResultSection";
import { SaveStatusButton } from "./SaveStatusButton";
import { LawCardList } from "./LawCardList";
import { LAWS, CONTACT_DEPT_LAW_IDS } from "../../_constants";
import type { LegalSearchTabProps } from "../../_types";

/**
 * 法令検索タブコンポーネント
 *
 * 座標・住所から法令チェックを行い、各法令のステータス管理を提供
 */
export function LegalSearchTab({
  searchParams,
  projectAddress,
  projectCoordinates,
  projectLandCategories,
  projectId,
  initialLegalStatuses,
  onLegalStatusesChange,
}: LegalSearchTabProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // 検索ロジック
  const search = useLegalSearch({
    searchParams,
    projectCoordinates,
  });

  // ステータス管理
  const statuses = useLegalStatuses({
    projectId,
    initialLegalStatuses: initialLegalStatuses
      ? typeof initialLegalStatuses === "string"
        ? initialLegalStatuses
        : JSON.stringify(initialLegalStatuses)
      : null,
    onLegalStatusesChange,
  });

  // コピー処理
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      console.error("コピーに失敗しました:", error);
    }
  };

  // Google検索
  const handleGoogleSearch = (lawName: string, lawId?: number) => {
    const currentPrefecture = searchParams?.prefecture || search.prefecture;
    const { prefectureName: addrPrefecture, cityName } =
      parsePrefectureAndCity(projectAddress);
    const prefectureName =
      addrPrefecture ||
      (currentPrefecture === "hiroshima"
        ? "広島県"
        : currentPrefecture === "okayama"
        ? "岡山県"
        : "");
    const parts = [prefectureName, cityName, lawName];
    if (
      lawId != null &&
      CONTACT_DEPT_LAW_IDS.includes(lawId as (typeof CONTACT_DEPT_LAW_IDS)[number])
    ) {
      parts.push("担当部署");
    }
    const keyword = parts.filter(Boolean).join(" ");
    const encodedKeyword = encodeURIComponent(keyword);
    const searchUrl = `https://www.google.com/search?q=${encodedKeyword}`;
    window.open(searchUrl, "_blank");
  };

  // Mappleリンク生成
  const getMappleUrl = () => {
    if (!search.coordinates) return null;
    const lat = search.coordinates.lat.trim();
    const lng = search.coordinates.lon.trim();
    if (!lat || !lng || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng)))
      return null;
    return `https://labs.mapple.com/mapplexml.html#16/${lat}/${lng}`;
  };

  const currentPrefecture = searchParams?.prefecture || search.prefecture;
  const isOkayama = currentPrefecture === "okayama";
  const isHiroshima = currentPrefecture === "hiroshima";

  // searchParamsがnullの場合は検索フォームを表示
  if (!searchParams) {
    return (
      <div className="space-y-6">
        {/* 検索フォーム */}
        <SearchForm
          coordinateInput={search.coordinateInput}
          onCoordinateInput={search.handleCoordinateInput}
          prefecture={search.prefecture}
          onPrefectureChange={search.setPrefecture}
          onSearch={search.handleSearch}
          isLoading={search.isLoading}
          isDisabled={!search.latitude || !search.longitude || !search.prefecture}
        />

        {/* プロジェクト情報表示 */}
        <ProjectInfoDisplay
          projectAddress={projectAddress}
          projectCoordinates={projectCoordinates}
          coordinates={search.coordinates}
          copiedText={copiedText}
          onCopy={handleCopy}
          getMappleUrl={getMappleUrl}
        />

        {/* 法令カード一覧（検索前） */}
        {!search.hasSearched && (
          <LawCardList
            laws={LAWS}
            projectAddress={projectAddress}
            projectLandCategories={projectLandCategories}
            currentPrefecture={currentPrefecture}
            isOkayama={isOkayama}
            isHiroshima={isHiroshima}
            copiedText={copiedText}
            onCopy={handleCopy}
            onSearch={handleGoogleSearch}
            legalStatuses={statuses.legalStatuses}
            onStatusChange={statuses.updateLegalStatus}
            onStatusRemove={statuses.removeLegalStatus}
          />
        )}
      </div>
    );
  }

  // 検索結果表示
  return (
    <div className="space-y-6">
      {/* ローディング */}
      {search.isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* 判定結果 */}
      {search.result && (
        <JudgmentResultSection
          result={search.result}
          copiedText={copiedText}
          onCopy={handleCopy}
        />
      )}

      {/* 保存ボタン */}
      {projectId && (
        <SaveStatusButton
          isSaving={statuses.isSaving}
          hasChanges={statuses.hasChanges}
          onSave={statuses.saveLegalStatuses}
        />
      )}

      {/* 法令カード一覧 */}
      <LawCardList
        laws={LAWS}
        projectAddress={projectAddress}
        projectLandCategories={projectLandCategories}
        currentPrefecture={currentPrefecture}
        isOkayama={isOkayama}
        isHiroshima={isHiroshima}
        copiedText={copiedText}
        onCopy={handleCopy}
        onSearch={handleGoogleSearch}
        legalStatuses={statuses.legalStatuses}
        onStatusChange={statuses.updateLegalStatus}
        onStatusRemove={statuses.removeLegalStatus}
      />
    </div>
  );
}
