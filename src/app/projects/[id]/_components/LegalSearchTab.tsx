"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { parseCoordinateString, normalizeCoordinateString } from "@/lib/coordinates";
import { parsePrefectureAndCity } from "@/lib/address";
import { generateLegalExcel } from "@/lib/legal-excel-export";
import { LawAlertCard } from "@/components/LawAlertCard";
import type { LegalSearchTabProps, LegalStatuses, LegalStatus, AdditionalButton } from "../_types";
import {
  CONTACT_DEPT_LAW_IDS,
  CONTACT_DEPT_MESSAGE,
  laws,
} from "../_constants";
import LawSearchCard from "./LawSearchCard";
import {
  AddressCoordinatesSection,
  AutoCheckSection,
  BulkStatusSection,
  JudgmentResultSection,
  SaveStatusIndicator,
  PrefectureOrdinanceSection,
  getLawCardConfig,
} from "./LegalSearchTab/index";
import { useLegalSearchData, useLegalAutoCheck, useLegalSearch } from "../_hooks";

function LegalSearchTab({
  searchParams,
  projectAddress,
  projectCoordinates,
  projectLandCategories,
  projectId,
  projectClient,
  projectNumber,
  initialLegalStatuses,
  onLegalStatusesChange,
}: LegalSearchTabProps) {
  const { data: session } = useSession();
  const currentUserName = session?.user?.name || session?.user?.username || "不明";

  // フォーム用ローカル状態
  const [coordinateInput, setCoordinateInput] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // カスタムフック
  const {
    legalStatuses,
    setLegalStatuses,
    saveStatus,
    updateLegalStatus,
    updateLegalNote,
    updateLegalField,
    removeLegalStatus,
    retrySave,
    immediateSave,
  } = useLegalSearchData({
    projectId,
    initialLegalStatuses,
    currentUserName,
    onLegalStatusesChange,
  });

  const { isAutoChecking, autoCheckResult, handleAutoCheck } = useLegalAutoCheck({
    projectId,
    setLegalStatuses,
    onLegalStatusesChange,
  });

  const { result, isLoading, hasSearched, setHasSearched, runSearch } = useLegalSearch({
    searchParams,
  });

  // 座標入力を解析
  const handleCoordinateInput = useCallback((value: string) => {
    setCoordinateInput(value);
    const parsed = parseCoordinateString(value);
    if (parsed) {
      setLatitude(parsed.lat);
      setLongitude(parsed.lon);
      setCoordinateInput(normalizeCoordinateString(value));
    } else {
      setLatitude("");
      setLongitude("");
    }
  }, []);

  // フォームからの検索実行
  const handleSearch = useCallback(() => {
    if (!latitude || !longitude || !prefecture) return;
    setHasSearched(true);
    runSearch(parseFloat(latitude), parseFloat(longitude), prefecture);
  }, [latitude, longitude, prefecture, runSearch, setHasSearched]);

  // コピー処理
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      console.error("コピーに失敗しました:", error);
    }
  }, []);

  // Google検索処理
  const handleGoogleSearch = useCallback((lawName: string, lawId?: number) => {
    const currentPrefecture = searchParams?.prefecture || prefecture;
    const { prefectureName: addrPrefecture, cityName } = parsePrefectureAndCity(projectAddress);
    const prefectureName =
      addrPrefecture ||
      (currentPrefecture === "hiroshima" ? "広島県" : currentPrefecture === "okayama" ? "岡山県" : "");
    const parts = [prefectureName, cityName, lawName];
    if (lawId != null && CONTACT_DEPT_LAW_IDS.includes(lawId as (typeof CONTACT_DEPT_LAW_IDS)[number])) {
      parts.push("担当部署");
    }
    const keyword = parts.filter(Boolean).join(" ");
    const encodedKeyword = encodeURIComponent(keyword);
    window.open(`https://www.google.com/search?q=${encodedKeyword}`, "_blank");
  }, [searchParams?.prefecture, prefecture, projectAddress]);

  // Excel出力
  const handleExcelExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const blob = await generateLegalExcel({
        clientName: projectClient || "",
        projectNumber: projectNumber || "",
        projectAddress: projectAddress || "",
        legalStatuses,
        laws: laws.map((l) => ({ id: l.id, name: l.name })),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectNumber || "法令"}　関係法令一覧.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Excel出力エラー:", error);
      toast.error("Excel出力に失敗しました。");
    } finally {
      setIsExporting(false);
    }
  }, [projectClient, projectNumber, projectAddress, legalStatuses]);

  // 一括ステータス設定
  const handleBulkNotApplicable = useCallback((updates: LegalStatuses) => {
    setLegalStatuses(updates);
    immediateSave(updates);
  }, [setLegalStatuses, immediateSave]);

  const handleReset = useCallback(() => {
    setLegalStatuses({});
    immediateSave({});
  }, [setLegalStatuses, immediateSave]);

  // 座標から緯度・経度を取得
  const getCoordinates = useCallback(() => {
    if (searchParams) {
      return { lat: searchParams.lat, lon: searchParams.lon };
    }
    if (projectCoordinates) {
      const parsed = parseCoordinateString(projectCoordinates);
      if (parsed) return parsed;
    }
    if (latitude && longitude) {
      return { lat: latitude, lon: longitude };
    }
    return null;
  }, [searchParams, projectCoordinates, latitude, longitude]);

  const coordinates = getCoordinates();

  const getMappleUrl = useCallback(() => {
    if (!coordinates) return null;
    const lat = coordinates.lat.trim();
    const lng = coordinates.lon.trim();
    if (!lat || !lng || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) return null;
    return `https://labs.mapple.com/mapplexml.html#16/${lat}/${lng}`;
  }, [coordinates]);

  const currentPrefecture = searchParams?.prefecture || prefecture;
  const isOkayama = currentPrefecture === "okayama";
  const isHiroshima = currentPrefecture === "hiroshima";

  // 法律カードをレンダリング
  const renderLawCards = () => {
    if (!hasSearched) return null;

    return laws.map((law) => {
      const config = getLawCardConfig({
        law,
        isOkayama,
        isHiroshima,
        projectAddress,
        projectLandCategories,
      });

      // 特別なアラートカードを表示する場合
      if (config.specialAlert) {
        return (
          <LawAlertCard
            key={law.id}
            title={config.specialAlert.title}
            message={config.specialAlert.message}
            detailUrl={config.specialAlert.detailUrl}
            variant={config.specialAlert.variant}
          />
        );
      }

      return (
        <LawSearchCard
          key={law.id}
          lawName={law.name}
          lawId={law.id}
          onSearch={handleGoogleSearch}
          fixedText={config.fixedText}
          copiedText={copiedText}
          onCopy={handleCopy}
          prefecture={currentPrefecture}
          additionalButtons={config.additionalButtons}
          badges={config.badges}
          caption={config.caption}
          note={config.note}
          farmlandAlert={config.farmlandAlert}
          currentStatus={legalStatuses[law.name]?.status}
          currentNote={legalStatuses[law.name]?.note}
          currentConfirmationSource={legalStatuses[law.name]?.confirmationSource}
          currentContactInfo={legalStatuses[law.name]?.contactInfo}
          currentConfirmationMethod={legalStatuses[law.name]?.confirmationMethod}
          currentConfirmationDate={legalStatuses[law.name]?.confirmationDate}
          currentConfirmedBy={legalStatuses[law.name]?.confirmedBy}
          currentDepartment={legalStatuses[law.name]?.department}
          updatedBy={legalStatuses[law.name]?.updatedBy}
          updatedAt={legalStatuses[law.name]?.updatedAt}
          onStatusChange={(status) => updateLegalStatus(law.name, status)}
          onStatusRemove={() => removeLegalStatus(law.name)}
          onNoteChange={(note) => updateLegalNote(law.name, note)}
          onFieldChange={(field, value) => updateLegalField(law.name, field, value)}
          hideNotApplicableButton={config.hideNotApplicableButton}
        />
      );
    });
  };

  // searchParamsがnullの場合はフォームを含むビューを表示
  if (!searchParams) {
    return (
      <div className="space-y-6">
        {/* 検索フォーム */}
        <div className="bg-card rounded-4xl border border-border shadow-lg p-8 space-y-6">
          <div className="space-y-2">
            <label htmlFor="coordinate" className="text-sm font-medium text-foreground">
              座標（緯度,経度 または 緯度/経度）
            </label>
            <Input
              id="coordinate"
              type="text"
              placeholder="例: 34.580590,133.457655 または 34.58/133.45"
              value={coordinateInput}
              onChange={(e) => handleCoordinateInput(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              緯度と経度をカンマまたはスラッシュ区切りで入力してください
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="prefecture" className="text-sm font-medium text-foreground">
              都道府県
            </label>
            <Select value={prefecture} onValueChange={setPrefecture}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="都道府県を選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hiroshima">広島県</SelectItem>
                <SelectItem value="okayama">岡山県</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleSearch}
              size="lg"
              className="w-full"
              disabled={!latitude || !longitude || !prefecture || isLoading}
            >
              {isLoading ? "検索中..." : "検索"}
            </Button>
          </div>
        </div>

        <AddressCoordinatesSection
          projectAddress={projectAddress}
          projectCoordinates={projectCoordinates}
          copiedText={copiedText}
          onCopy={handleCopy}
          coordinates={coordinates}
          mappleUrl={getMappleUrl()}
          prefecture={currentPrefecture}
        />

        <AutoCheckSection
          projectId={projectId}
          isAutoChecking={isAutoChecking}
          autoCheckResult={autoCheckResult}
          onAutoCheck={handleAutoCheck}
        />

        <BulkStatusSection
          hasSearched={hasSearched}
          legalStatuses={legalStatuses}
          currentUserName={currentUserName}
          isExporting={isExporting}
          onBulkNotApplicable={handleBulkNotApplicable}
          onReset={handleReset}
          onExcelExport={handleExcelExport}
        />

        {renderLawCards()}

        <PrefectureOrdinanceSection
          hasSearched={hasSearched}
          prefecture={currentPrefecture}
          projectAddress={projectAddress}
        />

        <JudgmentResultSection
          hasSearched={hasSearched}
          isLoading={isLoading}
          result={result}
          isHiroshima={isHiroshima}
          projectAddress={projectAddress}
          coordinates={coordinates}
          copiedText={copiedText}
          onCopy={handleCopy}
        />

        <SaveStatusIndicator
          projectId={projectId}
          saveStatus={saveStatus}
          onRetry={retrySave}
        />
      </div>
    );
  }

  // searchParamsがある場合（自動検索後のビュー）
  return (
    <div className="space-y-6">
      <AddressCoordinatesSection
        projectAddress={projectAddress}
        projectCoordinates={projectCoordinates}
        copiedText={copiedText}
        onCopy={handleCopy}
        coordinates={coordinates}
        mappleUrl={getMappleUrl()}
        prefecture={currentPrefecture}
      />

      <AutoCheckSection
        projectId={projectId}
        isAutoChecking={isAutoChecking}
        autoCheckResult={autoCheckResult}
        onAutoCheck={handleAutoCheck}
      />

      <BulkStatusSection
        hasSearched={hasSearched}
        legalStatuses={legalStatuses}
        currentUserName={currentUserName}
        isExporting={isExporting}
        onBulkNotApplicable={handleBulkNotApplicable}
        onReset={handleReset}
        onExcelExport={handleExcelExport}
      />

      {renderLawCards()}

      <PrefectureOrdinanceSection
        hasSearched={hasSearched}
        prefecture={currentPrefecture}
        projectAddress={projectAddress}
      />

      <JudgmentResultSection
        hasSearched={hasSearched}
        isLoading={isLoading}
        result={result}
        isHiroshima={isHiroshima}
        projectAddress={projectAddress}
        coordinates={coordinates}
        copiedText={copiedText}
        onCopy={handleCopy}
      />

      <SaveStatusIndicator
        projectId={projectId}
        saveStatus={saveStatus}
        onRetry={retrySave}
      />
    </div>
  );
}

export default LegalSearchTab;
