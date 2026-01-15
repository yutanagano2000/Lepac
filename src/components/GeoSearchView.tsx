"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Copy, Check } from "lucide-react";

interface JudgmentResult {
  宅地造成等工事規制区域: boolean;
  特定盛土等規制区域: boolean;
}

const TEMPLATES = {
  宅地造成等工事規制区域: "宅地造成規制区域。造成の規模によっては許可申請が必要。現調結果次第で判断いたします。",
  特定盛土等規制区域: "特定盛土規制区域。造成の規模によっては届出 / 許可申請が必要。現調結果次第で判断いたします。",
};

// 法律検索カードコンポーネント
interface LawSearchCardProps {
  lawName: string;
  onSearch: (lawName: string) => void;
}

const LawSearchCard: React.FC<LawSearchCardProps> = ({ lawName, onSearch }) => {
  return (
    <div className="bg-card rounded-4xl border border-border shadow-lg p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-medium text-foreground">{lawName}</p>
        </div>
        <Button onClick={() => onSearch(lawName)}>
          Googleで検索
        </Button>
      </div>
    </div>
  );
};

// 法律リスト
interface Law {
  id: number;
  name: string;
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
  { id: 20, name: "消防法" },
  { id: 21, name: "振動規制法" },
  { id: 22, name: "道路法" },
  { id: 23, name: "廃棄物の処理及び清掃に関する法律" },
];

export function GeoSearchView() {
  const [coordinateInput, setCoordinateInput] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [result, setResult] = useState<JudgmentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [locationInfo, setLocationInfo] = useState<{
    prefecture: string;
    city: string;
    fullAddress: string;
    shortAddress: string;
  } | null>(null);

  // カンマ区切り座標を解析する関数
  const handleCoordinateInput = (value: string) => {
    setCoordinateInput(value);
    
    // カンマで分割
    const parts = value.split(',').map(part => part.trim());
    
    if (parts.length === 2) {
      const [lat, lon] = parts;
      // 数値として有効かチェック
      if (!isNaN(parseFloat(lat)) && !isNaN(parseFloat(lon))) {
        setLatitude(lat);
        setLongitude(lon);
      } else {
        // 無効な場合はクリア
        setLatitude("");
        setLongitude("");
      }
    } else {
      // カンマが1つでない場合はクリア
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

      const cityName = fullCityName.includes("市")
        ? fullCityName.split("市")[0] + "市"
        : fullCityName;
      
      // 都道府県名を取得
      const prefectureName = address.state || address.prefecture || "";

      // 町名・エリア名（あれば）
      const area =
        address.suburb ||
        address.neighbourhood ||
        address.quarter ||
        address.hamlet ||
        address.village ||
        "";

      // 表示用の短い住所（郵便番号や国名は含めない）
      const shortAddress = [prefectureName, cityName, area].filter(Boolean).join("");

      // 番地まで含むフル住所（必要なら保持）
      const fullAddress = data.display_name || "";
      
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

  const handleSearch = async () => {
    setIsLoading(true);
    
    try {
      // 座標から都道府県・市を取得
      const location = await getLocationFromCoordinates(
        parseFloat(latitude),
        parseFloat(longitude)
      );
      
      if (location) {
        setLocationInfo(location);
      }

      // 既存の判定API呼び出し
      const response = await fetch("https://geo-checker-backend-aj4j.onrender.com/api/v1/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          prefecture: prefecture,
        }),
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

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      console.error("コピーに失敗しました:", error);
    }
  };

  // Google検索関数（再利用可能）
  const handleGoogleSearch = (lawName: string) => {
    const prefectureName = prefecture === "hiroshima" ? "広島県" : prefecture === "okayama" ? "岡山県" : "";
    const cityName = locationInfo?.city || "";
    const keyword = `${prefectureName}　${cityName}　${lawName}`;
    const encodedKeyword = encodeURIComponent(keyword);
    const searchUrl = `https://www.google.com/search?q=${encodedKeyword}`;
    window.open(searchUrl, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      {/* Lepacロゴ */}
      <div className="mb-8">
        <h1 className="text-7xl font-normal tracking-tight text-white">
          Lepac
        </h1>
      </div>

      {/* 検索フォーム */}
      <div className="w-full max-w-2xl space-y-4">
        {/* 入力フィールドコンテナ */}
        <div className="bg-card rounded-4xl border border-border shadow-lg p-8 space-y-6">
          {/* 座標入力（カンマ区切り） */}
          <div className="space-y-2">
            <label htmlFor="coordinate" className="text-sm font-medium text-foreground">
              座標（緯度,経度）
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
              緯度と経度をカンマ区切りで入力してください
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
            <div className="flex gap-2">
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
        {result && laws.map((law) => (
          <LawSearchCard
            key={law.id}
            lawName={law.name}
            onSearch={handleGoogleSearch}
          />
        ))}

        {/* 判定結果表示 */}
        {result && (
          <div className="bg-card rounded-4xl border border-border shadow-lg p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-semibold text-foreground mb-4">判定結果</h2>
            
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
          </div>
        )}


        {/* 規制区域図のリンクを表示 */}
        {result && (prefecture === "okayama" || prefecture === "hiroshima") && (
          <div className="bg-card rounded-4xl border border-border shadow-lg p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {prefecture === "hiroshima" ? "広島県" : "岡山県"} 規制区域図
                </h3>
                <p className="text-sm text-muted-foreground">
                  詳細な規制区域図は{prefecture === "hiroshima" ? "広島県" : "岡山県"}の公式ページでご確認ください
                </p>
              </div>
              <Button
                onClick={() => window.open(
                  prefecture === "hiroshima" 
                    ? 'https://www.pref.hiroshima.lg.jp/soshiki/262/moridokeihatsu.html'
                    : 'https://www.pref.okayama.jp/page/915358.html',
                  '_blank'
                )}
              >
                規制区域図を見る
              </Button>
            </div>
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
