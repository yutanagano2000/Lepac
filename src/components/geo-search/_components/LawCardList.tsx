"use client";

import { parsePrefectureAndCity } from "@/lib/address";
import { ContactDeptAlertCard } from "@/components/ContactDeptAlertCard";
import { LawAlertCard } from "@/components/LawAlertCard";
import { Button } from "@/components/ui/button";
import type { LocationInfo, AdditionalButton } from "../_types";
import {
  LAWS,
  CONTACT_DEPT_LAW_IDS,
  CONTACT_DEPT_MESSAGE,
  HIROSHIMA_BIRD_PROTECTION_URL,
  CHUSHIKOKU_PREFECTURES,
  isHiroshimaBirdProtectionArea,
} from "../_constants";
import { LawSearchCard } from "./LawSearchCard";

interface LawCardListProps {
  prefecture: string;
  locationInfo: LocationInfo | null;
  copiedText: string | null;
  onCopy: (text: string) => void;
  onGoogleSearch: (lawName: string, lawId?: number) => void;
}

export function LawCardList({
  prefecture,
  locationInfo,
  copiedText,
  onCopy,
  onGoogleSearch,
}: LawCardListProps) {
  const isOkayama = prefecture === "okayama";
  const isHiroshima = prefecture === "hiroshima";
  const address = locationInfo?.fullAddress ?? locationInfo?.shortAddress ?? null;

  return (
    <>
      {LAWS.map((law) => {
        let additionalButtons: AdditionalButton[] = [];
        let caption: string | undefined;
        let fixedTextWithCopy = law.fixedText;
        let noteForCard: string | undefined;

        // 1. 国土利用計画法
        if (law.id === 1 && isOkayama) {
          additionalButtons.push({
            label: "おかやま全県統合型GIS",
            url: "https://www.gis.pref.okayama.jp/pref-okayama/PositionSelect?mid=7",
          });
        }
        if (law.id === 1 && isHiroshima && address?.includes("広島市")) {
          additionalButtons.push({
            label: "ひろしま地図ナビ",
            url: "https://www2.wagmap.jp/hiroshimacity/Portal?mid=4",
          });
        }

        // 2. 港湾法
        if (law.id === 4) {
          fixedTextWithCopy = "対象地区ではありません。";
          noteForCard = "港湾区域に関する法規制です。港湾区域の開発でない場合は該当しません。";
        }

        // 3. 海岸法
        if (law.id === 5) {
          fixedTextWithCopy = "対象地区ではありません。";
          noteForCard = "海岸保全区域に関する法規制です。海岸保全区域の開発でない場合は該当しません。";
        }

        // 4. 景観法
        if (law.id === 9 && isOkayama && !address?.includes("井原市")) {
          caption = "岡山県は全域が景観区域です。届出対象行為はこちらで確認してください。";
        }
        if (law.id === 9) {
          const { cityName: landscapeCityName } = parsePrefectureAndCity(address ?? null);
          if (landscapeCityName) {
            const landscapeButtonUrl = isOkayama
              ? "https://www.pref.okayama.jp/uploaded/attachment/325065.pdf"
              : "https://www.city.fukuyama.hiroshima.jp/uploaded/attachment/130060.pdf";
            additionalButtons.push({
              label: `${landscapeCityName}の届出対象行為`,
              url: landscapeButtonUrl,
            });
          }
          fixedTextWithCopy = "要件に該当しないため、届出不要です。";
          noteForCard = "開発面積や工作物の高さが一般的な要件です。各都道府県の法令を確認してください。";
        }

        // 5. 文化財保護法
        if (law.id === 13 && isOkayama) {
          additionalButtons.push({
            label: "おかやま全県統合型GIS",
            url: "https://www.gis.pref.okayama.jp/pref-okayama/PositionSelect?mid=7",
          });
        }
        if (law.id === 13 && isHiroshima) {
          additionalButtons.push({
            label: "広島県埋蔵文化財地図",
            url: "https://www.pref.hiroshima.lg.jp/site/bunkazai/bunkazai-map-map.html",
          });
        }
        if (law.id === 13) {
          noteForCard = "地図で確認してください。";
        }

        // 6. 自然公園法
        if (law.id === 15 && isOkayama) {
          additionalButtons.push({
            label: "おかやま全県統合型GIS",
            url: "https://www.gis.pref.okayama.jp/pref-okayama/PositionSelect?mid=7",
          });
        }
        if (law.id === 15 && isHiroshima) {
          additionalButtons.push({
            label: "広島県の自然公園",
            url: "https://www.pref.hiroshima.lg.jp/soshiki/47/kouikisei.html",
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
            url: "https://www.pref.okayama.jp/page/573469.html",
          });
        }
        if (law.id === 16 && isHiroshima) {
          additionalButtons.push({
            label: "広島県の保全地域一覧",
            url: "https://www.pref.hiroshima.lg.jp/site/hiroshima-shizenkankyouhozen/",
          });
          fixedTextWithCopy = "対象地区ではありません。";
        }

        // 8. 絶滅の恐れがある野生動植物の種の保存に関する法律
        if (law.id === 17) {
          const isChushikoku =
            locationInfo?.prefecture &&
            CHUSHIKOKU_PREFECTURES.includes(locationInfo.prefecture);

          if (isChushikoku) {
            fixedTextWithCopy =
              "中国四国地方環境事務所管内には、種の保存法に基づき指定された生息地等保護区はありません。";
            additionalButtons.push({
              label: "参照リンク",
              url: "https://chushikoku.env.go.jp/procure/page_00068.html",
            });
          } else {
            fixedTextWithCopy = "対象地区ではありません。";
          }
          additionalButtons.push({
            label: "生息地等保護区",
            url: "https://www.env.go.jp/nature/kisho/hogoku/list.html",
          });
        }

        // 9. 鳥獣の保護及び管理並びに狩猟の適正化に関する法律
        if (law.id === 18 && address && isHiroshimaBirdProtectionArea(address)) {
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
            url: "https://www.pref.okayama.jp/uploaded/life/1011233_9758897_misc.pdf",
          });
        }
        if (law.id === 18 && isHiroshima) {
          additionalButtons.push({
            label: "広島県の鳥獣保護区",
            url: HIROSHIMA_BIRD_PROTECTION_URL,
          });
        }
        if (law.id === 18) {
          fixedTextWithCopy = "対象地区ではありません。";
          noteForCard = "鳥獣保護区に関する法規制です。";
        }

        // 10. 環境影響評価法・条例
        if (law.id === 19 && isHiroshima) {
          fixedTextWithCopy = "対象の面積要件は○○ha以上のため、今回は該当しません。";
          noteForCard = "上記は例文です。各都道府県の条例に沿って記入してください。";
          const { prefectureName: assessmentPrefecture } = parsePrefectureAndCity(
            address ?? null
          );
          additionalButtons.push({
            label: `${assessmentPrefecture || "広島県"}の対象事業`,
            url: "https://www.pref.hiroshima.lg.jp/site/eco/h-h2-assessment-panhu-03.html",
          });
        }
        if (law.id === 19 && isOkayama) {
          fixedTextWithCopy = "対象の面積要件は20ha以上のため、今回は該当しません。";
          noteForCard = "上記は例文です。各都道府県の条例に沿って記入してください。";
          const { prefectureName: assessmentPrefecture } = parsePrefectureAndCity(
            address ?? null
          );
          additionalButtons.push({
            label: `${assessmentPrefecture || "岡山県"}の対象事業`,
            url: "https://www.pref.okayama.jp/uploaded/life/1005026_9692062_misc.pdf",
          });
        }

        // 農業振興地域法・農地法
        if (law.id === 10 || law.id === 11) {
          const isOkayamaNonFarmlandArea =
            address?.includes("井原市") ||
            address?.includes("笠岡市") ||
            address?.includes("矢掛");
          if (isOkayamaNonFarmlandArea) {
            fixedTextWithCopy = "非農地認定済みのため不要。地目変更登記を行います。";
            caption =
              "井原・笠岡・矢掛の場合は非農地リストがあるので、農地であっても手続きが地目変更のみになります。";
          }
        }

        // 河川法・急傾斜地・砂防・地すべり・森林法
        if (
          CONTACT_DEPT_LAW_IDS.includes(law.id as (typeof CONTACT_DEPT_LAW_IDS)[number])
        ) {
          return (
            <ContactDeptAlertCard
              key={law.id}
              title={law.name}
              message={CONTACT_DEPT_MESSAGE}
              onSearch={onGoogleSearch}
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
            onSearch={onGoogleSearch}
            fixedText={fixedTextWithCopy}
            copiedText={copiedText}
            onCopy={onCopy}
            prefecture={prefecture}
            additionalButtons={additionalButtons}
            badges={[]}
            caption={caption}
            note={noteForCard}
          />
        );
      })}
    </>
  );
}

