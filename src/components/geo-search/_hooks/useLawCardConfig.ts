import { useMemo, useCallback } from "react";
import { parsePrefectureAndCity } from "@/lib/address";
import type { AdditionalButton } from "@/components/geo-search/LawSearchCard";
import {
  CONTACT_DEPT_LAW_IDS,
  HIROSHIMA_BIRD_PROTECTION_URL,
  isHiroshimaBirdProtectionArea,
} from "@/components/geo-search/constants";

interface LocationInfo {
  prefecture: string;
  city: string;
  fullAddress: string;
  shortAddress: string;
}

interface LawCardConfig {
  additionalButtons: AdditionalButton[];
  badges: string[];
  caption?: string;
  fixedTextWithCopy?: string;
  noteForCard?: string;
  showContactDeptAlert: boolean;
  showBirdProtectionAlert: boolean;
}

export function useLawCardConfig(
  prefecture: string,
  locationInfo: LocationInfo | null
) {
  const isOkayama = prefecture === "okayama";
  const isHiroshima = prefecture === "hiroshima";
  const address = locationInfo?.fullAddress ?? locationInfo?.shortAddress ?? null;

  // Google search handler
  const handleGoogleSearch = useCallback(
    (lawName: string, lawId?: number) => {
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
    },
    [locationInfo, prefecture]
  );

  // Get law-specific configuration
  const getLawCardConfig = useCallback(
    (lawId: number, defaultFixedText?: string): LawCardConfig => {
      const additionalButtons: AdditionalButton[] = [];
      const badges: string[] = [];
      let caption: string | undefined;
      let fixedTextWithCopy = defaultFixedText;
      let noteForCard: string | undefined;
      let showContactDeptAlert = false;
      let showBirdProtectionAlert = false;

      // Law 1: National Land Use Planning Act
      if (lawId === 1 && isOkayama) {
        additionalButtons.push({
          label: "おかやま全県統合型GIS",
          url: "https://www.gis.pref.okayama.jp/pref-okayama/PositionSelect?mid=7",
        });
      }
      if (lawId === 1 && isHiroshima && address?.includes("広島市")) {
        additionalButtons.push({
          label: "ひろしま地図ナビ",
          url: "https://www2.wagmap.jp/hiroshimacity/Portal?mid=4",
        });
      }

      // Laws 4-5: Port and Coast Laws
      if (lawId === 4 || lawId === 5) {
        fixedTextWithCopy = "対象地区ではありません。";
      }
      if (lawId === 4) {
        noteForCard = "港湾区域に関する法規制です。港湾区域の開発でない場合は該当しません。";
      }
      if (lawId === 5) {
        noteForCard = "海岸保全区域に関する法規制です。海岸保全区域の開発でない場合は該当しません。";
      }

      // Law 9: Landscape Act
      if (lawId === 9 && isOkayama && !address?.includes("井原市")) {
        caption = "岡山県は全域が景観区域です。届出対象行為はこちらで確認してください。";
      }
      if (lawId === 9) {
        const { cityName: landscapeCityName } = parsePrefectureAndCity(address);
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

      // Law 13: Cultural Properties Protection Act
      if (lawId === 13 && isOkayama) {
        additionalButtons.push({
          label: "おかやま全県統合型GIS",
          url: "https://www.gis.pref.okayama.jp/pref-okayama/PositionSelect?mid=7",
        });
      }
      if (lawId === 13 && isHiroshima) {
        additionalButtons.push({
          label: "広島県埋蔵文化財地図",
          url: "https://www.pref.hiroshima.lg.jp/site/bunkazai/bunkazai-map-map.html",
        });
      }
      if (lawId === 13) {
        noteForCard = "地図で確認してください。";
      }

      // Law 15: Natural Parks Act
      if (lawId === 15 && isOkayama) {
        additionalButtons.push({
          label: "おかやま全県統合型GIS",
          url: "https://www.gis.pref.okayama.jp/pref-okayama/PositionSelect?mid=7",
        });
      }
      if (lawId === 15 && isHiroshima) {
        additionalButtons.push({
          label: "広島県の自然公園",
          url: "https://www.pref.hiroshima.lg.jp/soshiki/47/kouikisei.html",
        });
      }
      if (lawId === 15) {
        fixedTextWithCopy = "対象地区ではありません。";
        noteForCard = "自然公園区域に関する法規制です。自然公園内の開発でない場合は該当しません。";
      }

      // Law 16: Natural Environment Conservation Act
      if (lawId === 16 && isOkayama) {
        additionalButtons.push({
          label: "自然環境保全地域",
          url: "https://www.pref.okayama.jp/page/573469.html",
        });
      }
      if (lawId === 16 && isHiroshima) {
        additionalButtons.push({
          label: "広島県の保全地域一覧",
          url: "https://www.pref.hiroshima.lg.jp/site/hiroshima-shizenkankyouhozen/",
        });
        fixedTextWithCopy = "対象地区ではありません。";
      }

      // Law 17: Endangered Species Act
      if (lawId === 17) {
        const chushikokuPrefectures = ["岡山県", "広島県", "山口県", "鳥取県", "島根県", "香川県", "愛媛県", "徳島県", "高知県"];
        const isChushikoku = locationInfo?.prefecture && chushikokuPrefectures.includes(locationInfo.prefecture);

        if (isChushikoku) {
          fixedTextWithCopy = "中国四国地方環境事務所管内には、種の保存法に基づき指定された生息地等保護区はありません。";
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

      // Law 18: Wildlife Protection Act
      if (lawId === 18) {
        if (address && isHiroshimaBirdProtectionArea(address)) {
          showBirdProtectionAlert = true;
        }
        if (isOkayama) {
          additionalButtons.push({
            label: "鳥獣保護区等位置図",
            url: "https://www.pref.okayama.jp/uploaded/life/1011233_9758897_misc.pdf",
          });
        }
        if (isHiroshima) {
          additionalButtons.push({
            label: "広島県の鳥獣保護区",
            url: HIROSHIMA_BIRD_PROTECTION_URL,
          });
        }
        if (!showBirdProtectionAlert) {
          fixedTextWithCopy = "対象地区ではありません。";
          noteForCard = "鳥獣保護区に関する法規制です。";
        }
      }

      // Law 19: Environmental Impact Assessment
      if (lawId === 19 && isHiroshima) {
        fixedTextWithCopy = "対象の面積要件は○○ha以上のため、今回は該当しません。";
        noteForCard = "上記は例文です。各都道府県の条例に沿って記入してください。";
        const { prefectureName: assessmentPrefecture } = parsePrefectureAndCity(address);
        additionalButtons.push({
          label: `${assessmentPrefecture || "広島県"}の対象事業`,
          url: "https://www.pref.hiroshima.lg.jp/site/eco/h-h2-assessment-panhu-03.html",
        });
      }
      if (lawId === 19 && isOkayama) {
        fixedTextWithCopy = "対象の面積要件は20ha以上のため、今回は該当しません。";
        noteForCard = "上記は例文です。各都道府県の条例に沿って記入してください。";
        const { prefectureName: assessmentPrefecture } = parsePrefectureAndCity(address);
        additionalButtons.push({
          label: `${assessmentPrefecture || "岡山県"}の対象事業`,
          url: "https://www.pref.okayama.jp/uploaded/life/1005026_9692062_misc.pdf",
        });
      }

      // Laws 10-11: Agricultural Land Laws
      if (lawId === 10 || lawId === 11) {
        const isOkayamaNonFarmlandArea =
          address?.includes("井原市") || address?.includes("笠岡市") || address?.includes("矢掛");
        if (isOkayamaNonFarmlandArea) {
          fixedTextWithCopy = "非農地認定済みのため不要。地目変更登記を行います。";
          caption = "井原・笠岡・矢掛の場合は非農地リストがあるので、農地であっても手続きが地目変更のみになります。";
        }
      }

      // Contact Department Alert Laws (3, 6, 7, 8, 12)
      if (CONTACT_DEPT_LAW_IDS.includes(lawId as (typeof CONTACT_DEPT_LAW_IDS)[number])) {
        showContactDeptAlert = true;
      }

      return {
        additionalButtons,
        badges,
        caption,
        fixedTextWithCopy,
        noteForCard,
        showContactDeptAlert,
        showBirdProtectionAlert,
      };
    },
    [isOkayama, isHiroshima, address, locationInfo]
  );

  return {
    getLawCardConfig,
    handleGoogleSearch,
    isOkayama,
    isHiroshima,
  };
}
