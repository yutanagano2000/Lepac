"use client";

import { useState, useEffect, useRef } from "react";
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
import { Check, Copy, ExternalLink, Loader2, CheckCircle2, XCircle, Scale, Wand2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseCoordinateString, normalizeCoordinateString } from "@/lib/coordinates";
import { parsePrefectureAndCity } from "@/lib/address";
import { generateLegalExcel } from "@/lib/legal-excel-export";
import { LawAlertCard } from "@/components/LawAlertCard";
import type { JudgmentResult, LegalSearchTabProps, LegalStatuses, LegalStatus, SaveStatus, AdditionalButton } from "../_types";
import {
  TEMPLATES,
  FUKUYAMA_SOIL_DETAIL_URL,
  HIROSHIMA_BIRD_PROTECTION_URL,
  CONTACT_DEPT_LAW_IDS,
  CONTACT_DEPT_MESSAGE,
  laws,
  isHiroshimaBirdProtectionArea,
  isFukuyamaSoilTargetArea,
} from "../_constants";
import LawSearchCard from "./LawSearchCard";

function LegalSearchTab({ searchParams, projectAddress, projectCoordinates, projectLandCategories, projectId, projectClient, projectNumber, initialLegalStatuses, onLegalStatusesChange }: LegalSearchTabProps) {
  const { data: session } = useSession();
  const currentUserName = session?.user?.name || session?.user?.username || "不明";

  const [coordinateInput, setCoordinateInput] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [result, setResult] = useState<JudgmentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [legalStatuses, setLegalStatuses] = useState<LegalStatuses>(() => {
    if (initialLegalStatuses) {
      try {
        return JSON.parse(initialLegalStatuses) as LegalStatuses;
      } catch {
        return {};
      }
    }
    return {};
  });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isAutoChecking, setIsAutoChecking] = useState(false);
  const [autoCheckResult, setAutoCheckResult] = useState<{ applied: number; skipped: number } | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const savedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingStatusesRef = useRef<LegalStatuses | null>(null);

  // 法令ステータスを保存（内部関数）
  const saveLegalStatusesInternal = async (statusesToSave: LegalStatuses) => {
    if (!projectId) return;
    setSaveStatus("saving");
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legalStatuses: JSON.stringify(statusesToSave) }),
      });
      if (response.ok) {
        setSaveStatus("saved");
        onLegalStatusesChange?.(statusesToSave);
        // 2秒後に「保存済み」表示を消す
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("error");
      }
    } catch (error) {
      console.error("保存エラー:", error);
      setSaveStatus("error");
    }
  };

  // デバウンス付き保存（メモ入力用: 1秒後に保存）
  const debouncedSave = (newStatuses: LegalStatuses) => {
    pendingStatusesRef.current = newStatuses;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (pendingStatusesRef.current) {
        saveLegalStatusesInternal(pendingStatusesRef.current);
        pendingStatusesRef.current = null;
      }
    }, 1000);
  };

  // 即時保存（ステータスボタン用）
  const immediateSave = (newStatuses: LegalStatuses) => {
    // 保留中のデバウンスをキャンセル
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    pendingStatusesRef.current = null;
    saveLegalStatusesInternal(newStatuses);
  };

  // 法令自動チェック
  const handleAutoCheck = async () => {
    if (!projectId || isAutoChecking) return;
    setIsAutoChecking(true);
    setAutoCheckResult(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/legal-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "自動チェックに失敗しました");
        return;
      }
      const data = await res.json();
      const newStatuses = data.legalStatuses as LegalStatuses;
      setLegalStatuses(newStatuses);
      onLegalStatusesChange?.(newStatuses);
      setAutoCheckResult({
        applied: data.autoApplied?.length ?? 0,
        skipped: data.skipped ?? 0,
      });
    } catch {
      alert("自動チェック中にエラーが発生しました");
    } finally {
      setIsAutoChecking(false);
    }
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // 法令ステータスを更新（即時保存）
  const updateLegalStatus = (lawName: string, status: LegalStatus, note?: string) => {
    setLegalStatuses(prev => {
      const existing = prev[lawName];
      const updatedNote = note !== undefined ? note : existing?.note;
      const updated = {
        ...prev,
        [lawName]: {
          ...existing,
          status,
          note: updatedNote,
          updatedBy: currentUserName,
          updatedAt: new Date().toISOString(),
        }
      };
      // ステータス変更は即時保存
      immediateSave(updated);
      return updated;
    });
  };

  // 法令メモを更新（デバウンス保存）
  const updateLegalNote = (lawName: string, note: string) => {
    setLegalStatuses(prev => {
      const existing = prev[lawName];
      const status = existing?.status || "要確認";
      const updated = {
        ...prev,
        [lawName]: {
          ...existing,
          status,
          note,
          updatedBy: currentUserName,
          updatedAt: new Date().toISOString(),
        }
      };
      // メモ変更はデバウンス保存
      debouncedSave(updated);
      return updated;
    });
  };

  // 法令の追加フィールドを更新（デバウンス保存）
  const updateLegalField = (lawName: string, field: string, value: string) => {
    setLegalStatuses(prev => {
      const existing = prev[lawName];
      const status = existing?.status || "要確認";
      const updated = {
        ...prev,
        [lawName]: {
          ...existing,
          status,
          [field]: value,
          updatedBy: currentUserName,
          updatedAt: new Date().toISOString(),
        }
      };
      debouncedSave(updated);
      return updated;
    });
  };

  // 法令ステータスを削除（即時保存）
  const removeLegalStatus = (lawName: string) => {
    setLegalStatuses(prev => {
      const updated = { ...prev };
      delete updated[lawName];
      // 削除は即時保存
      immediateSave(updated);
      return updated;
    });
  };

  // 手動再試行用
  const retrySave = () => {
    saveLegalStatusesInternal(legalStatuses);
  };

  // Excel出力
  const [isExporting, setIsExporting] = useState(false);
  const handleExcelExport = async () => {
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
      alert("Excel出力に失敗しました。");
    } finally {
      setIsExporting(false);
    }
  };

  // 座標入力を解析（カンマ・スラッシュ・空白区切りに対応）し、有効なら正規化表示
  const handleCoordinateInput = (value: string) => {
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
  };

  // 検索実行（逆ジオコーディングは削除）
  const runSearch = async (lat: number, lon: number, pref: string) => {
    setHasSearched(true);
    setResult(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/legal-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lon, prefecture: pref }),
      });
      const data: JudgmentResult = await response.json();
      setResult(data);
    } catch (error) {
      console.error("判定エラー:", error);
      alert("判定に失敗しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  // フォームからの検索実行
  const handleSearch = () => {
    if (!latitude || !longitude || !prefecture) return;
    runSearch(parseFloat(latitude), parseFloat(longitude), prefecture);
  };

  // searchParamsが設定されたら自動検索
  useEffect(() => {
    if (!searchParams) return;
    const lat = parseFloat(searchParams.lat);
    const lon = parseFloat(searchParams.lon);
    if (isNaN(lat) || isNaN(lon)) return;
    runSearch(lat, lon, searchParams.prefecture);
  }, [searchParams]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      console.error("コピーに失敗しました:", error);
    }
  };

  const handleGoogleSearch = (lawName: string, lawId?: number) => {
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
    const searchUrl = `https://www.google.com/search?q=${encodedKeyword}`;
    window.open(searchUrl, "_blank");
  };

  // 座標から緯度・経度を取得
  const getCoordinates = () => {
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
  };

  const coordinates = getCoordinates();

  const getMappleUrl = () => {
    if (!coordinates) return null;
    const lat = coordinates.lat.trim();
    const lng = coordinates.lon.trim();
    if (!lat || !lng || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) return null;
    return `https://labs.mapple.com/mapplexml.html#16/${lat}/${lng}`;
  };

  // searchParamsがnullの場合はフォームを表示
  if (!searchParams) {
    const currentPrefecture = prefecture;
    const currentLat = latitude;
    const currentLon = longitude;
    const isOkayama = currentPrefecture === "okayama";
    const isHiroshima = currentPrefecture === "hiroshima";

    return (
      <div className="space-y-6">
        {/* 検索フォーム */}
        <div className="bg-card rounded-4xl border border-border shadow-lg p-8 space-y-6">
          {/* 座標入力（カンマ区切り） */}
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

          {/* 都道府県選択 */}
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

          {/* 検索ボタン */}
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

        {/* 現地住所・現地座標（画面上部に固定表示） */}
        {(projectAddress || projectCoordinates) && (
          <div className="sticky top-0 z-10 bg-background pt-1 -mt-1 pb-4 space-y-4 border-b border-border/50 shadow-sm">
            {projectAddress && (
              <div className="bg-card rounded-4xl border border-border shadow-lg p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-xl font-semibold text-foreground mb-4">現地住所</h2>
                <div className="flex items-start gap-2 p-4 rounded-2xl bg-muted/50 border border-border">
                  <p className="flex-1 text-sm text-foreground leading-relaxed">
                    {projectAddress}
                  </p>
                  <button
                    onClick={() => handleCopy(projectAddress)}
                    className="shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
                    title="コピー"
                  >
                    {copiedText === projectAddress ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {projectCoordinates && (
              <div className="bg-card rounded-4xl border border-border shadow-lg p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-xl font-semibold text-foreground mb-4">現地座標</h2>
                <div className="flex items-start gap-2 p-4 rounded-2xl bg-muted/50 border border-border">
                  <p className="flex-1 text-sm text-foreground leading-relaxed">
                    {projectCoordinates}
                  </p>
                  <button
                    onClick={() => handleCopy(projectCoordinates)}
                    className="shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
                    title="コピー"
                  >
                    {copiedText === projectCoordinates ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    )}
                  </button>
                </div>
                {coordinates && (
                  <div className="flex flex-wrap gap-2">
                    {getMappleUrl() && (
                      <Button variant="outline" size="sm" asChild className="h-9">
                        <a
                          href={getMappleUrl() ?? ""}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3 w-3 mr-2" />
                          MAPPLE
                        </a>
                      </Button>
                    )}
                    <Button
                      onClick={() => window.open(
                        `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lon}`,
                        '_blank'
                      )}
                      className="flex-1"
                    >
                      Google Mapで確認
                    </Button>
                    {currentPrefecture === "okayama" && (
                      <Button
                        onClick={() => window.open('https://www.gis.pref.okayama.jp/pref-okayama/PositionSelect?mid=7', '_blank')}
                        className="flex-1"
                      >
                        おかやま全県統合型GIS
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 法令自動チェック */}
        {projectId && (
          <div className="bg-card rounded-4xl border border-border shadow-lg p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">法令自動チェック</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  座標・住所・地目から自動で法令を判定します（手動入力済みの法令は上書きしません）
                </p>
                {autoCheckResult && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {autoCheckResult.applied}件を自動設定しました{autoCheckResult.skipped > 0 && `（${autoCheckResult.skipped}件は既に入力済みのためスキップ）`}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                onClick={handleAutoCheck}
                disabled={isAutoChecking}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isAutoChecking ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                    チェック中...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-3 w-3 mr-1.5" />
                    自動チェック実行
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* 一括ステータス設定 */}
        {hasSearched && (
          <div className="bg-card rounded-4xl border border-border shadow-lg p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">一括設定</span>
                <span className="text-xs text-muted-foreground">
                  ({Object.keys(legalStatuses).length}/{laws.length} 設定済み)
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // 未設定の法令をすべて「非該当」に設定
                    const updates: LegalStatuses = { ...legalStatuses };
                    laws.forEach((law) => {
                      if (!updates[law.name]) {
                        updates[law.name] = {
                          status: "非該当",
                          note: "対象地区ではありません。",
                          updatedBy: currentUserName,
                          updatedAt: new Date().toISOString(),
                        };
                      }
                    });
                    setLegalStatuses(updates);
                    immediateSave(updates);
                  }}
                  className="text-xs"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1.5 text-green-500" />
                  未設定を全て非該当
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm("すべての法令ステータスをリセットしますか？")) {
                      setLegalStatuses({});
                      immediateSave({});
                    }
                  }}
                  className="text-xs text-muted-foreground"
                >
                  <XCircle className="h-3 w-3 mr-1.5" />
                  リセット
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExcelExport}
                  disabled={isExporting}
                  className="text-xs"
                >
                  {isExporting ? (
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3 mr-1.5" />
                  )}
                  {isExporting ? "出力中..." : "Excel出力"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 法律検索カード一覧 */}
        {hasSearched && laws.map((law) => {
          const additionalButtons: AdditionalButton[] = [];
          const badges: string[] = [];
          let caption: string | undefined;
          let fixedTextWithCopy = law.fixedText;
          let noteForCard: string | undefined;
          let showFarmlandAlert = false;

          if (law.id === 1 && isOkayama) {
            additionalButtons.push({
              label: "おかやま全県統合型GIS",
              url: "https://www.gis.pref.okayama.jp/pref-okayama/PositionSelect?mid=7"
            });
          }
          if (law.id === 1 && isHiroshima && projectAddress?.includes("広島市")) {
            additionalButtons.push({
              label: "ひろしま地図ナビ",
              url: "https://www2.wagmap.jp/hiroshimacity/Portal?mid=4"
            });
          }

          if (law.id === 4) {
            fixedTextWithCopy = "対象地区ではありません。";
            noteForCard = "港湾区域に関する法規制です。港湾区域の開発でない場合は該当しません。";
          }

          if (law.id === 5) {
            noteForCard = "海岸保全区域に関する法規制です。海岸保全区域の開発でない場合は該当しません。";
          }

          if (law.id === 9 && isOkayama && !projectAddress?.includes("井原市")) {
            caption = "岡山県は全域が景観区域です。届出対象行為はこちらで確認してください。";
          }
          if (law.id === 9) {
            const { cityName: landscapeCityName } = parsePrefectureAndCity(projectAddress ?? null);
            if (landscapeCityName) {
              const landscapeButtonUrl = isOkayama
                ? "https://www.pref.okayama.jp/uploaded/attachment/325065.pdf"
                : "https://www.city.fukuyama.hiroshima.jp/uploaded/attachment/130060.pdf";
              additionalButtons.push({
                label: `${landscapeCityName}の届出対象行為`,
                url: landscapeButtonUrl
              });
            }
          }
          if (law.id === 9) {
            fixedTextWithCopy = "要件に該当しないため、届出不要です。";
            noteForCard = "開発面積や工作物の高さが一般的な要件です。各都道府県の法令を確認してください。";
          }

          if (law.id === 13 && isOkayama) {
            additionalButtons.push({
              label: "おかやま全県統合型GIS",
              url: "https://www.gis.pref.okayama.jp/pref-okayama/PositionSelect?mid=7"
            });
          }
          if (law.id === 13 && isHiroshima) {
            additionalButtons.push({
              label: "広島県埋蔵文化財地図",
              url: "https://www.pref.hiroshima.lg.jp/site/bunkazai/bunkazai-map-map.html"
            });
          }
          if (law.id === 13) {
            noteForCard = "地図で確認してください。";
          }

          if (law.id === 15 && isOkayama) {
            additionalButtons.push({
              label: "おかやま全県統合型GIS",
              url: "https://www.gis.pref.okayama.jp/pref-okayama/PositionSelect?mid=7"
            });
          }
          if (law.id === 15 && isHiroshima) {
            additionalButtons.push({
              label: "広島県の自然公園",
              url: "https://www.pref.hiroshima.lg.jp/soshiki/47/kouikisei.html"
            });
          }
          if (law.id === 15) {
            noteForCard = "自然公園区域に関する法規制です。自然公園内の開発でない場合は該当しません。";
          }

          if (law.id === 16 && isOkayama) {
            additionalButtons.push({
              label: "自然環境保全地域",
              url: "https://www.pref.okayama.jp/page/573469.html"
            });
          }
          if (law.id === 16 && isHiroshima) {
            additionalButtons.push({
              label: "広島県の保全地域一覧",
              url: "https://www.pref.hiroshima.lg.jp/site/hiroshima-shizenkankyouhozen/"
            });
          }

          if (law.id === 17) {
            // 中国四国地方の県かどうか判定
            const chushikokuPrefectures = ["岡山県", "広島県", "山口県", "鳥取県", "島根県", "香川県", "愛媛県", "徳島県", "高知県"];
            const { prefectureName: speciesPrefecture } = parsePrefectureAndCity(projectAddress);
            const isChushikoku = speciesPrefecture && chushikokuPrefectures.includes(speciesPrefecture);

            if (isChushikoku) {
              fixedTextWithCopy = "中国四国地方環境事務所管内には、種の保存法に基づき指定された生息地等保護区はありません。";
              additionalButtons.push({
                label: "参照リンク",
                url: "https://chushikoku.env.go.jp/procure/page_00068.html"
              });
            }
            additionalButtons.push({
              label: "生息地等保護区",
              url: "https://www.env.go.jp/nature/kisho/hogoku/list.html"
            });
          }

          if (law.id === 18 && projectAddress && isHiroshimaBirdProtectionArea(projectAddress)) {
            return (
              <LawAlertCard
                key={law.id}
                title={law.name}
                message="鳥獣保護区に該当する可能性があります"
                detailUrl={HIROSHIMA_BIRD_PROTECTION_URL}
                variant="red"
              />
            );
          }
          if (law.id === 18 && isOkayama) {
            additionalButtons.push({
              label: "鳥獣保護区等位置図",
              url: "https://www.pref.okayama.jp/uploaded/life/1011233_9758897_misc.pdf"
            });
          }
          if (law.id === 18 && isHiroshima) {
            additionalButtons.push({
              label: "広島県の鳥獣保護区",
              url: HIROSHIMA_BIRD_PROTECTION_URL
            });
          }
          if (law.id === 18) {
            noteForCard = "鳥獣保護区に関する法規制です。";
          }

          if (law.id === 19 && isHiroshima) {
            fixedTextWithCopy = "対象の面積要件は○○ha以上のため、今回は該当しません。";
            noteForCard = "上記は例文です。各都道府県の条例に沿って記入してください。";
            const { prefectureName: assessmentPrefecture } = parsePrefectureAndCity(projectAddress ?? null);
            additionalButtons.push({
              label: `${assessmentPrefecture || "広島県"}の対象事業`,
              url: "https://www.pref.hiroshima.lg.jp/site/eco/h-h2-assessment-panhu-03.html"
            });
          }
          if (law.id === 19 && isOkayama) {
            fixedTextWithCopy = "対象の面積要件は20ha以上のため、今回は該当しません。";
            noteForCard = "上記は例文です。各都道府県の条例に沿って記入してください。";
            const { prefectureName: assessmentPrefecture } = parsePrefectureAndCity(projectAddress ?? null);
            additionalButtons.push({
              label: `${assessmentPrefecture || "岡山県"}の対象事業`,
              url: "https://www.pref.okayama.jp/uploaded/life/1005026_9692062_misc.pdf"
            });
          }

          if (law.id === 14 && projectAddress && isFukuyamaSoilTargetArea(projectAddress)) {
            return (
              <LawAlertCard
                key={law.id}
                title="土壌汚染対策法"
                message="土壌汚染対策法の対象区域の可能性があります。"
                detailUrl={FUKUYAMA_SOIL_DETAIL_URL}
              />
            );
          }
          // 担当部署にお問い合わせが必要な法令（河川法など）も通常カードで表示
          if (CONTACT_DEPT_LAW_IDS.includes(law.id as (typeof CONTACT_DEPT_LAW_IDS)[number])) {
            caption = CONTACT_DEPT_MESSAGE;
          }
          if (law.id === 14) {
            fixedTextWithCopy = "対象地区ではありません。";
          }
          if (law.id === 10 || law.id === 11) {
            const isOkayamaNonFarmlandArea =
              projectAddress?.includes("井原市") ||
              projectAddress?.includes("笠岡市") ||
              projectAddress?.includes("矢掛");
            if (isOkayamaNonFarmlandArea) {
              fixedTextWithCopy = "非農地認定済みのため不要。地目変更登記を行います。";
              caption = "井原・笠岡・矢掛の場合は非農地リストがあるので、農地であっても手続きが地目変更のみになります。";
            } else {
              const cats = [
                projectLandCategories?.landCategory1 ?? null,
                projectLandCategories?.landCategory2 ?? null,
                projectLandCategories?.landCategory3 ?? null,
              ].filter((c): c is string => !!c);
              const hasFarmland = cats.some((c) => c === "田" || c === "畑");
              if (cats.length > 0 && hasFarmland) {
                showFarmlandAlert = true;
              }
              if (cats.length > 0 && !hasFarmland) {
                fixedTextWithCopy = "農地ではないため該当しません。";
                noteForCard = "地目が正しく登録されていることを確認してください";
              }
            }
          }

          // 消防法・振動規制法・道路法・廃棄物法は「対象地区ではありません」ボタンを非表示
          const hideNotApplicable = [20, 21, 22, 23].includes(law.id);

          return (
            <LawSearchCard
              key={law.id}
              lawName={law.name}
              lawId={law.id}
              onSearch={handleGoogleSearch}
              fixedText={fixedTextWithCopy}
              copiedText={copiedText}
              onCopy={handleCopy}
              prefecture={currentPrefecture}
              additionalButtons={additionalButtons}
              badges={badges}
              caption={caption}
              note={noteForCard}
              farmlandAlert={showFarmlandAlert}
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
              hideNotApplicableButton={hideNotApplicable}
            />
          );
        })}

        {/* ○○県の太陽光に関する条例 */}
        {hasSearched && currentPrefecture && (
          <div className="bg-card rounded-4xl border border-border shadow-lg p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              {currentPrefecture === "hiroshima" ? "広島県" : currentPrefecture === "okayama" ? "岡山県" : ""}の太陽光に関する条例
            </h2>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {currentPrefecture === "hiroshima" ? "広島県" : currentPrefecture === "okayama" ? "岡山県" : ""}の太陽光発電に関する条例を検索
                </p>
              </div>
              <Button
                onClick={() => {
                  const prefName = currentPrefecture === "hiroshima" ? "広島県" : currentPrefecture === "okayama" ? "岡山県" : "";
                  const query = encodeURIComponent(`${prefName}　太陽光　条例`);
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
        {hasSearched && currentPrefecture === "okayama" && (
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
                Googleで検索
              </Button>
            </div>
          </div>
        )}

        {/* 市区町村条例カード（井原市） */}
        {hasSearched && projectAddress?.includes("井原市") && (
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
                Googleで検索
              </Button>
            </div>
          </div>
        )}

        {/* 判定結果表示 */}
        {hasSearched && (
          <div className="bg-card rounded-4xl border border-border shadow-lg p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-semibold text-foreground mb-4">判定結果</h2>

            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                判定中...
              </div>
            ) : result ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">宅地造成等工事規制区域</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.宅地造成等工事規制区域 ? (
                        <>
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                          <span className="font-semibold text-green-500">該当します</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-6 h-6 text-red-500" />
                          <span className="font-semibold text-muted-foreground">該当しません</span>
                        </>
                      )}
                    </div>
                  </div>

                  {result.宅地造成等工事規制区域 && (
                    <div className="flex items-start gap-2 p-4 rounded-2xl bg-muted/50 border border-border">
                      <p className="flex-1 text-sm text-foreground leading-relaxed">
                        {TEMPLATES.宅地造成等工事規制区域}
                      </p>
                      <button
                        onClick={() => handleCopy(TEMPLATES.宅地造成等工事規制区域)}
                        className="shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
                        title="コピー"
                      >
                        {copiedText === TEMPLATES.宅地造成等工事規制区域 ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {isHiroshima && (
                    <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/50 dark:border-amber-600 p-4">
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                        広島県は未対応です
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        特定盛土等規制区域の判定は広島県では提供しておりません。
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">特定盛土等規制区域</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.特定盛土等規制区域 ? (
                        <>
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                          <span className="font-semibold text-green-500">該当します</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-6 h-6 text-red-500" />
                          <span className="font-semibold text-muted-foreground">該当しません</span>
                        </>
                      )}
                    </div>
                  </div>

                  {result.特定盛土等規制区域 && (
                    <div className="flex items-start gap-2 p-4 rounded-2xl bg-muted/50 border border-border">
                      <p className="flex-1 text-sm text-foreground leading-relaxed">
                        {TEMPLATES.特定盛土等規制区域}
                      </p>
                      <button
                        onClick={() => handleCopy(TEMPLATES.特定盛土等規制区域)}
                        className="shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
                        title="コピー"
                      >
                        {copiedText === TEMPLATES.特定盛土等規制区域 ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border mt-4">
                  <p className="text-sm text-muted-foreground">
                    判定座標: {projectAddress && `${projectAddress}, `}緯度 {currentLat}, 経度 {currentLon}
                  </p>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                判定結果がありません
              </div>
            )}
          </div>
        )}

        {/* 自動保存ステータスインジケーター */}
        {projectId && saveStatus !== "idle" && (
          <div className="fixed bottom-6 right-6 z-50">
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-sm font-medium transition-all",
              saveStatus === "saving" && "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
              saveStatus === "saved" && "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
              saveStatus === "error" && "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
            )}>
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  保存中...
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  保存しました
                </>
              )}
              {saveStatus === "error" && (
                <>
                  <XCircle className="h-4 w-4" />
                  保存失敗
                  <button
                    onClick={retrySave}
                    className="ml-2 px-2 py-0.5 rounded bg-red-200 hover:bg-red-300 dark:bg-red-800 dark:hover:bg-red-700 text-xs"
                  >
                    再試行
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentPrefecture = searchParams.prefecture;
  const isOkayama = currentPrefecture === "okayama";
  const isHiroshima = currentPrefecture === "hiroshima";

  // 座標から緯度・経度を取得（searchParams時）
  const getCoordinatesForSearchParams = () => {
    if (searchParams) {
      return { lat: searchParams.lat, lon: searchParams.lon };
    }
    if (projectCoordinates) {
      const parsed = parseCoordinateString(projectCoordinates);
      if (parsed) return parsed;
    }
    return null;
  };

  const coordinatesForSearchParams = getCoordinatesForSearchParams();

  const getMappleUrlForSearchParams = () => {
    if (!coordinatesForSearchParams) return null;
    const lat = coordinatesForSearchParams.lat.trim();
    const lng = coordinatesForSearchParams.lon.trim();
    if (!lat || !lng || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) return null;
    return `https://labs.mapple.com/mapplexml.html#16/${lat}/${lng}`;
  };

  return (
    <div className="space-y-6">
      {/* 現地住所・現地座標（画面上部に固定表示） */}
      {(projectAddress || projectCoordinates) && (
        <div className="sticky top-0 z-10 bg-background pt-1 -mt-1 pb-4 space-y-4 border-b border-border/50 shadow-sm">
          {projectAddress && (
            <div className="bg-card rounded-4xl border border-border shadow-lg p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-semibold text-foreground mb-4">現地住所</h2>
              <div className="flex items-start gap-2 p-4 rounded-2xl bg-muted/50 border border-border">
                <p className="flex-1 text-sm text-foreground leading-relaxed">
                  {projectAddress}
                </p>
                <button
                  onClick={() => handleCopy(projectAddress)}
                  className="shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
                  title="コピー"
                >
                  {copiedText === projectAddress ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  )}
                </button>
              </div>
            </div>
          )}

          {projectCoordinates && (
            <div className="bg-card rounded-4xl border border-border shadow-lg p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-semibold text-foreground mb-4">現地座標</h2>
              <div className="flex items-start gap-2 p-4 rounded-2xl bg-muted/50 border border-border">
                <p className="flex-1 text-sm text-foreground leading-relaxed">
                  {projectCoordinates}
                </p>
                <button
                  onClick={() => handleCopy(projectCoordinates)}
                  className="shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
                  title="コピー"
                >
                  {copiedText === projectCoordinates ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  )}
                </button>
              </div>
              {coordinatesForSearchParams && (
                <div className="flex flex-wrap gap-2">
                  {getMappleUrlForSearchParams() && (
                    <Button variant="outline" size="sm" asChild className="h-9">
                      <a
                        href={getMappleUrlForSearchParams() ?? ""}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        MAPPLE
                      </a>
                    </Button>
                  )}
                  {coordinatesForSearchParams && (
                    <Button
                      onClick={() => window.open(
                        `https://www.google.com/maps?q=${coordinatesForSearchParams.lat},${coordinatesForSearchParams.lon}`,
                        '_blank'
                      )}
                      className="flex-1"
                    >
                      Google Mapで確認
                    </Button>
                  )}
                  {currentPrefecture === "okayama" && (
                    <Button
                      onClick={() => window.open('https://www.gis.pref.okayama.jp/pref-okayama/PositionSelect?mid=7', '_blank')}
                      className="flex-1"
                    >
                      おかやま全県統合型GIS
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 法令自動チェック（モバイル） */}
      {projectId && (
        <div className="bg-card rounded-4xl border border-border shadow-lg p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">法令自動チェック</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                座標・住所・地目から自動で法令を判定します
              </p>
              {autoCheckResult && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {autoCheckResult.applied}件を自動設定しました{autoCheckResult.skipped > 0 && `（${autoCheckResult.skipped}件スキップ）`}
                </p>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleAutoCheck}
              disabled={isAutoChecking}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isAutoChecking ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  チェック中...
                </>
              ) : (
                <>
                  <Wand2 className="h-3 w-3 mr-1.5" />
                  自動チェック
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* 一括ステータス設定 */}
      {hasSearched && (
        <div className="bg-card rounded-4xl border border-border shadow-lg p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">一括設定</span>
              <span className="text-xs text-muted-foreground">
                ({Object.keys(legalStatuses).length}/{laws.length} 設定済み)
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // 未設定の法令をすべて「非該当」に設定
                  const updates: LegalStatuses = { ...legalStatuses };
                  laws.forEach((law) => {
                    if (!updates[law.name]) {
                      updates[law.name] = {
                        status: "非該当",
                        note: "対象地区ではありません。",
                        updatedBy: currentUserName,
                        updatedAt: new Date().toISOString(),
                      };
                    }
                  });
                  setLegalStatuses(updates);
                  immediateSave(updates);
                }}
                className="text-xs"
              >
                <CheckCircle2 className="h-3 w-3 mr-1.5 text-green-500" />
                未設定を全て非該当
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("すべての法令ステータスをリセットしますか？")) {
                    setLegalStatuses({});
                    immediateSave({});
                  }
                }}
                className="text-xs text-muted-foreground"
              >
                <XCircle className="h-3 w-3 mr-1.5" />
                リセット
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExcelExport}
                disabled={isExporting}
                className="text-xs"
              >
                {isExporting ? (
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                ) : (
                  <Download className="h-3 w-3 mr-1.5" />
                )}
                {isExporting ? "出力中..." : "Excel出力"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 法律検索カード一覧 */}
      {hasSearched && laws.map((law) => {
        const additionalButtons: AdditionalButton[] = [];
        const badges: string[] = [];
        let caption: string | undefined;
        let fixedTextWithCopy = law.fixedText;
        let noteForCard: string | undefined;
        let showFarmlandAlert = false;

        if (law.id === 1 && isOkayama) {
          additionalButtons.push({
            label: "おかやま全県統合型GIS",
            url: "https://www.gis.pref.okayama.jp/pref-okayama/PositionSelect?mid=7"
          });
        }
        if (law.id === 1 && isHiroshima && projectAddress?.includes("広島市")) {
          additionalButtons.push({
            label: "ひろしま地図ナビ",
            url: "https://www2.wagmap.jp/hiroshimacity/Portal?mid=4"
          });
        }

        if (law.id === 4) {
          fixedTextWithCopy = "対象地区ではありません。";
          noteForCard = "港湾区域に関する法規制です。港湾区域の開発でない場合は該当しません。";
        }

        if (law.id === 5) {
          noteForCard = "海岸保全区域に関する法規制です。海岸保全区域の開発でない場合は該当しません。";
        }

        if (law.id === 9 && isOkayama && !projectAddress?.includes("井原市")) {
          caption = "岡山県は全域が景観区域です。届出対象行為はこちらで確認してください。";
        }
        if (law.id === 9) {
          const { cityName: landscapeCityName } = parsePrefectureAndCity(projectAddress ?? null);
          if (landscapeCityName) {
            const landscapeButtonUrl = isOkayama
              ? "https://www.pref.okayama.jp/uploaded/attachment/325065.pdf"
              : "https://www.city.fukuyama.hiroshima.jp/uploaded/attachment/130060.pdf";
            additionalButtons.push({
              label: `${landscapeCityName}の届出対象行為`,
              url: landscapeButtonUrl
            });
          }
        }
        if (law.id === 9) {
          fixedTextWithCopy = "要件に該当しないため、届出不要です。";
          noteForCard = "開発面積や工作物の高さが一般的な要件です。各都道府県の法令を確認してください。";
        }

        if (law.id === 13 && isOkayama) {
          additionalButtons.push({
            label: "おかやま全県統合型GIS",
            url: "https://www.gis.pref.okayama.jp/pref-okayama/PositionSelect?mid=7"
          });
        }
        if (law.id === 13 && isHiroshima) {
          additionalButtons.push({
            label: "広島県埋蔵文化財地図",
            url: "https://www.pref.hiroshima.lg.jp/site/bunkazai/bunkazai-map-map.html"
          });
        }
        if (law.id === 13) {
          noteForCard = "地図で確認してください。";
        }

        if (law.id === 15 && isOkayama) {
          additionalButtons.push({
            label: "おかやま全県統合型GIS",
            url: "https://www.gis.pref.okayama.jp/pref-okayama/PositionSelect?mid=7"
          });
        }
        if (law.id === 15 && isHiroshima) {
          additionalButtons.push({
            label: "自然公園の位置図",
            url: "https://www.pref.hiroshima.lg.jp/soshiki/47/kouikisei.html"
          });
        }
        if (law.id === 15) {
          noteForCard = "自然公園区域に関する法規制です。自然公園内の開発でない場合は該当しません。";
        }

        if (law.id === 16 && isOkayama) {
          additionalButtons.push({
            label: "自然環境保全地域",
            url: "https://www.pref.okayama.jp/page/573469.html"
          });
        }
        if (law.id === 16 && isHiroshima) {
          additionalButtons.push({
            label: "広島県の保全地域一覧",
            url: "https://www.pref.hiroshima.lg.jp/site/hiroshima-shizenkankyouhozen/"
          });
        }

        if (law.id === 17) {
          // 中国四国地方の県かどうか判定
          const chushikokuPrefectures = ["岡山県", "広島県", "山口県", "鳥取県", "島根県", "香川県", "愛媛県", "徳島県", "高知県"];
          const { prefectureName: speciesPrefecture } = parsePrefectureAndCity(projectAddress);
          const isChushikoku = speciesPrefecture && chushikokuPrefectures.includes(speciesPrefecture);

          if (isChushikoku) {
            fixedTextWithCopy = "中国四国地方環境事務所管内には、種の保存法に基づき指定された生息地等保護区はありません。";
            additionalButtons.push({
              label: "参照リンク",
              url: "https://chushikoku.env.go.jp/procure/page_00068.html"
            });
          }
          additionalButtons.push({
            label: "生息地等保護区",
            url: "https://www.env.go.jp/nature/kisho/hogoku/list.html"
          });
        }

        if (law.id === 18 && projectAddress && isHiroshimaBirdProtectionArea(projectAddress)) {
          return (
            <LawAlertCard
              key={law.id}
              title={law.name}
              message="鳥獣保護区に該当する可能性があります"
              detailUrl={HIROSHIMA_BIRD_PROTECTION_URL}
              variant="red"
            />
          );
        }
        if (law.id === 18 && isOkayama) {
          additionalButtons.push({
            label: "鳥獣保護区等位置図",
            url: "https://www.pref.okayama.jp/uploaded/life/1011233_9758897_misc.pdf"
          });
        }
        if (law.id === 18 && isHiroshima) {
          additionalButtons.push({
            label: "広島県の鳥獣保護区",
            url: HIROSHIMA_BIRD_PROTECTION_URL
          });
        }
        if (law.id === 18) {
          noteForCard = "鳥獣保護区に関する法規制です。";
        }

        if (law.id === 19 && isHiroshima) {
          fixedTextWithCopy = "対象の面積要件は○○ha以上のため、今回は該当しません。";
          noteForCard = "上記は例文です。各都道府県の条例に沿って記入してください。";
          const { prefectureName: assessmentPrefecture } = parsePrefectureAndCity(projectAddress ?? null);
          additionalButtons.push({
            label: `${assessmentPrefecture || "広島県"}の対象事業`,
            url: "https://www.pref.hiroshima.lg.jp/site/eco/h-h2-assessment-panhu-03.html"
          });
        }
        if (law.id === 19 && isOkayama) {
          fixedTextWithCopy = "対象の面積要件は20ha以上のため、今回は該当しません。";
          noteForCard = "上記は例文です。各都道府県の条例に沿って記入してください。";
          const { prefectureName: assessmentPrefecture } = parsePrefectureAndCity(projectAddress ?? null);
          additionalButtons.push({
            label: `${assessmentPrefecture || "岡山県"}の対象事業`,
            url: "https://www.pref.okayama.jp/uploaded/life/1005026_9692062_misc.pdf"
          });
        }

        if (law.id === 14 && projectAddress && isFukuyamaSoilTargetArea(projectAddress)) {
          return (
            <LawAlertCard
              key={law.id}
              title="土壌汚染対策法"
              message="土壌汚染対策法の対象区域の可能性があります。"
              detailUrl={FUKUYAMA_SOIL_DETAIL_URL}
            />
          );
        }
        // 担当部署にお問い合わせが必要な法令（河川法など）も通常カードで表示
        if (CONTACT_DEPT_LAW_IDS.includes(law.id as (typeof CONTACT_DEPT_LAW_IDS)[number])) {
          caption = CONTACT_DEPT_MESSAGE;
        }
        if (law.id === 14) {
          fixedTextWithCopy = "対象地区ではありません。";
        }
        if (law.id === 10 || law.id === 11) {
          const isOkayamaNonFarmlandArea =
            projectAddress?.includes("井原市") ||
            projectAddress?.includes("笠岡市") ||
            projectAddress?.includes("矢掛");
          if (isOkayamaNonFarmlandArea) {
            fixedTextWithCopy = "非農地認定済みのため不要。地目変更登記を行います。";
            caption = "井原・笠岡・矢掛の場合は非農地リストがあるので、農地であっても手続きが地目変更のみになります。";
          } else {
            const cats = [
              projectLandCategories?.landCategory1 ?? null,
              projectLandCategories?.landCategory2 ?? null,
              projectLandCategories?.landCategory3 ?? null,
            ].filter((c): c is string => !!c);
            const hasFarmland = cats.some((c) => c === "田" || c === "畑");
            if (cats.length > 0 && hasFarmland) {
              showFarmlandAlert = true;
            }
            if (cats.length > 0 && !hasFarmland) {
              fixedTextWithCopy = "農地ではないため該当しません。";
              noteForCard = "地目が正しく登録されていることを確認してください";
            }
          }
        }

        // 消防法・振動規制法・道路法・廃棄物法は「対象地区ではありません」ボタンを非表示
        const hideNotApplicable = [20, 21, 22, 23].includes(law.id);

        return (
          <LawSearchCard
            key={law.id}
            lawName={law.name}
            lawId={law.id}
            onSearch={handleGoogleSearch}
            fixedText={fixedTextWithCopy}
            copiedText={copiedText}
            onCopy={handleCopy}
            prefecture={currentPrefecture}
            additionalButtons={additionalButtons}
            badges={badges}
            caption={caption}
            note={noteForCard}
            farmlandAlert={showFarmlandAlert}
            currentStatus={legalStatuses[law.name]?.status}
            currentNote={legalStatuses[law.name]?.note}
            currentConfirmationSource={legalStatuses[law.name]?.confirmationSource}
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
            hideNotApplicableButton={hideNotApplicable}
          />
        );
      })}

      {/* ○○県の太陽光に関する条例 */}
      {hasSearched && currentPrefecture && (
        <div className="bg-card rounded-4xl border border-border shadow-lg p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            {currentPrefecture === "hiroshima" ? "広島県" : currentPrefecture === "okayama" ? "岡山県" : ""}の太陽光に関する条例
          </h2>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium text-foreground">
                {currentPrefecture === "hiroshima" ? "広島県" : currentPrefecture === "okayama" ? "岡山県" : ""}の太陽光発電に関する条例を検索
              </p>
            </div>
            <Button
              onClick={() => {
                const prefName = currentPrefecture === "hiroshima" ? "広島県" : currentPrefecture === "okayama" ? "岡山県" : "";
                const query = encodeURIComponent(`${prefName}　太陽光　条例`);
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
      {hasSearched && currentPrefecture === "okayama" && (
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
              Googleで検索
            </Button>
          </div>
        </div>
      )}

      {/* 市区町村条例カード（井原市） */}
      {hasSearched && projectAddress?.includes("井原市") && (
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
              Googleで検索
            </Button>
          </div>
        </div>
      )}

      {/* 判定結果表示 */}
      {hasSearched && (
        <div className="bg-card rounded-4xl border border-border shadow-lg p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-xl font-semibold text-foreground mb-4">判定結果</h2>

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              判定中...
            </div>
          ) : result ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">宅地造成等工事規制区域</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.宅地造成等工事規制区域 ? (
                      <>
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                        <span className="font-semibold text-green-500">該当します</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-6 h-6 text-red-500" />
                        <span className="font-semibold text-muted-foreground">該当しません</span>
                      </>
                    )}
                  </div>
                </div>

                {result.宅地造成等工事規制区域 && (
                  <div className="flex items-start gap-2 p-4 rounded-2xl bg-muted/50 border border-border">
                    <p className="flex-1 text-sm text-foreground leading-relaxed">
                      {TEMPLATES.宅地造成等工事規制区域}
                    </p>
                    <button
                      onClick={() => handleCopy(TEMPLATES.宅地造成等工事規制区域)}
                      className="shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
                      title="コピー"
                    >
                      {copiedText === TEMPLATES.宅地造成等工事規制区域 ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {isHiroshima && (
                  <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/50 dark:border-amber-600 p-4">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                      広島県は未対応です
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                      特定盛土等規制区域の判定は広島県では提供しておりません。
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">特定盛土等規制区域</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.特定盛土等規制区域 ? (
                      <>
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                        <span className="font-semibold text-green-500">該当します</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-6 h-6 text-red-500" />
                        <span className="font-semibold text-muted-foreground">該当しません</span>
                      </>
                    )}
                  </div>
                </div>

                {result.特定盛土等規制区域 && (
                  <div className="flex items-start gap-2 p-4 rounded-2xl bg-muted/50 border border-border">
                    <p className="flex-1 text-sm text-foreground leading-relaxed">
                      {TEMPLATES.特定盛土等規制区域}
                    </p>
                    <button
                      onClick={() => handleCopy(TEMPLATES.特定盛土等規制区域)}
                      className="shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
                      title="コピー"
                    >
                      {copiedText === TEMPLATES.特定盛土等規制区域 ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {coordinatesForSearchParams && (
                <div className="pt-2 border-t border-border mt-4">
                  <p className="text-sm text-muted-foreground">
                    判定座標: {projectAddress && `${projectAddress}, `}緯度 {coordinatesForSearchParams.lat}, 経度 {coordinatesForSearchParams.lon}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              判定結果がありません
            </div>
          )}
        </div>
      )}

      {/* 自動保存ステータスインジケーター */}
      {projectId && saveStatus !== "idle" && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-sm font-medium transition-all",
            saveStatus === "saving" && "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
            saveStatus === "saved" && "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
            saveStatus === "error" && "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
          )}>
            {saveStatus === "saving" && (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                保存中...
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <CheckCircle2 className="h-4 w-4" />
                保存しました
              </>
            )}
            {saveStatus === "error" && (
              <>
                <XCircle className="h-4 w-4" />
                保存失敗
                <button
                  onClick={retrySave}
                  className="ml-2 px-2 py-0.5 rounded bg-red-200 hover:bg-red-300 dark:bg-red-800 dark:hover:bg-red-700 text-xs"
                >
                  再試行
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default LegalSearchTab;
