"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  parseCoordinateString,
  normalizeCoordinateString,
} from "@/lib/coordinates";
import { parsePrefectureAndCity } from "@/lib/address";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ContactDeptAlertCard } from "@/components/ContactDeptAlertCard";
import { LawAlertCard } from "@/components/LawAlertCard";
import { CheckCircle2, XCircle, Copy, Check, Loader2, ExternalLink } from "lucide-react";

interface JudgmentResult {
  宅地造成等工事規制区域: boolean;
  特定盛土等規制区域: boolean;
}

const TEMPLATES = {
  宅地造成等工事規制区域: "宅地造成規制区域。造成の規模によっては許可申請が必要。現調結果次第で判断いたします。",
  特定盛土等規制区域: "特定盛土規制区域。造成の規模によっては届出 / 許可申請が必要。現調結果次第で判断いたします。",
};

// 追加ボタンの型定義
interface AdditionalButton {
  label: string;
  url: string;
}

// 法律検索カードコンポーネント
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
  /** 注意書き（コピーアイコンなしで表示） */
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

// 法律リスト
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

// 担当部署にお問い合わせのアラートを表示し、検索クエリに「担当部署」を追加する法律（河川法・急傾斜地・砂防・地すべり・森林法）
const CONTACT_DEPT_LAW_IDS = [3, 6, 7, 8, 12] as const;
const CONTACT_DEPT_MESSAGE = "担当部署にお問い合わせください";

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

