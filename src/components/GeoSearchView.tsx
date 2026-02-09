"use client";

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
import { LawSearchCard } from "@/components/geo-search/LawSearchCard";
import {
  TEMPLATES,
  laws,
  CONTACT_DEPT_MESSAGE,
  HIROSHIMA_BIRD_PROTECTION_URL,
} from "@/components/geo-search/constants";
import { useGeoSearch, useLawCardConfig } from "@/components/geo-search/_hooks";

export function GeoSearchView() {
  const {
    coordinateInput,
    latitude,
    longitude,
    prefecture,
    result,
    isLoading,
    hasSearched,
    copiedText,
    locationInfo,
    setPrefecture,
    handleCoordinateInput,
    handleSearch,
    handleCopy,
    getMappleUrl,
  } = useGeoSearch();

  const { getLawCardConfig, handleGoogleSearch, isOkayama, isHiroshima } = useLawCardConfig(
    prefecture,
    locationInfo
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-4xl font-normal tracking-tight text-white">
          法令確認
        </h1>
      </div>

      {/* Search Form */}
      <div className="w-full max-w-2xl space-y-4">
        <div className="bg-card rounded-4xl border border-border shadow-lg p-8 space-y-6">
          {/* Coordinate Input */}
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

          {/* Prefecture Select */}
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

          {/* Search Button */}
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

        {/* Location Address Display */}
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
            {/* Map Buttons */}
            <div className="flex flex-wrap gap-2">
              {getMappleUrl() && (
                <Button variant="outline" size="sm" asChild className="h-9">
                  <a href={getMappleUrl() ?? ""} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-2" />
                    MAPPLE
                  </a>
                </Button>
              )}
              <Button
                onClick={() => window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, "_blank")}
                className="flex-1"
              >
                Google Mapで確認
              </Button>
              {isOkayama && (
                <Button
                  onClick={() => window.open("https://www.gis.pref.okayama.jp/pref-okayama/PositionSelect?mid=7", "_blank")}
                  className="flex-1"
                >
                  おかやま全県統合型GIS
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Law Search Cards */}
        {hasSearched &&
          laws.map((law) => {
            const config = getLawCardConfig(law.id, law.fixedText);

            if (config.showBirdProtectionAlert) {
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

            if (config.showContactDeptAlert) {
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
                fixedText={config.fixedTextWithCopy}
                copiedText={copiedText}
                onCopy={handleCopy}
                prefecture={prefecture}
                additionalButtons={config.additionalButtons}
                badges={config.badges}
                caption={config.caption}
                note={config.noteForCard}
              />
            );
          })}

        {/* Prefecture Solar Ordinance */}
        {hasSearched && locationInfo?.prefecture && (
          <div className="bg-card rounded-4xl border border-border shadow-lg p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              {locationInfo.prefecture}の太陽光に関する条例
            </h2>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {locationInfo.prefecture}の太陽光発電に関する条例を検索
                </p>
              </div>
              <Button
                onClick={() => {
                  const query = encodeURIComponent(`${locationInfo.prefecture}　太陽光　条例`);
                  window.open(`https://www.google.com/search?q=${query}`, "_blank");
                }}
                className="shrink-0 ml-4"
              >
                Googleで検索
              </Button>
            </div>
          </div>
        )}

        {/* Okayama Prefecture Ordinance */}
        {hasSearched && isOkayama && (
          <div className="bg-card rounded-4xl border border-border shadow-lg p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-semibold text-foreground mb-4">都道府県条例</h2>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  岡山県太陽光発電施設の安全な導入を促進する条例
                </p>
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

        {/* Ibara City Ordinance */}
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

        {/* Judgment Results */}
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
                {/* Residential Land Development Regulation Area */}
                <JudgmentResultItem
                  label="宅地造成等工事規制区域"
                  isMatch={result.宅地造成等工事規制区域}
                  template={TEMPLATES.宅地造成等工事規制区域}
                  copiedText={copiedText}
                  onCopy={handleCopy}
                />

                {/* Specific Fill Regulation Area */}
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
                  <JudgmentResultItem
                    label="特定盛土等規制区域"
                    isMatch={result.特定盛土等規制区域}
                    template={TEMPLATES.特定盛土等規制区域}
                    copiedText={copiedText}
                    onCopy={handleCopy}
                  />
                </div>

                {/* Input Info Display */}
                <div className="pt-2 border-t border-border mt-4">
                  <p className="text-sm text-muted-foreground">
                    判定座標: {locationInfo?.city && `${locationInfo.city}, `}緯度 {latitude}, 経度{" "}
                    {longitude}
                    {locationInfo?.prefecture && ` (${locationInfo.prefecture})`}
                  </p>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">判定結果がありません</div>
            )}
          </div>
        )}

        {/* Description */}
        <p className="text-center text-sm text-muted-foreground">
          座標と都道府県を入力して、工事に関連する法令を検索します。
        </p>
      </div>
    </div>
  );
}

// Judgment Result Item Component
function JudgmentResultItem({
  label,
  isMatch,
  template,
  copiedText,
  onCopy,
}: {
  label: string;
  isMatch: boolean;
  template: string;
  copiedText: string | null;
  onCopy: (text: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border">
        <div className="flex-1">
          <p className="font-medium text-foreground">{label}</p>
        </div>
        <div className="flex items-center gap-2">
          {isMatch ? (
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

      {isMatch && (
        <div className="flex items-start gap-2 p-4 rounded-2xl bg-muted/50 border border-border">
          <p className="flex-1 text-sm text-foreground leading-relaxed">{template}</p>
          <button
            onClick={() => onCopy(template)}
            className="shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
            title="コピー"
          >
            {copiedText === template ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