// 条例カード群コンポーネント
interface OrdinanceCardsProps {
  prefecture: string;
  locationInfo: LocationInfo | null;
}

export function OrdinanceCards({ prefecture, locationInfo }: OrdinanceCardsProps) {
  return (
    <>
      {/* ○○県の太陽光に関する条例 */}
      {locationInfo?.prefecture && (
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
                const query = encodeURIComponent(
                  `${locationInfo.prefecture}　太陽光　条例`
                );
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
              <p className="font-medium text-foreground">
                岡山県太陽光発電施設の安全な導入を促進する条例
              </p>
            </div>
            <Button
              onClick={() =>
                window.open("https://www.pref.okayama.jp/page/619095.html", "_blank")
              }
              className="shrink-0 ml-4"
            >
              Googleで検索
            </Button>
          </div>
        </div>
      )}

      {/* 市区町村条例カード（井原市） */}
      {locationInfo?.city?.includes("井原市") && (
        <div className="bg-card rounded-4xl border border-border shadow-lg p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-xl font-semibold text-foreground mb-4">市区町村条例</h2>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium text-foreground">
                井原市開発事業の調整に関する条例
              </p>
            </div>
            <Button
              onClick={() =>
                window.open(
                  "https://www.city.ibara.okayama.jp/soshiki/3/1214.html",
                  "_blank"
                )
              }
              className="shrink-0 ml-4"
            >
              Googleで検索
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