export function GeoSearchView() {
  const [coordinateInput, setCoordinateInput] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [result, setResult] = useState<JudgmentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [locationInfo, setLocationInfo] = useState<{
    prefecture: string;
    city: string;
    fullAddress: string;
    shortAddress: string;
  } | null>(null);

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

  const getLocationFromCoordinates = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=ja&addressdetails=1&zoom=18`
      );
      const data = await response.json();
      
      // デバッグ用（開発中のみ）
      console.log('Nominatim APIレスポンス:', data);
      
      const address = data.address || {};
      
      // 市名を取得（複数の階層から判定）
      const fullCityName =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        "";

      // 区名を取得（suburbやneighbourhoodから）
      const wardName =
        address.suburb ||
        address.neighbourhood ||
        "";

      // 市名の処理：区名が含まれている場合はそのまま、含まれていない場合は区名を追加
      let cityName = fullCityName;
      if (fullCityName.includes("市")) {
        // 既に区名が含まれている場合（例：「広島市安佐北区」）はそのまま使用
        if (fullCityName.includes("区")) {
          cityName = fullCityName;
        } else {
          // 「市」で終わっている場合（例：「広島市」）、区名があれば追加
          if (wardName && wardName.includes("区")) {
            cityName = fullCityName + wardName;
          } else {
            // 区名がない場合は、市名のみ（「市」で終わる部分まで）
            cityName = fullCityName.split("市")[0] + "市";
          }
        }
      }
      
      // 都道府県名を取得
      const prefectureName = address.state || address.prefecture || "";

      // 町名・エリア名（区名以外。neighbourhood/suburb に町名が入る場合がある）
      const area =
        (address.neighbourhood && !address.neighbourhood.includes("区")
          ? address.neighbourhood
          : "") ||
        (address.suburb && !address.suburb.includes("区") ? address.suburb : "") ||
        address.quarter ||
        address.hamlet ||
        address.village ||
        "";

      // 通り名・番地（Nominatimのaddressから取得）
      const road = address.road || "";
      const houseNumber = address.house_number || "";

      // 表示用の住所：address の全要素を順に結合（都道府県→市区町村→町名→通り→番地）
      const shortAddress = [prefectureName, cityName, area, road, houseNumber]
        .filter(Boolean)
        .join("");

      const fullAddress = (data.display_name || "").trim();
      
      return {
        prefecture: prefectureName,
        city: cityName,
        fullAddress,
        shortAddress,
      };
    } catch (error) {
      console.error('逆ジオコーディングエラー:', error);
      return null;
    }
  };

  // 検索実行（座標・都道府県を指定可能。未指定時は state を使用）
  const runSearch = async (override?: { lat: number; lon: number; prefecture: string }) => {
    const lat = override ? override.lat : parseFloat(latitude);
    const lon = override ? override.lon : parseFloat(longitude);
    const pref = override ? override.prefecture : prefecture;
    if (isNaN(lat) || isNaN(lon) || !pref) return;

    setHasSearched(true);
    setResult(null);
    setIsLoading(true);

    try {
      const location = await getLocationFromCoordinates(lat, lon);
      if (location) setLocationInfo(location);

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

  const handleSearch = () => runSearch();

  // URL パラメータ（案件画面から遷移時）で座標・都道府県があれば自動検索
  const searchParams = useSearchParams();
  const initialSearchDone = useRef(false);
  useEffect(() => {
    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");
    const prefectureParam = searchParams.get("prefecture");
    if (!latParam || !lonParam || !prefectureParam || initialSearchDone.current) return;
    const lat = parseFloat(latParam);
    const lon = parseFloat(lonParam);
    if (isNaN(lat) || isNaN(lon)) return;

    initialSearchDone.current = true;
    setCoordinateInput(`${latParam},${lonParam}`);
    setLatitude(latParam);
    setLongitude(lonParam);
    setPrefecture(prefectureParam);
    runSearch({ lat, lon, prefecture: prefectureParam });
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

  // Mapple URL（座標をパラメータとして渡す・案件画面と同様）
  const getMappleUrl = () => {
    if (!latitude || !longitude) return null;
    const lat = latitude.trim();
    const lng = longitude.trim();
    if (!lat || !lng || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) return null;
    return `https://labs.mapple.com/mapplexml.html#16/${lat}/${lng}`;
  };

  // Google検索関数（都道府県＋市区町村＋法律。担当部署系の法律には「担当部署」を追加）
  const handleGoogleSearch = (lawName: string, lawId?: number) => {
    const prefectureName =
      locationInfo?.prefecture ||
      (prefecture === "hiroshima" ? "広島県" : prefecture === "okayama" ? "岡山県" : "");
    const cityName = locationInfo?.city ?? "";
    const parts = [prefectureName, cityName, lawName];
    if (lawId != null && CONTACT_DEPT_LAW_IDS.includes(lawId as (typeof CONTACT_DEPT_LAW_IDS)[number])) {
      parts.push("担当部署");
    }
    const keyword = parts.filter(Boolean).join(" ");
    const encodedKeyword = encodeURIComponent(keyword);
    const searchUrl = `https://www.google.com/search?q=${encodedKeyword}`;
    window.open(searchUrl, "_blank");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      {/* 法令確認タイトル */}
      <div className="mb-8">
        <h1 className="text-4xl font-normal tracking-tight text-white">
          法令確認
        </h1>
      </div>

      {/* 検索フォーム */}
      <div className="w-full max-w-2xl space-y-4">
        {/* 入力フィールドコンテナ */}
        <div className="bg-card rounded-4xl border border-border shadow-lg p-8 space-y-6">
          {/* 座標入力（カンマ区切り） */}
          <div className="space-y-2">
            <label htmlFor="coordinate" className="text-sm font-medium text-foreground">
              座標（緯度,経度 または 緯度/経度）
            </label>
            <Input
              id="coordinate"
              type="text"
              placeholder="例: 34.580590,133.457655"
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

        {/* 現地住所表示 */}
        {locationInfo?.shortAddress && (
          <div className="bg-card rounded-4xl border border-border shadow-lg p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-semibold text-foreground mb-4">現地住所</h2>
            <div className="flex items-start gap-2 p-4 rounded-2xl bg-muted/50 border border-border">
              <p className="flex-1 text-sm text-foreground leading-relaxed">
                {locationInfo.shortAddress}
              </p>
              <button
                onClick={() => handleCopy(locationInfo.shortAddress)}
                className="shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
                title="コピー"
              >
                {copiedText === locationInfo.shortAddress ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                )}
              </button>
            </div>
            {/* 地図確認ボタン */}
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
                  `https://www.google.com/maps?q=${latitude},${longitude}`,
                  '_blank'
                )}
                className="flex-1"
              >
                Google Mapで確認
              </Button>
              {/* 岡山県の場合のみGISリンクを表示 */}
              {prefecture === "okayama" && (
                <Button
                  onClick={() => window.open('https://www.gis.pref.okayama.jp/pref-okayama/PositionSelect?mid=7', '_blank')}
                  className="flex-1"
                >
                  おかやま全県統合型GIS
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 法律検索カード一覧 */}
        {hasSearched && laws.map((law) => {
          // 各法律ごとの条件分岐
          const isOkayama = prefecture === "okayama";
          const isHiroshima = prefecture === "hiroshima";
          let additionalButtons: AdditionalButton[] = [];
          let badges: string[] = [];
          let caption: string | undefined;
          let fixedTextWithCopy = law.fixedText;
          let noteForCard: string | undefined;

          // 1. 国土利用計画法
          if (law.id === 1 && isOkayama) {
            additionalButtons.push({
              label: "おかやま全県統合型GIS",
              url: "https://www.gis.pref.okayama.jp/pref-okayama/PositionSelect?mid=7"
            });
          }
          const addressForHiroshimaCity = locationInfo?.fullAddress ?? locationInfo?.shortAddress ?? null;
          if (law.id === 1 && isHiroshima && addressForHiroshimaCity?.includes("広島市")) {
            additionalButtons.push({
              label: "ひろしま地図ナビ",
              url: "https://www2.wagmap.jp/hiroshimacity/Portal?mid=4"
            });
          }

          const addressForPortCoast = locationInfo?.fullAddress ?? locationInfo?.shortAddress ?? null;
          // 2. 港湾法
          if (law.id === 4 && isOkayama && !addressForPortCoast?.includes("井原市")) {
            fixedTextWithCopy = "港湾法第38条の２により、一定規模以上の廃棄物処理施設の建設又は改良、一定規模以上の工場又は事業場の新設や増設をする場合には、届出が必要となります。";
            badges = ["岡山港", "宇野港", "水島港", "東備港", "児島港", "笠岡港", "下津井港", "牛窓港"];
          }

          // 3. 海岸法
          if (law.id === 5 && isOkayama && !addressForPortCoast?.includes("井原市")) {
            fixedTextWithCopy = "「海岸法」に基づいて指定した一定の区域を海岸保全区域といいます。この区域内では、海岸管理者（県や市町村）が必要に応じて海岸保全施設（堤防や護岸など）を整備するほか、一定の行為（工作物の設置や土地の掘削など）については、許可が必要となる場合があります。";
            badges = ["東備港", "牛窓港", "岡山港", "山田港", "宇野港", "児島港", "下津井港", "水島港", "笠岡港", "北木島港", "鴻島港", "寒河港", "犬島港", "石島港", "松島港", "豊浦港", "前浦港", "大浦港", "大飛島港", "小飛島港"];
          }
          if ((law.id === 4 || law.id === 5) && (!isOkayama || addressForPortCoast?.includes("井原市"))) {
            fixedTextWithCopy = "対象地区ではありません。";
          }
          if (law.id === 4) {
            noteForCard = "港湾区域に関する法規制です。港湾区域の開発でない場合は該当しません。";
          }
          if (law.id === 5) {
            noteForCard = "海岸保全区域に関する法規制です。海岸保全区域の開発でない場合は該当しません。";
          }

          // 4. 景観法
          const addressForLandscape = locationInfo?.fullAddress ?? locationInfo?.shortAddress ?? null;
          if (law.id === 9 && isOkayama && !addressForLandscape?.includes("井原市")) {
            caption = "岡山県は全域が景観区域です。届出対象行為はこちらで確認してください。";
          }
          if (law.id === 9) {
            const { cityName: landscapeCityName } = parsePrefectureAndCity(addressForLandscape ?? null);
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

          // 5. 文化財保護法
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

          // 6. 自然公園法
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

          // 7. 自然環境保全法
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

          // 8. 絶滅の恐れがある野生動植物の種の保存に関する法律（常時表示）
          if (law.id === 17) {
            fixedTextWithCopy = "対象地区ではありません。";
            additionalButtons.push({
              label: "生息地等保護区",
              url: "https://www.env.go.jp/nature/kisho/hogoku/list.html"
            });
          }

          // 9. 鳥獣の保護及び管理並びに狩猟の適正化に関する法律
          const addressForBird = locationInfo?.fullAddress ?? locationInfo?.shortAddress ?? null;
          if (law.id === 18 && addressForBird && isHiroshimaBirdProtectionArea(addressForBird)) {
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

          // 10. 環境影響評価法・条例
          const addressForAssessment = locationInfo?.fullAddress ?? locationInfo?.shortAddress ?? null;
          if (law.id === 19 && isHiroshima) {
            fixedTextWithCopy = "対象の面積要件は○○ha以上のため、今回は該当しません。";
            noteForCard = "上記は例文です。各都道府県の条例に沿って記入してください。";
            const { prefectureName: assessmentPrefecture } = parsePrefectureAndCity(addressForAssessment ?? null);
            additionalButtons.push({
              label: `${assessmentPrefecture || "広島県"}の対象事業`,
              url: "https://www.pref.hiroshima.lg.jp/site/eco/h-h2-assessment-panhu-03.html"
            });
          }
          if (law.id === 19 && isOkayama) {
            fixedTextWithCopy = "対象の面積要件は20ha以上のため、今回は該当しません。";
            noteForCard = "上記は例文です。各都道府県の条例に沿って記入してください。";
            const { prefectureName: assessmentPrefecture } = parsePrefectureAndCity(addressForAssessment ?? null);
            additionalButtons.push({
              label: `${assessmentPrefecture || "岡山県"}の対象事業`,
              url: "https://www.pref.okayama.jp/uploaded/life/1005026_9692062_misc.pdf"
            });
          }

          // 農業振興地域法・農地法：井原・笠岡・矢掛の場合は非農地リストの案内
          const addressForFarmland = locationInfo?.fullAddress ?? locationInfo?.shortAddress ?? null;
          if (law.id === 10 || law.id === 11) {
            const isOkayamaNonFarmlandArea =
              addressForFarmland?.includes("井原市") ||
              addressForFarmland?.includes("笠岡市") ||
              addressForFarmland?.includes("矢掛");
            if (isOkayamaNonFarmlandArea) {
              fixedTextWithCopy = "非農地認定済みのため不要。地目変更登記を行います。";
              caption = "井原・笠岡・矢掛の場合は非農地リストがあるので、農地であっても手続きが地目変更のみになります。";
            }
          }

          // 河川法・急傾斜地・砂防・地すべり・森林法：担当部署アラートカード（黄色）
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

          return (
            <LawSearchCard
              key={law.id}
              lawName={law.name}
              lawId={law.id}
              onSearch={handleGoogleSearch}
              fixedText={fixedTextWithCopy}
              copiedText={copiedText}
              onCopy={handleCopy}
              prefecture={prefecture}
              additionalButtons={additionalButtons}
              badges={badges}
              caption={caption}
              note={noteForCard}
            />
          );
        })}

        {/* 都道府県条例カード（岡山県） */}
        {hasSearched && prefecture === "okayama" && (
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
        {hasSearched && locationInfo?.city?.includes("井原市") && (
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
                {/* 宅地造成等工事規制区域 */}
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
                  
                  {/* テンプレート文言（該当する場合のみ表示） */}
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

                {/* 特定盛土等規制区域 */}
                <div className="space-y-3">
                  {prefecture === "hiroshima" && (
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
                  
                  {/* テンプレート文言（該当する場合のみ表示） */}
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

                {/* 入力情報表示 */}
                <div className="pt-2 border-t border-border mt-4">
                  <p className="text-sm text-muted-foreground">
                    判定座標: {locationInfo?.city && `${locationInfo.city}, `}緯度 {latitude}, 経度 {longitude}
                    {locationInfo?.prefecture && ` (${locationInfo.prefecture})`}
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


        {/* 説明テキスト */}
        <p className="text-center text-sm text-muted-foreground">
          座標と都道府県を入力して、工事に関連する法令を検索します。
        </p>
      </div>
    </div>
  );
}
