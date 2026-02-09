import { parsePrefectureAndCity } from "@/lib/address";
import type { AdditionalButton, Law, LegalStatuses } from "../../_types";
import {
  FUKUYAMA_SOIL_DETAIL_URL,
  HIROSHIMA_BIRD_PROTECTION_URL,
  CONTACT_DEPT_LAW_IDS,
  CONTACT_DEPT_MESSAGE,
  isHiroshimaBirdProtectionArea,
  isFukuyamaSoilTargetArea,
} from "../../_constants";

// 法令IDの定数
const LAW_ID = {
  LAND_USE: 1,
  RIVER: 3,
  PORT: 4,
  COAST: 5,
  STEEP_SLOPE: 6,
  EROSION: 7,
  LANDSLIDE: 8,
  LANDSCAPE: 9,
  AGRICULTURE_ZONE: 10,
  AGRICULTURAL_LAND: 11,
  FOREST: 12,
  CULTURAL_PROPERTY: 13,
  SOIL_POLLUTION: 14,
  NATURAL_PARK: 15,
  NATURE_CONSERVATION: 16,
  ENDANGERED_SPECIES: 17,
  WILDLIFE_PROTECTION: 18,
  ENVIRONMENTAL_ASSESSMENT: 19,
  FIRE_PREVENTION: 20,
  VIBRATION: 21,
  ROAD: 22,
  WASTE: 23,
} as const;

// 「対象地区ではありません」ボタンを非表示にする法令ID
const HIDE_NOT_APPLICABLE_LAW_IDS = [
  LAW_ID.FIRE_PREVENTION,
  LAW_ID.VIBRATION,
  LAW_ID.ROAD,
  LAW_ID.WASTE,
];

interface LawCardConfig {
  additionalButtons: AdditionalButton[];
  badges: string[];
  caption?: string;
  fixedText?: string;
  note?: string;
  farmlandAlert: boolean;
  hideNotApplicableButton: boolean;
  specialAlert?: {
    type: "bird-protection" | "soil-pollution";
    title: string;
    message: string;
    detailUrl: string;
    variant?: "red";
  };
}

interface GetLawCardConfigParams {
  law: Law;
  isOkayama: boolean;
  isHiroshima: boolean;
  projectAddress: string | null;
  projectLandCategories?: {
    landCategory1: string | null;
    landCategory2: string | null;
    landCategory3: string | null;
  } | null;
}

