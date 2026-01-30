"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Check, Circle, Calendar as CalendarIcon, Clock, Pencil, Trash2, MessageCircle, Send, ExternalLink, Copy, Scale, CheckCircle2, XCircle, Loader2, ListTodo } from "lucide-react";
import { formatDateJp } from "@/lib/timeline";
import { cn } from "@/lib/utils";
import {
  parseCoordinateString,
  normalizeCoordinateString,
} from "@/lib/coordinates";
import { parsePrefectureAndCity } from "@/lib/address";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Project, Progress, Comment, Todo } from "@/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LawAlertCard } from "@/components/LawAlertCard";
import { ContactDeptAlertCard } from "@/components/ContactDeptAlertCard";

const PROGRESS_TITLES = [
  "合意書",
  "案件提出",
  "現調",
  "土地売買契約",
  "土地契約",
  "法令申請",
  "法令許可",
  "電力申請",
  "電力回答",
  "SS依頼",
  "SS実施",
  "土地決済",
  "発注",
  "着工",
  "連系",
  "完工",
] as const;

// 法令検索タブ用の型と定数（GeoSearchViewから再利用）
interface JudgmentResult {
  宅地造成等工事規制区域: boolean;
  特定盛土等規制区域: boolean;
}

const TEMPLATES = {
  宅地造成等工事規制区域: "宅地造成規制区域。造成の規模によっては許可申請が必要。現調結果次第で判断いたします。",
  特定盛土等規制区域: "特定盛土規制区域。造成の規模によっては届出 / 許可申請が必要。現調結果次第で判断いたします。",
};

// 土壌汚染対策法・福山市要措置区域等の対象地区（現地住所がこれらのいずれかを含む場合にアラート表示）
const FUKUYAMA_SOIL_TARGET_DISTRICTS = [
  "瀬戸町",
  "加茂町",
  "鋼管町",
  "柳津町",
  "緑町",
  "三吉町",
  "松浜町",
] as const;
const FUKUYAMA_SOIL_DETAIL_URL =
  "https://www.city.fukuyama.hiroshima.jp/site/kankyo/335122.html";

// 鳥獣の保護及び管理並びに狩猟の適正化に関する法律：赤アラート表示対象（広島県内）
const HIROSHIMA_BIRD_PROTECTION_AREAS = [
  "庄原市口和町",
  "東広島市志和町",
  "福山市走島町",
  "福山市赤坂町",
  "福山市沼隈町",
  "福山市千田町",
  "三原市",
] as const;
const HIROSHIMA_BIRD_PROTECTION_URL =
  "https://www.pref.hiroshima.lg.jp/site/huntinglicense/hunter-map.html";

function isHiroshimaBirdProtectionArea(address: string | null): boolean {
  if (!address || !address.includes("広島県")) return false;
  return HIROSHIMA_BIRD_PROTECTION_AREAS.some((area) => address.includes(area));
}

// 担当部署にお問い合わせのアラートを表示し、検索クエリに「担当部署」を追加する法律（河川法・急傾斜地・砂防・地すべり・森林法）
const CONTACT_DEPT_LAW_IDS = [3, 6, 7, 8, 12] as const;
const CONTACT_DEPT_MESSAGE = "担当部署にお問い合わせください";

function isFukuyamaSoilTargetArea(address: string | null): boolean {
  if (!address || !address.includes("福山市")) return false;
  return FUKUYAMA_SOIL_TARGET_DISTRICTS.some((d) => address.includes(d));
}

interface AdditionalButton {
  label: string;
  url: string;
}

interface LawSearchCardProps {
  lawName: string;
  onSearch: (lawName: string, lawId?: number) => void;
  lawId?: number;
  fixedText?: string;
  copiedText: string | null;
  onCopy: (text: string) => void;
  prefecture?: string;
  additionalButtons?: AdditionalButton[];
  badges?: string[];
  caption?: string;
  /** ただし書き（コピーアイコンなしで表示） */
  note?: string;
  /** 地目に農地（田・畑）が含まれる場合の小さなアラート表示 */
  farmlandAlert?: boolean;
}

