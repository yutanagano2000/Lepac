import type { Law } from "./_types";

export const PROGRESS_TITLES = [
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

export const TEMPLATES = {
  宅地造成等工事規制区域: "宅地造成規制区域。造成の規模によっては許可申請が必要。現調結果次第で判断いたします。",
  特定盛土等規制区域: "特定盛土規制区域。造成の規模によっては届出 / 許可申請が必要。現調結果次第で判断いたします。",
};

// 土壌汚染対策法・福山市要措置区域等の対象地区（現地住所がこれらのいずれかを含む場合にアラート表示）
export const FUKUYAMA_SOIL_TARGET_DISTRICTS = [
  "瀬戸町",
  "加茂町",
  "鋼管町",
  "柳津町",
  "緑町",
  "三吉町",
  "松浜町",
] as const;
export const FUKUYAMA_SOIL_DETAIL_URL =
  "https://www.city.fukuyama.hiroshima.jp/site/kankyo/335122.html";

// 鳥獣の保護及び管理並びに狩猟の適正化に関する法律：赤アラート表示対象（広島県内）
export const HIROSHIMA_BIRD_PROTECTION_AREAS = [
  "庄原市口和町",
  "東広島市志和町",
  "福山市走島町",
  "福山市赤坂町",
  "福山市沼隈町",
  "福山市千田町",
  "三原市",
] as const;
export const HIROSHIMA_BIRD_PROTECTION_URL =
  "https://www.pref.hiroshima.lg.jp/site/huntinglicense/hunter-map.html";

export function isHiroshimaBirdProtectionArea(address: string | null): boolean {
  if (!address || !address.includes("広島県")) return false;
  return HIROSHIMA_BIRD_PROTECTION_AREAS.some((area) => address.includes(area));
}

// 担当部署にお問い合わせのアラートを表示し、検索クエリに「担当部署」を追加する法律（河川法・急傾斜地・砂防・地すべり・森林法）
export const CONTACT_DEPT_LAW_IDS = [3, 6, 7, 8, 12] as const;
export const CONTACT_DEPT_MESSAGE = "担当部署にお問い合わせください";

export function isFukuyamaSoilTargetArea(address: string | null): boolean {
  if (!address || !address.includes("福山市")) return false;
  return FUKUYAMA_SOIL_TARGET_DISTRICTS.some((d) => address.includes(d));
}

export const laws: Law[] = [
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