export function getLawCardConfig({
  law,
  isOkayama,
  isHiroshima,
  projectAddress,
  projectLandCategories,
}: GetLawCardConfigParams): LawCardConfig {
  const additionalButtons: AdditionalButton[] = [];
  const badges: string[] = [];
  let caption: string | undefined;
  let fixedText = law.fixedText;
  let note: string | undefined;
  let farmlandAlert = false;
  let specialAlert: LawCardConfig["specialAlert"] | undefined;

  // 国土利用計画法
  if (law.id === LAW_ID.LAND_USE) {
    if (isOkayama) {
      additionalButtons.push({
        label: "おかやま全県統合型GIS",
        url: "https://www.gis.pref.okayama.jp/pref-okayama/PositionSelect?mid=7"
      });
    }
    if (isHiroshima && projectAddress?.includes("広島市")) {
      additionalButtons.push({
        label: "ひろしま地図ナビ",
        url: "https://www2.wagmap.jp/hiroshimacity/Portal?mid=4"
      });
    }
  }

  // 港湾法
  if (law.id === LAW_ID.PORT) {
    fixedText = "対象地区ではありません。";
    note = "港湾区域に関する法規制です。港湾区域の開発でない場合は該当しません。";
  }

  // 海岸法
  if (law.id === LAW_ID.COAST) {
    note = "海岸保全区域に関する法規制です。海岸保全区域の開発でない場合は該当しません。";
  }

  // 景観法
  if (law.id === LAW_ID.LANDSCAPE) {
    if (isOkayama && !projectAddress?.includes("井原市")) {
      caption = "岡山県は全域が景観区域です。届出対象行為はこちらで確認してください。";
    }
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
    fixedText = "要件に該当しないため、届出不要です。";
    note = "開発面積や工作物の高さが一般的な要件です。各都道府県の法令を確認してください。";
  }

  // 農業振興地域法・農地法
  if (law.id === LAW_ID.AGRICULTURE_ZONE || law.id === LAW_ID.AGRICULTURAL_LAND) {
    const isOkayamaNonFarmlandArea =
      projectAddress?.includes("井原市") ||
      projectAddress?.includes("笠岡市") ||
      projectAddress?.includes("矢掛");
    if (isOkayamaNonFarmlandArea) {
      fixedText = "非農地認定済みのため不要。地目変更登記を行います。";
      caption = "井原・笠岡・矢掛の場合は非農地リストがあるので、農地であっても手続きが地目変更のみになります。";
    } else {
      const cats = [
        projectLandCategories?.landCategory1 ?? null,
        projectLandCategories?.landCategory2 ?? null,
        projectLandCategories?.landCategory3 ?? null,
      ].filter((c): c is string => !!c);
      const hasFarmland = cats.some((c) => c === "田" || c === "畑");
      if (cats.length > 0 && hasFarmland) {
        farmlandAlert = true;
      }
      if (cats.length > 0 && !hasFarmland) {
        fixedText = "農地ではないため該当しません。";
        note = "地目が正しく登録されていることを確認してください";
      }
    }
  }

  // 文化財保護法
  if (law.id === LAW_ID.CULTURAL_PROPERTY) {
    if (isOkayama) {
      additionalButtons.push({
        label: "おかやま全県統合型GIS",
        url: "https://www.gis.pref.okayama.jp/pref-okayama/PositionSelect?mid=7"
      });
    }
    if (isHiroshima) {
      additionalButtons.push({
        label: "広島県埋蔵文化財地図",
        url: "https://www.pref.hiroshima.lg.jp/site/bunkazai/bunkazai-map-map.html"
      });
    }
    note = "地図で確認してください。";
  }

  // 土壌汚染対策法
  if (law.id === LAW_ID.SOIL_POLLUTION) {
    if (projectAddress && isFukuyamaSoilTargetArea(projectAddress)) {
      specialAlert = {
        type: "soil-pollution",
        title: "土壌汚染対策法",
        message: "土壌汚染対策法の対象区域の可能性があります。",
        detailUrl: FUKUYAMA_SOIL_DETAIL_URL,
      };
    }
    fixedText = "対象地区ではありません。";
  }

  // 自然公園法
  if (law.id === LAW_ID.NATURAL_PARK) {
    if (isOkayama) {
      additionalButtons.push({
        label: "おかやま全県統合型GIS",
        url: "https://www.gis.pref.okayama.jp/pref-okayama/PositionSelect?mid=7"
      });
    }
    if (isHiroshima) {
      additionalButtons.push({
        label: "広島県の自然公園",
        url: "https://www.pref.hiroshima.lg.jp/soshiki/47/kouikisei.html"
      });
    }
    note = "自然公園区域に関する法規制です。自然公園内の開発でない場合は該当しません。";
  }

  // 自然環境保全法
  if (law.id === LAW_ID.NATURE_CONSERVATION) {
    if (isOkayama) {
      additionalButtons.push({
        label: "自然環境保全地域",
        url: "https://www.pref.okayama.jp/page/573469.html"
      });
    }
    if (isHiroshima) {
      additionalButtons.push({
        label: "広島県の保全地域一覧",
        url: "https://www.pref.hiroshima.lg.jp/site/hiroshima-shizenkankyouhozen/"
      });
    }
  }

  // 種の保存法
  if (law.id === LAW_ID.ENDANGERED_SPECIES) {
    const chushikokuPrefectures = ["岡山県", "広島県", "山口県", "鳥取県", "島根県", "香川県", "愛媛県", "徳島県", "高知県"];
    const { prefectureName: speciesPrefecture } = parsePrefectureAndCity(projectAddress);
    const isChushikoku = speciesPrefecture && chushikokuPrefectures.includes(speciesPrefecture);

    if (isChushikoku) {
      fixedText = "中国四国地方環境事務所管内には、種の保存法に基づき指定された生息地等保護区はありません。";
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

  // 鳥獣保護法
  if (law.id === LAW_ID.WILDLIFE_PROTECTION) {
    if (projectAddress && isHiroshimaBirdProtectionArea(projectAddress)) {
      specialAlert = {
        type: "bird-protection",
        title: law.name,
        message: "鳥獣保護区に該当する可能性があります",
        detailUrl: HIROSHIMA_BIRD_PROTECTION_URL,
        variant: "red",
      };
    }
    if (isOkayama) {
      additionalButtons.push({
        label: "鳥獣保護区等位置図",
        url: "https://www.pref.okayama.jp/uploaded/life/1011233_9758897_misc.pdf"
      });
    }
    if (isHiroshima) {
      additionalButtons.push({
        label: "広島県の鳥獣保護区",
        url: HIROSHIMA_BIRD_PROTECTION_URL
      });
    }
    note = "鳥獣保護区に関する法規制です。";
  }

  // 環境影響評価法
  if (law.id === LAW_ID.ENVIRONMENTAL_ASSESSMENT) {
    const { prefectureName: assessmentPrefecture } = parsePrefectureAndCity(projectAddress ?? null);
    if (isHiroshima) {
      fixedText = "対象の面積要件は○○ha以上のため、今回は該当しません。";
      note = "上記は例文です。各都道府県の条例に沿って記入してください。";
      additionalButtons.push({
        label: `${assessmentPrefecture || "広島県"}の対象事業`,
        url: "https://www.pref.hiroshima.lg.jp/site/eco/h-h2-assessment-panhu-03.html"
      });
    }
    if (isOkayama) {
      fixedText = "対象の面積要件は20ha以上のため、今回は該当しません。";
      note = "上記は例文です。各都道府県の条例に沿って記入してください。";
      additionalButtons.push({
        label: `${assessmentPrefecture || "岡山県"}の対象事業`,
        url: "https://www.pref.okayama.jp/uploaded/life/1005026_9692062_misc.pdf"
      });
    }
  }

  // 担当部署にお問い合わせが必要な法令
  if (CONTACT_DEPT_LAW_IDS.includes(law.id as (typeof CONTACT_DEPT_LAW_IDS)[number])) {
    caption = CONTACT_DEPT_MESSAGE;
  }

  const hideNotApplicableButton = (HIDE_NOT_APPLICABLE_LAW_IDS as readonly number[]).includes(law.id);

  return {
    additionalButtons,
    badges,
    caption,
    fixedText,
    note,
    farmlandAlert,
    hideNotApplicableButton,
    specialAlert,
  };
}