const LawSearchCard: React.FC<LawSearchCardProps> = ({
  lawName,
  onSearch,
  lawId,
  fixedText,
  copiedText,
  onCopy,
  prefecture,
  additionalButtons = [],
  badges = [],
  caption,
  note,
  farmlandAlert,
}) => {
  return (
    <div className="bg-card rounded-4xl border border-border shadow-lg p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-medium text-foreground">{lawName}</p>
          {farmlandAlert && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              地目に農地が含まれています
            </p>
          )}
          {caption && (
            <p className="text-sm text-muted-foreground mt-2">{caption}</p>
          )}
          {fixedText && (
            <div className="flex items-start gap-2 mt-3 p-3 rounded-xl bg-muted/50 border border-border">
              <p className="flex-1 text-sm text-foreground leading-relaxed">{fixedText}</p>
              <button
                onClick={() => onCopy(fixedText)}
                className="shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
                title="コピー"
              >
                {copiedText === fixedText ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                )}
              </button>
            </div>
          )}
          {note && (
            <p className="text-xs text-muted-foreground mt-2">{note}</p>
          )}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {badges.map((badge, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                >
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0 ml-4">
          <Button onClick={() => onSearch(lawName, lawId)} className="w-full">
            Googleで検索
          </Button>
          {additionalButtons.map((button, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => window.open(button.url, '_blank')}
              className="w-full"
            >
              <ExternalLink className="h-3 w-3 mr-2" />
              {button.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface Law {
  id: number;
  name: string;
  fixedText?: string;
}

const laws: Law[] = [
  { id: 1, name: "国土利用計画法" },
  { id: 2, name: "都市計画法" },
  { id: 3, name: "河川法" },
  { id: 4, name: "港湾法" },
  { id: 5, name: "海岸法" },
  { id: 6, name: "急傾斜地の崩壊による災害の防止に関する法律" },
  { id: 7, name: "砂防法" },
  { id: 8, name: "地すべり等防止法" },
  { id: 9, name: "景観法" },
  { id: 10, name: "農業振興地域の整備に関する法律" },
  { id: 11, name: "農地法" },
  { id: 12, name: "森林法" },
  { id: 13, name: "文化財保護法" },
  { id: 14, name: "土壌汚染対策法" },
  { id: 15, name: "自然公園法" },
  { id: 16, name: "自然環境保全法" },
  { id: 17, name: "絶滅の恐れがある野生動植物の種の保存に関する法律" },
  { id: 18, name: "鳥獣の保護及び管理並びに狩猟の適正化に関する法律" },
  { id: 19, name: "環境影響評価法・条例" },
  { id: 20, name: "消防法", fixedText: "低圧の為、消防署への届出が必要な機器設置なく、該当しません。" },
  { id: 21, name: "振動規制法", fixedText: "特定施設を設置しないため、該当しません。" },
  { id: 22, name: "道路法", fixedText: "工事区域に道路が無い為、道路使用許可が占用許可の必要な行為は予定されていません。" },
  { id: 23, name: "廃棄物の処理及び清掃に関する法律", fixedText: "敷地内の残置物及び工事で発生した産廃物については適正に処理します。" },
];

// 法令検索タブコンポーネント
interface LegalSearchTabProps {
  searchParams: { lat: string; lon: string; prefecture: string } | null;
  projectAddress: string | null;
  projectCoordinates: string | null;
  projectLandCategories?: {
    landCategory1: string | null;
    landCategory2: string | null;
    landCategory3: string | null;
  } | null;
}

function LegalSearchTab({ searchParams, projectAddress, projectCoordinates, projectLandCategories }: LegalSearchTabProps) {
  const [coordinateInput, setCoordinateInput] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [result, setResult] = useState<JudgmentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

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
      const response = await fetch("https://geo-checker-backend-aj4j.onrender.com/api/v1/check", {
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

        {/* 法律検索カード一覧 */}
        {hasSearched && laws.map((law) => {
          let additionalButtons: AdditionalButton[] = [];
          let badges: string[] = [];
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

          if (law.id === 4 && isOkayama && !projectAddress?.includes("井原市")) {
            fixedTextWithCopy = "港湾法第38条の２により、一定規模以上の廃棄物処理施設の建設又は改良、一定規模以上の工場又は事業場の新設や増設をする場合には、届出が必要となります。";
            badges = ["岡山港", "宇野港", "水島港", "東備港", "児島港", "笠岡港", "下津井港", "牛窓港"];
          }

          if (law.id === 5 && isOkayama && !projectAddress?.includes("井原市")) {
            fixedTextWithCopy = "「海岸法」に基づいて指定した一定の区域を海岸保全区域といいます。この区域内では、海岸管理者（県や市町村）が必要に応じて海岸保全施設（堤防や護岸など）を整備するほか、一定の行為（工作物の設置や土地の掘削など）については、許可が必要となる場合があります。";
            badges = ["東備港", "牛窓港", "岡山港", "山田港", "宇野港", "児島港", "下津井港", "水島港", "笠岡港", "北木島港", "鴻島港", "寒河港", "犬島港", "石島港", "松島港", "豊浦港", "前浦港", "大浦港", "大飛島港", "小飛島港"];
          }
          if ((law.id === 4 || law.id === 5) && (!isOkayama || projectAddress?.includes("井原市"))) {
            fixedTextWithCopy = "対象地区ではありません。";
          }
          if (law.id === 4) {
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
            fixedTextWithCopy = "対象地区ではありません。";
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
            fixedTextWithCopy = "対象地区ではありません。";
          }

          if (law.id === 17) {
            fixedTextWithCopy = "対象地区ではありません。";
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
            fixedTextWithCopy = "対象地区ではありません。";
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
          if (CONTACT_DEPT_LAW_IDS.includes(law.id as (typeof CONTACT_DEPT_LAW_IDS)[number])) {
            return (
              <ContactDeptAlertCard
                key={law.id}
                title={law.name}
                message={CONTACT_DEPT_MESSAGE}
                onSearch={handleGoogleSearch}
                lawName={law.name}
                lawId={law.id}
              />
            );
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
            />
          );
        })}

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

      {/* 法律検索カード一覧 */}
      {hasSearched && laws.map((law) => {
        let additionalButtons: AdditionalButton[] = [];
        let badges: string[] = [];
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

        if (law.id === 4 && isOkayama && !projectAddress?.includes("井原市")) {
          fixedTextWithCopy = "港湾法第38条の２により、一定規模以上の廃棄物処理施設の建設又は改良、一定規模以上の工場又は事業場の新設や増設をする場合には、届出が必要となります。";
          badges = ["岡山港", "宇野港", "水島港", "東備港", "児島港", "笠岡港", "下津井港", "牛窓港"];
        }

        if (law.id === 5 && isOkayama && !projectAddress?.includes("井原市")) {
          fixedTextWithCopy = "「海岸法」に基づいて指定した一定の区域を海岸保全区域といいます。この区域内では、海岸管理者（県や市町村）が必要に応じて海岸保全施設（堤防や護岸など）を整備するほか、一定の行為（工作物の設置や土地の掘削など）については、許可が必要となる場合があります。";
          badges = ["東備港", "牛窓港", "岡山港", "山田港", "宇野港", "児島港", "下津井港", "水島港", "笠岡港", "北木島港", "鴻島港", "寒河港", "犬島港", "石島港", "松島港", "豊浦港", "前浦港", "大浦港", "大飛島港", "小飛島港"];
        }
        if ((law.id === 4 || law.id === 5) && (!isOkayama || projectAddress?.includes("井原市"))) {
          fixedTextWithCopy = "対象地区ではありません。";
        }
        if (law.id === 4) {
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
          fixedTextWithCopy = "対象地区ではありません。";
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
          fixedTextWithCopy = "対象地区ではありません。";
        }

        if (law.id === 17) {
          fixedTextWithCopy = "対象地区ではありません。";
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
          fixedTextWithCopy = "対象地区ではありません。";
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
        if (CONTACT_DEPT_LAW_IDS.includes(law.id as (typeof CONTACT_DEPT_LAW_IDS)[number])) {
          return (
            <ContactDeptAlertCard
              key={law.id}
              title={law.name}
              message={CONTACT_DEPT_MESSAGE}
              onSearch={handleGoogleSearch}
              lawName={law.name}
              lawId={law.id}
            />
          );
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
          />
        );
      })}

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
    </div>
  );
}

function formatYyyyMd(date: Date | undefined) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}.${m}.${d}`;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [progressList, setProgressList] = useState<Progress[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoContent, setNewTodoContent] = useState("");
  const [newTodoDueDate, setNewTodoDueDate] = useState<string>("");
  const [newTodoCalendarOpen, setNewTodoCalendarOpen] = useState(false);
  const [newTodoSelectedDate, setNewTodoSelectedDate] = useState<Date | undefined>(undefined);
  const [todoEditOpen, setTodoEditOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editTodoContent, setEditTodoContent] = useState("");
  const [editTodoDueDate, setEditTodoDueDate] = useState("");
  const [editTodoCalendarOpen, setEditTodoCalendarOpen] = useState(false);
  const [editTodoSelectedDate, setEditTodoSelectedDate] = useState<Date | undefined>(undefined);
  const [todoCompleteOpen, setTodoCompleteOpen] = useState(false);
  const [completingTodo, setCompletingTodo] = useState<Todo | null>(null);
  const [completeTodoMemo, setCompleteTodoMemo] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  const [legalSearchParams, setLegalSearchParams] = useState<{ lat: string; lon: string; prefecture: string } | null>(null);
  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [commentEditOpen, setCommentEditOpen] = useState(false);
  const [commentDeleteOpen, setCommentDeleteOpen] = useState(false);
  const [deletingComment, setDeletingComment] = useState<Comment | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [detailEditOpen, setDetailEditOpen] = useState(false);
  const [detailForm, setDetailForm] = useState({
    address: "",
    coordinates: "",
    landowner1: "",
    landowner2: "",
    landowner3: "",
    landCategory1: "",
    landCategory2: "",
    landCategory3: "",
    landArea1: "",
    landArea2: "",
    landArea3: "",
  });
  const [open, setOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    description: string;
    date: Date | undefined;
    status: "planned" | "completed";
  }>({
    title: "",
    description: "",
    date: undefined,
    status: "planned",
  });
  const [dateText, setDateText] = useState("");

  // 編集用の状態
  const [editOpen, setEditOpen] = useState(false);
  const [editCalendarOpen, setEditCalendarOpen] = useState(false);
  const [editingProgress, setEditingProgress] = useState<Progress | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    date: Date | undefined;
    completedAt: Date | undefined;
    status: "planned" | "completed";
  }>({
    title: "",
    description: "",
    date: undefined,
    completedAt: undefined,
    status: "planned",
  });
  const [editCompletedDateText, setEditCompletedDateText] = useState("");
  const [editCompletedCalendarOpen, setEditCompletedCalendarOpen] = useState(false);
  const [editDateText, setEditDateText] = useState("");

  const fetchProject = () => {
    fetch(`/api/projects/${id}`)
      .then((res) => res.json())
      .then(setProject);
  };

  const fetchProgress = () => {
    fetch(`/api/projects/${id}/progress`)
      .then((res) => res.json())
      .then(setProgressList);
  };

  const fetchComments = () => {
    fetch(`/api/projects/${id}/comments`)
      .then((res) => res.json())
      .then(setComments);
  };

  const fetchTodos = () => {
    fetch(`/api/projects/${id}/todos`)
      .then((res) => res.json())
      .then(setTodos);
  };

  const handleDetailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...project,
        address: detailForm.address,
        coordinates: normalizeCoordinateString(detailForm.coordinates) || detailForm.coordinates,
        landowner1: detailForm.landowner1,
        landowner2: detailForm.landowner2,
        landowner3: detailForm.landowner3,
        landCategory1: detailForm.landCategory1,
        landCategory2: detailForm.landCategory2,
        landCategory3: detailForm.landCategory3,
        landArea1: detailForm.landArea1,
        landArea2: detailForm.landArea2,
        landArea3: detailForm.landArea3,
      }),
    });
    setDetailEditOpen(false);
    fetchProject();
  };

  const openDetailEditDialog = () => {
    if (!project) return;
    setDetailForm({
      address: project.address ?? "",
      coordinates: project.coordinates ?? "",
      landowner1: project.landowner1 ?? "",
      landowner2: project.landowner2 ?? "",
      landowner3: project.landowner3 ?? "",
      landCategory1: project.landCategory1 ?? "",
      landCategory2: project.landCategory2 ?? "",
      landCategory3: project.landCategory3 ?? "",
      landArea1: project.landArea1 ?? "",
      landArea2: project.landArea2 ?? "",
      landArea3: project.landArea3 ?? "",
    });
    setDetailEditOpen(true);
  };

  // 土地面積の合計を計算
  const calculateTotalArea = (area1: string, area2: string, area3: string) => {
    const num1 = parseFloat(area1) || 0;
    const num2 = parseFloat(area2) || 0;
    const num3 = parseFloat(area3) || 0;
    return num1 + num2 + num3;
  };

  // クリップボードにコピーする汎用関数
  const copyToClipboard = async (text: string, fieldName: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // 座標をクリップボードにコピー
  const copyCoordinates = async () => {
    if (!project?.coordinates) return;
    await copyToClipboard(project.coordinates, "coordinates");
  };

  // 合計値をクリップボードにコピー
  const copyTotalArea = async () => {
    if (!project) return;
    const total = calculateTotalArea(
      project.landArea1 ?? "",
      project.landArea2 ?? "",
      project.landArea3 ?? ""
    );
    await copyToClipboard(total.toString(), "totalArea");
  };

  // 住所をコピー
  const copyAddress = async () => {
    if (!project?.address) return;
    await copyToClipboard(project.address, "address");
  };

  // 地権者をコピー
  const copyLandowners = async () => {
    if (!project) return;
    const landowners = [project.landowner1, project.landowner2, project.landowner3]
      .filter(Boolean)
      .join("\n");
    if (landowners) {
      await copyToClipboard(landowners, "landowners");
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await fetch(`/api/projects/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment }),
    });
    setNewComment("");
    fetchComments();
  };

  const openCommentEditDialog = (comment: Comment) => {
    setEditingComment(comment);
    setEditCommentContent(comment.content);
    setCommentEditOpen(true);
  };

  const handleCommentEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComment || !editCommentContent.trim()) return;
    await fetch(`/api/projects/${id}/comments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commentId: editingComment.id,
        content: editCommentContent,
      }),
    });
    setCommentEditOpen(false);
    setEditingComment(null);
    fetchComments();
  };

  const openCommentDeleteDialog = (comment: Comment) => {
    setDeletingComment(comment);
    setCommentDeleteOpen(true);
  };

  const handleCommentDelete = async () => {
    if (!deletingComment) return;
    await fetch(`/api/projects/${id}/comments?commentId=${deletingComment.id}`, {
      method: "DELETE",
    });
    setCommentDeleteOpen(false);
    setDeletingComment(null);
    fetchComments();
  };

  const handleTodoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoContent.trim() || !newTodoDueDate) return;
    await fetch(`/api/projects/${id}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newTodoContent.trim(), dueDate: newTodoDueDate }),
    });
    setNewTodoContent("");
    setNewTodoDueDate("");
    setNewTodoSelectedDate(undefined);
    fetchTodos();
  };

  const handleTodoDelete = async (todoId: number) => {
    await fetch(`/api/todos/${todoId}`, { method: "DELETE" });
    fetchTodos();
  };

  const openTodoEditDialog = (todo: Todo) => {
    setEditingTodo(todo);
    setEditTodoContent(todo.content);
    setEditTodoDueDate(todo.dueDate);
    setEditTodoSelectedDate(new Date(todo.dueDate + "T00:00:00"));
    setTodoEditOpen(true);
  };

  const handleTodoEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTodo || !editTodoContent.trim() || !editTodoDueDate) return;
    await fetch(`/api/todos/${editingTodo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editTodoContent.trim(), dueDate: editTodoDueDate }),
    });
    setTodoEditOpen(false);
    setEditingTodo(null);
    fetchTodos();
  };

  const openTodoCompleteDialog = (todo: Todo) => {
    setCompletingTodo(todo);
    setCompleteTodoMemo("");
    setTodoCompleteOpen(true);
  };

  const handleTodoCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTodo) return;
    await fetch(`/api/todos/${completingTodo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        completedAt: new Date().toISOString(),
        completedMemo: completeTodoMemo.trim() || null,
      }),
    });
    setTodoCompleteOpen(false);
    setCompletingTodo(null);
    setCompleteTodoMemo("");
    fetchTodos();
  };

  const handleTodoReopen = async (todo: Todo) => {
    await fetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completedAt: null, completedMemo: null }),
    });
    fetchTodos();
  };

  // タイムラインを自動生成してから進捗を取得
  const generateAndFetchProgress = async () => {
    await fetch(`/api/projects/${id}/progress/generate`, { method: "POST" });
    fetchProgress();
  };

  // Strict Modeでの二重呼び出しを防止
  const hasGeneratedRef = useRef(false);

  useEffect(() => {
    fetchProject();
    fetchComments();
    fetchTodos();
    // generate APIは1回だけ呼び出す（React Strict Modeでの二重実行防止）
    if (!hasGeneratedRef.current) {
      hasGeneratedRef.current = true;
      generateAndFetchProgress();
    } else {
      // 2回目以降は進捗の取得のみ
      fetchProgress();
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date) return;
    await fetch(`/api/projects/${id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        status: form.status,
        createdAt: form.date.toISOString(),
      }),
    });
    setForm({ title: "", description: "", date: undefined, status: "planned" });
    setDateText("");
    setOpen(false);
    fetchProgress();
  };

  const markAsCompleted = async (progressId: number) => {
    await fetch(`/api/projects/${id}/progress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        progressId, 
        status: "completed",
        completedAt: new Date().toISOString(),
      }),
    });
    fetchProgress();
  };

  const markAsIncomplete = async (progressId: number) => {
    await fetch(`/api/projects/${id}/progress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        progressId, 
        status: "planned",
        completedAt: null,
      }),
    });
    fetchProgress();
  };

  const openEditDialog = (p: Progress) => {
    setEditingProgress(p);
    const date = new Date(p.createdAt);
    const completedAt = p.completedAt ? new Date(p.completedAt) : undefined;
    setEditForm({
      title: p.title,
      description: p.description ?? "",
      date,
      completedAt,
      status: p.status as "planned" | "completed",
    });
    setEditDateText(formatYyyyMd(date));
    setEditCompletedDateText(completedAt ? formatYyyyMd(completedAt) : "");
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgress || !editForm.date) return;
    await fetch(`/api/projects/${id}/progress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        progressId: editingProgress.id,
        title: editForm.title,
        description: editForm.description,
        status: editForm.status,
        createdAt: editForm.date.toISOString(),
        completedAt: editForm.completedAt ? editForm.completedAt.toISOString() : null,
      }),
    });
    setEditOpen(false);
    setEditingProgress(null);
    fetchProgress();
  };

  const handleDelete = async () => {
    if (!editingProgress) return;
    if (!confirm("この進捗を削除しますか？")) return;
    await fetch(`/api/projects/${id}/progress?progressId=${editingProgress.id}`, {
      method: "DELETE",
    });
    setEditOpen(false);
    setEditingProgress(null);
    fetchProgress();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getMappleUrl = (coords: string | null) => {
    const parsed = coords ? parseCoordinateString(coords) : null;
    if (!parsed) return null;
    return `https://labs.mapple.com/mapplexml.html#16/${parsed.lat}/${parsed.lon}`;
  };

  const getGoogleMapsUrl = (coords: string | null) => {
    const parsed = coords ? parseCoordinateString(coords) : null;
    if (!parsed) return null;
    return `https://www.google.com/maps?q=${parsed.lat},${parsed.lon}`;
  };

  const getHazardMapUrl = (coords: string | null) => {
    const parsed = coords ? parseCoordinateString(coords) : null;
    if (!parsed) return null;
    return `https://disaportal.gsi.go.jp/maps/?ll=${parsed.lat},${parsed.lon}&z=16&base=ort&vs=c1j0l0u0t0h0z0`;
  };

  // 現地住所から都道府県の選択値（法令検索用）を取得
  const getPrefectureParam = (address: string | null): string | null => {
    if (!address) return null;
    if (address.includes("広島県")) return "hiroshima";
    if (address.includes("岡山県")) return "okayama";
    return null;
  };

  // 法令確認画面へのURL（座標・都道府県をクエリで渡す）
  const getLegalSearchUrl = () => {
    if (!project?.coordinates || !project?.address) return null;
    const parsed = parseCoordinateString(project.coordinates);
    if (!parsed) return null;
    const { lat, lon } = parsed;
    const prefectureParam = getPrefectureParam(project.address);
    if (!prefectureParam || !lat || !lon) return null;
    const params = new URLSearchParams({ lat, lon, prefecture: prefectureParam });
    return `/legal?${params.toString()}`;
  };

  // 法令タブを直接開いたときも、法令検索ボタンと同じ内容を表示する（座標・住所があれば検索パラメータを自動設定）
  useEffect(() => {
    if (activeTab !== "legal") return;
    if (legalSearchParams != null) return;
    if (!project?.coordinates || !project?.address) return;
    const parsed = parseCoordinateString(project.coordinates);
    if (!parsed) return;
    const prefectureParam = getPrefectureParam(project.address);
    if (!prefectureParam || !parsed.lat || !parsed.lon) return;
    setLegalSearchParams({ lat: parsed.lat, lon: parsed.lon, prefecture: prefectureParam });
  }, [activeTab, legalSearchParams, project?.coordinates, project?.address]);

  // 進捗を日付でソート（すべてDBから取得）
  const sortedTimeline = useMemo(() => {
    return [...progressList]
      .map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description ?? undefined,
        date: new Date(p.createdAt),
        completedAt: p.completedAt ? new Date(p.completedAt) : undefined,
        status: p.status as "completed" | "planned",
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [progressList]);

  if (!project) return null;

  return (
    <div className="min-h-screen bg-background px-6">
      <div className="mx-auto max-w-5xl py-10">
        <div className="space-y-6">
          {/* ヘッダー */}
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon">
              <Link href="/projects">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">{project.managementNumber}</h1>
              <p className="text-sm text-muted-foreground">
                {project.client} / {project.projectNumber}
              </p>
              {project.completionMonth && (
                <p className="text-sm text-muted-foreground">
                  完成月: {project.completionMonth}
                </p>
              )}
            </div>
          </div>

          {/* 進捗追加ダイアログ */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>進捗を追加</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>タイトル</Label>
                  <Select
                    value={form.title}
                    onValueChange={(value) => setForm({ ...form, title: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROGRESS_TITLES.map((title) => (
                        <SelectItem key={title} value={title}>
                          {title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">詳細（任意）</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="例: 司法書士事務所へ郵送済み"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>日付</Label>
                  <div className="flex gap-2">
                    <Input
                      value={dateText}
                      onChange={(e) => {
                        const value = e.target.value;
                        setDateText(value);
                        const match = value.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})$/);
                        if (match) {
                          const [, y, m, d] = match;
                          const parsed = new Date(Number(y), Number(m) - 1, Number(d));
                          if (!isNaN(parsed.getTime())) {
                            setForm({ ...form, date: parsed });
                          }
                        } else if (value === "") {
                          setForm({ ...form, date: undefined });
                        }
                      }}
                      placeholder="例: 2026.1.19"
                      className="flex-1"
                    />
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="icon">
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          required
                          selected={form.date}
                          onSelect={(d) => {
                            if (d) {
                              setForm({ ...form, date: d });
                              setDateText(formatYyyyMd(d));
                            }
                            setIsCalendarOpen(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>ステータス</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value: "planned" | "completed") =>
                      setForm({ ...form, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">予定</SelectItem>
                      <SelectItem value="completed">完了</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    キャンセル
                  </Button>
                  <Button type="submit" disabled={!form.date || !form.title}>
                    追加
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* 編集ダイアログ */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>進捗を編集</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>タイトル</Label>
                  <Select
                    value={editForm.title}
                    onValueChange={(value) => setEditForm({ ...editForm, title: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROGRESS_TITLES.map((title) => (
                        <SelectItem key={title} value={title}>
                          {title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">詳細（任意）</Label>
                  <Textarea
                    id="edit-description"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="例: 司法書士事務所へ郵送済み"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>予定日</Label>
                  <div className="flex gap-2">
                    <Input
                      value={editDateText}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEditDateText(value);
                        const match = value.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})$/);
                        if (match) {
                          const [, y, m, d] = match;
                          const parsed = new Date(Number(y), Number(m) - 1, Number(d));
                          if (!isNaN(parsed.getTime())) {
                            setEditForm({ ...editForm, date: parsed });
                          }
                        } else if (value === "") {
                          setEditForm({ ...editForm, date: undefined });
                        }
                      }}
                      placeholder="例: 2026.1.19"
                      className="flex-1"
                    />
                    <Popover open={editCalendarOpen} onOpenChange={setEditCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="icon">
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          required
                          selected={editForm.date}
                          onSelect={(d) => {
                            if (d) {
                              setEditForm({ ...editForm, date: d });
                              setEditDateText(formatYyyyMd(d));
                            }
                            setEditCalendarOpen(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>完了日（任意）</Label>
                  <div className="flex gap-2">
                    <Input
                      value={editCompletedDateText}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEditCompletedDateText(value);
                        const match = value.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})$/);
                        if (match) {
                          const [, y, m, d] = match;
                          const parsed = new Date(Number(y), Number(m) - 1, Number(d));
                          if (!isNaN(parsed.getTime())) {
                            setEditForm({ ...editForm, completedAt: parsed });
                          }
                        } else if (value === "") {
                          setEditForm({ ...editForm, completedAt: undefined });
                        }
                      }}
                      placeholder="例: 2026.1.19"
                      className="flex-1"
                    />
                    <Popover open={editCompletedCalendarOpen} onOpenChange={setEditCompletedCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="icon">
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={editForm.completedAt}
                          onSelect={(d) => {
                            if (d) {
                              setEditForm({ ...editForm, completedAt: d });
                              setEditCompletedDateText(formatYyyyMd(d));
                            } else {
                              setEditForm({ ...editForm, completedAt: undefined });
                              setEditCompletedDateText("");
                            }
                            setEditCompletedCalendarOpen(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>ステータス</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(value: "planned" | "completed") =>
                      setEditForm({ ...editForm, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">予定</SelectItem>
                      <SelectItem value="completed">完了</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    削除
                  </Button>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                      キャンセル
                    </Button>
                    <Button type="submit" disabled={!editForm.date || !editForm.title}>
                      保存
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* 統合タイムライン */}
          <div className="relative">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">タイムライン</h2>
              </div>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4" />
                    進捗を追加
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
            {sortedTimeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">タイムラインがありません</p>
            ) : (
              <div className="space-y-0">
                {(() => {
                  // 直近の未完了項目のインデックスを計算
                  const firstPendingIndex = sortedTimeline.findIndex(
                    (item) => item.status !== "completed"
                  );
                  return sortedTimeline.map((item, index) => {
                    const isCompleted = item.status === "completed";
                    const isFirstPending = index === firstPendingIndex;
                    
                    // 予定日までの日数を計算
                    const now = new Date();
                    const daysUntilDue = Math.ceil((item.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    const isOverdue = !isCompleted && daysUntilDue < 0;
                    
                    return (
                    <div key={item.id} className="relative flex gap-4">
                      {/* 縦線とノード */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                            isCompleted
                              ? "border-green-500 bg-green-500"
                              : isOverdue
                              ? "border-red-500 bg-background"
                              : "border-muted-foreground bg-background"
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="h-4 w-4 text-white" />
                          ) : (
                            <Circle className={`h-4 w-4 ${isOverdue ? "text-red-500" : "text-muted-foreground"}`} />
                          )}
                        </div>
                        {index < sortedTimeline.length - 1 && (
                          <div
                            className={`w-0.5 flex-1 ${
                              isCompleted
                                ? "bg-green-500"
                                : "border-l-2 border-dashed border-muted-foreground"
                            }`}
                          />
                        )}
                      </div>
                      {/* コンテンツ */}
                      <div className="flex-1 pb-6">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p
                                className={`font-medium ${
                                  isCompleted ? "" : "text-muted-foreground"
                                }`}
                              >
                                {item.title}
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  const p = progressList.find((pr) => pr.id === item.id);
                                  if (p) openEditDialog(p);
                                }}
                                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            {item.description && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {item.description}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDateJp(item.date)}
                              {item.completedAt && (
                                <span className={`ml-2 ${item.completedAt > item.date ? "text-red-500" : "text-green-500"}`}>
                                  → {formatDateJp(item.completedAt)}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1">
                            {/* 未完了にするボタン（直近の完了タスク） */}
                            {isCompleted && (
                              firstPendingIndex === -1 
                                ? index === sortedTimeline.length - 1
                                : index === firstPendingIndex - 1
                            ) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                                onClick={() => markAsIncomplete(item.id)}
                              >
                                未完了にする
                              </Button>
                            )}
                            {/* 完了にするボタン（直近の未完了タスク） */}
                            {isFirstPending && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => markAsCompleted(item.id)}
                              >
                                完了にする
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          {/* タブ UI */}
          <Tabs defaultValue="details" className="w-full" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">案件情報</TabsTrigger>
              <TabsTrigger value="legal">法令</TabsTrigger>
              <TabsTrigger value="comments">コメント</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-6">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-3 items-start border-b pb-3">
                    <span className="text-sm font-medium text-muted-foreground">現地住所</span>
                    <div className="col-span-2 flex items-center gap-2">
                      <span className="text-sm">{project.address || "未登録"}</span>
                      {project.address && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={copyAddress}
                        >
                          {copiedField === "address" ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 items-start border-b pb-3">
                    <span className="text-sm font-medium text-muted-foreground">座標</span>
                    <div className="col-span-2 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{project.coordinates || "未登録"}</span>
                        {project.coordinates && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={copyCoordinates}
                          >
                            {copiedField === "coordinates" ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                      {project.coordinates && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Button variant="outline" size="sm" asChild className="h-8">
                            <a
                              href={getMappleUrl(project.coordinates) || ""}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3 mr-2" />
                              MAPPLE
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" asChild className="h-8">
                            <a
                              href={getGoogleMapsUrl(project.coordinates) || ""}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3 mr-2" />
                              Google Map
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" asChild className="h-8">
                            <a
                              href={getHazardMapUrl(project.coordinates) || ""}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3 mr-2" />
                              ハザード
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 items-start border-b pb-3">
                    <span className="text-sm font-medium text-muted-foreground">法令</span>
                    <div className="col-span-2">
                      {getLegalSearchUrl() ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8"
                          onClick={() => {
                            const url = getLegalSearchUrl();
                            if (url) {
                              const urlObj = new URL(url, window.location.origin);
                              const lat = urlObj.searchParams.get("lat");
                              const lon = urlObj.searchParams.get("lon");
                              const prefecture = urlObj.searchParams.get("prefecture");
                              if (lat && lon && prefecture) {
                                setLegalSearchParams({ lat, lon, prefecture });
                                setActiveTab("legal");
                              }
                            }
                          }}
                        >
                          <Scale className="h-3 w-3 mr-2" />
                          法令検索
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          現地住所に広島県または岡山県を含め、座標を登録すると利用できます
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 items-start border-b pb-3">
                    <span className="text-sm font-medium text-muted-foreground">地権者</span>
                    <div className="col-span-2 flex items-start gap-2">
                      <div className="space-y-1 text-sm flex-1">
                        {project.landowner1 && <div>{project.landowner1}</div>}
                        {project.landowner2 && <div>{project.landowner2}</div>}
                        {project.landowner3 && <div>{project.landowner3}</div>}
                        {!project.landowner1 && !project.landowner2 && !project.landowner3 && (
                          <span>未登録</span>
                        )}
                      </div>
                      {(project.landowner1 || project.landowner2 || project.landowner3) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={copyLandowners}
                        >
                          {copiedField === "landowners" ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 items-start border-b pb-3">
                    <span className="text-sm font-medium text-muted-foreground">地目・面積</span>
                    <div className="col-span-2 space-y-1 text-sm">
                      {(project.landCategory1 || project.landArea1) && (
                        <div className="flex items-center gap-2">
                          <span>{project.landCategory1 || "-"}</span>
                          <span className="text-muted-foreground">:</span>
                          <span>{project.landArea1 || "-"} ㎡</span>
                        </div>
                      )}
                      {(project.landCategory2 || project.landArea2) && (
                        <div className="flex items-center gap-2">
                          <span>{project.landCategory2 || "-"}</span>
                          <span className="text-muted-foreground">:</span>
                          <span>{project.landArea2 || "-"} ㎡</span>
                        </div>
                      )}
                      {(project.landCategory3 || project.landArea3) && (
                        <div className="flex items-center gap-2">
                          <span>{project.landCategory3 || "-"}</span>
                          <span className="text-muted-foreground">:</span>
                          <span>{project.landArea3 || "-"} ㎡</span>
                        </div>
                      )}
                      {!project.landCategory1 && !project.landArea1 && 
                       !project.landCategory2 && !project.landArea2 && 
                       !project.landCategory3 && !project.landArea3 && (
                        <span>未登録</span>
                      )}
                      <div className="flex items-center gap-2 pt-1 border-t mt-1">
                        <span className="font-medium">合計:</span>
                        <span className="font-medium">
                          {calculateTotalArea(
                            project.landArea1 ?? "",
                            project.landArea2 ?? "",
                            project.landArea3 ?? ""
                          )} ㎡
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={copyTotalArea}
                        >
                          {copiedField === "totalArea" ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button variant="outline" size="sm" onClick={openDetailEditDialog}>
                      <Pencil className="h-4 w-4 mr-2" />
                      詳細情報を編集
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* TODO（この日までに行うリマインダー） */}
              <Card className="mt-6">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <ListTodo className="h-4 w-4 text-muted-foreground" />
                    <h2 className="font-semibold">TODO</h2>
                  </div>
                  <form onSubmit={handleTodoSubmit} className="space-y-3">
                    <div className="flex gap-2 flex-wrap items-end">
                      <div className="flex-1 min-w-[200px] space-y-1">
                        <Label htmlFor="new-todo-content" className="text-xs text-muted-foreground">内容</Label>
                        <Textarea
                          id="new-todo-content"
                          value={newTodoContent}
                          onChange={(e) => setNewTodoContent(e.target.value)}
                          placeholder="この日までに行うことを入力..."
                          rows={2}
                          className="resize-y"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">期日</Label>
                        <Popover open={newTodoCalendarOpen} onOpenChange={setNewTodoCalendarOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "w-[180px] justify-start text-left font-normal",
                                !newTodoSelectedDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {newTodoSelectedDate
                                ? formatDateJp(newTodoSelectedDate)
                                : "期日を選択"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={newTodoSelectedDate}
                              onSelect={(date) => {
                                setNewTodoSelectedDate(date);
                                if (date) {
                                  const y = date.getFullYear();
                                  const m = String(date.getMonth() + 1).padStart(2, "0");
                                  const d = String(date.getDate()).padStart(2, "0");
                                  setNewTodoDueDate(`${y}-${m}-${d}`);
                                  setNewTodoCalendarOpen(false);
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <Button type="submit" size="default" disabled={!newTodoContent.trim() || !newTodoDueDate}>
                        追加
                      </Button>
                    </div>
                  </form>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {todos.length === 0 ? (
                      <p className="text-sm text-muted-foreground">TODOはありません</p>
                    ) : (
                      todos.map((todo) => (
                        <div
                          key={todo.id}
                          className={cn(
                            "flex items-start justify-between gap-2 p-3 rounded-lg border border-border",
                            todo.completedAt ? "bg-muted/30 opacity-90" : "bg-muted/50"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm", todo.completedAt && "line-through text-muted-foreground")}>
                              {todo.content}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              期日: {formatDateJp(new Date(todo.dueDate + "T00:00:00"))}
                              {todo.completedAt && (
                                <>
                                  {" · "}
                                  完了: {formatDateJp(new Date(todo.completedAt))}
                                </>
                              )}
                            </p>
                            {todo.completedAt && todo.completedMemo && (
                              <p className="text-xs text-muted-foreground mt-1 p-2 rounded bg-background/50">
                                {todo.completedMemo}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {todo.completedAt ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleTodoReopen(todo)}
                              >
                                再開
                              </Button>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => openTodoEditDialog(todo)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-green-600 hover:text-green-700"
                                  onClick={() => openTodoCompleteDialog(todo)}
                                  title="完了"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => handleTodoDelete(todo.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="legal" className="mt-6 space-y-6">
              <LegalSearchTab 
                searchParams={legalSearchParams}
                projectAddress={project?.address || null}
                projectCoordinates={project?.coordinates || null}
                projectLandCategories={
                  project
                    ? {
                        landCategory1: project.landCategory1 ?? null,
                        landCategory2: project.landCategory2 ?? null,
                        landCategory3: project.landCategory3 ?? null,
                      }
                    : null
                }
              />
            </TabsContent>

            <TabsContent value="comments" className="mt-6 space-y-6">
              {/* コメントフィード */}
              <div className="relative">
                <div className="mb-4 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold">コメント</h2>
                </div>
                {/* コメント投稿欄 */}
                <form onSubmit={handleCommentSubmit} className="mb-4">
                  <div className="flex gap-2">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="コメントを入力..."
                      rows={2}
                      className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={!newComment.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
                {/* コメント一覧 */}
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">コメントはありません</p>
                  ) : (
                    comments.map((comment) => (
                      <Card key={comment.id} className="bg-muted/50">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm">{comment.content}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatDateJp(new Date(comment.createdAt))}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openCommentEditDialog(comment)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => openCommentDeleteDialog(comment)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* 詳細情報編集ダイアログ */}
          <Dialog open={detailEditOpen} onOpenChange={setDetailEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>詳細情報を編集</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleDetailUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">現地住所</Label>
                  <Input
                    id="address"
                    value={detailForm.address}
                    onChange={(e) => setDetailForm({ ...detailForm, address: e.target.value })}
                    placeholder="例: 長野県..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coordinates">座標</Label>
                  <Input
                    id="coordinates"
                    value={detailForm.coordinates}
                    onChange={(e) => setDetailForm({ ...detailForm, coordinates: e.target.value })}
                    onBlur={() => {
                      const normalized = normalizeCoordinateString(detailForm.coordinates);
                      if (normalized) setDetailForm({ ...detailForm, coordinates: normalized });
                    }}
                    placeholder="例: 36.6485, 138.1942（スラッシュ区切りも可）"
                  />
                </div>
                <div className="space-y-2">
                  <Label>地権者</Label>
                  <div className="space-y-2">
                    <Input
                      value={detailForm.landowner1}
                      onChange={(e) => setDetailForm({ ...detailForm, landowner1: e.target.value })}
                      placeholder="地権者1"
                    />
                    <Input
                      value={detailForm.landowner2}
                      onChange={(e) => setDetailForm({ ...detailForm, landowner2: e.target.value })}
                      placeholder="地権者2"
                    />
                    <Input
                      value={detailForm.landowner3}
                      onChange={(e) => setDetailForm({ ...detailForm, landowner3: e.target.value })}
                      placeholder="地権者3"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>地目・土地の面積</Label>
                  <div className="space-y-2">
                    {/* 1つ目 */}
                    <div className="flex items-center gap-2">
                      <Select
                        value={detailForm.landCategory1}
                        onValueChange={(value) => setDetailForm({ ...detailForm, landCategory1: value })}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="地目" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="山林">山林</SelectItem>
                          <SelectItem value="原野">原野</SelectItem>
                          <SelectItem value="畑">畑</SelectItem>
                          <SelectItem value="田">田</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.01"
                        value={detailForm.landArea1}
                        onChange={(e) => setDetailForm({ ...detailForm, landArea1: e.target.value })}
                        placeholder="面積（㎡）"
                        className="flex-1"
                      />
                    </div>
                    {/* 2つ目 */}
                    <div className="flex items-center gap-2">
                      <Select
                        value={detailForm.landCategory2}
                        onValueChange={(value) => setDetailForm({ ...detailForm, landCategory2: value })}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="地目" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="山林">山林</SelectItem>
                          <SelectItem value="原野">原野</SelectItem>
                          <SelectItem value="畑">畑</SelectItem>
                          <SelectItem value="田">田</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.01"
                        value={detailForm.landArea2}
                        onChange={(e) => setDetailForm({ ...detailForm, landArea2: e.target.value })}
                        placeholder="面積（㎡）"
                        className="flex-1"
                      />
                    </div>
                    {/* 3つ目 */}
                    <div className="flex items-center gap-2">
                      <Select
                        value={detailForm.landCategory3}
                        onValueChange={(value) => setDetailForm({ ...detailForm, landCategory3: value })}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="地目" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="山林">山林</SelectItem>
                          <SelectItem value="原野">原野</SelectItem>
                          <SelectItem value="畑">畑</SelectItem>
                          <SelectItem value="田">田</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.01"
                        value={detailForm.landArea3}
                        onChange={(e) => setDetailForm({ ...detailForm, landArea3: e.target.value })}
                        placeholder="面積（㎡）"
                        className="flex-1"
                      />
                    </div>
                    {/* 合計 */}
                    <div className="flex justify-end items-center gap-2 pt-1 border-t">
                      <span className="text-sm">合計:</span>
                      <span className="font-medium">
                        {calculateTotalArea(detailForm.landArea1, detailForm.landArea2, detailForm.landArea3)} ㎡
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDetailEditOpen(false)}>
                    キャンセル
                  </Button>
                  <Button type="submit">
                    保存
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* コメント編集ダイアログ */}
          <Dialog open={commentEditOpen} onOpenChange={setCommentEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>コメントを編集</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCommentEditSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-comment-content">内容</Label>
                  <Textarea
                    id="edit-comment-content"
                    value={editCommentContent}
                    onChange={(e) => setEditCommentContent(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setCommentEditOpen(false)}>
                    キャンセル
                  </Button>
                  <Button type="submit" disabled={!editCommentContent.trim()}>
                    保存
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* コメント削除確認ダイアログ */}
          <AlertDialog open={commentDeleteOpen} onOpenChange={setCommentDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>コメントを削除</AlertDialogTitle>
                <AlertDialogDescription>
                  このコメントを削除しますか？
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCommentDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  削除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* TODO完了ダイアログ */}
          <Dialog open={todoCompleteOpen} onOpenChange={setTodoCompleteOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>TODOを完了</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  完了メモを残すことができます（任意）
                </p>
              </DialogHeader>
              {completingTodo && (
                <form onSubmit={handleTodoCompleteSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="complete-todo-memo">完了メモ</Label>
                    <Textarea
                      id="complete-todo-memo"
                      value={completeTodoMemo}
                      onChange={(e) => setCompleteTodoMemo(e.target.value)}
                      placeholder="完了時のメモを入力..."
                      rows={3}
                      className="resize-y"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setTodoCompleteOpen(false)}
                    >
                      キャンセル
                    </Button>
                    <Button type="submit">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      完了する
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>

          {/* TODO編集ダイアログ */}
          <Dialog open={todoEditOpen} onOpenChange={setTodoEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>TODOを編集</DialogTitle>
              </DialogHeader>
              {editingTodo && (
                <form onSubmit={handleTodoEditSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-todo-content">内容</Label>
                    <Textarea
                      id="edit-todo-content"
                      value={editTodoContent}
                      onChange={(e) => setEditTodoContent(e.target.value)}
                      placeholder="この日までに行うことを入力..."
                      rows={3}
                      className="resize-y"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>期日</Label>
                    <Popover open={editTodoCalendarOpen} onOpenChange={setEditTodoCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !editTodoSelectedDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editTodoSelectedDate
                            ? formatDateJp(editTodoSelectedDate)
                            : "期日を選択"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={editTodoSelectedDate}
                          onSelect={(date) => {
                            setEditTodoSelectedDate(date);
                            if (date) {
                              const y = date.getFullYear();
                              const m = String(date.getMonth() + 1).padStart(2, "0");
                              const d = String(date.getDate()).padStart(2, "0");
                              setEditTodoDueDate(`${y}-${m}-${d}`);
                              setEditTodoCalendarOpen(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setTodoEditOpen(false)}
                    >
                      キャンセル
                    </Button>
                    <Button type="submit" disabled={!editTodoContent.trim() || !editTodoDueDate}>
                      保存
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>

        </div>
      </div>
    </div>
  );
}
