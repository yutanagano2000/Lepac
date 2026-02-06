/**
 * 法令自動チェックロジック
 *
 * Phase 1: reinfolib API（座標ベース） - 都市計画法, 自然公園法
 * Phase 2: 住所/地目/固定テキスト - 消防法, 振動規制法, 道路法, 廃棄物処理法, 土壌汚染対策法, 鳥獣保護法, 農振法, 農地法
 * Phase 3: 残り法令 - 「要確認」+ 参照リンク
 */

// ---------- Types ----------

export interface LegalCheckInput {
  lat: number;
  lon: number;
  address: string | null;
  landCategories: string[]; // 地目1〜3のリスト（nullは除外済み）
}

export interface LegalCheckResultItem {
  status: "該当" | "非該当" | "要確認";
  note: string;
  confirmationMethod?: "WEB" | "";
  confirmationSource?: string;
}

export type LegalCheckResults = Record<string, LegalCheckResultItem>;

// ---------- Tile coordinate conversion ----------

/** 緯度経度 → タイル座標 (z/x/y) 変換 */
export function latLonToTile(
  lat: number,
  lon: number,
  zoom: number
): { x: number; y: number; z: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y, z: zoom };
}

// ---------- Point-in-polygon (ray casting) ----------

type Coord = [number, number]; // [lon, lat]

/** 簡易 ray-casting で点がポリゴン内かどうか判定 */
export function pointInPolygon(
  point: Coord,
  polygon: Coord[]
): boolean {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** GeoJSON FeatureCollection 内のいずれかの Feature に点が含まれるか判定 */
function pointInGeoJsonFeatures(
  lon: number,
  lat: number,
  features: GeoJsonFeature[]
): GeoJsonFeature | null {
  const point: Coord = [lon, lat];
  for (const feature of features) {
    const geom = feature.geometry;
    if (!geom) continue;
    if (geom.type === "Polygon") {
      for (const ring of geom.coordinates as Coord[][]) {
        if (pointInPolygon(point, ring)) return feature;
      }
    } else if (geom.type === "MultiPolygon") {
      for (const polygon of geom.coordinates as Coord[][][]) {
        for (const ring of polygon) {
          if (pointInPolygon(point, ring)) return feature;
        }
      }
    }
  }
  return null;
}

// ---------- reinfolib API ----------

interface GeoJsonGeometry {
  type: string;
  coordinates: unknown;
}

interface GeoJsonFeature {
  type: string;
  geometry: GeoJsonGeometry;
  properties: Record<string, unknown>;
}

interface GeoJsonFeatureCollection {
  type: string;
  features: GeoJsonFeature[];
}

/** reinfolib API からデータを取得 */
async function fetchReinfolibData(
  apiCode: string,
  x: number,
  y: number,
  z: number,
  apiKey: string
): Promise<GeoJsonFeatureCollection | null> {
  const url = `https://www.reinfolib.mlit.go.jp/ex-api/external/${apiCode}?z=${z}&x=${x}&y=${y}&response_format=geojson`;
  try {
    const res = await fetch(url, {
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.warn(`reinfolib ${apiCode} returned ${res.status}`);
      return null;
    }
    return (await res.json()) as GeoJsonFeatureCollection;
  } catch (e) {
    console.warn(`reinfolib ${apiCode} fetch error:`, e);
    return null;
  }
}

// ---------- Phase 1: reinfolib 座標ベース ----------

async function checkWithReinfolib(
  lat: number,
  lon: number,
  apiKey: string
): Promise<LegalCheckResults> {
  const results: LegalCheckResults = {};
  const { x, y, z } = latLonToTile(lat, lon, 15);

  // XKT001: 都市計画区域/区域区分
  const xkt001 = await fetchReinfolibData("XKT001", x, y, z, apiKey);
  if (xkt001 && xkt001.features?.length > 0) {
    const hit = pointInGeoJsonFeatures(lon, lat, xkt001.features);
    if (hit) {
      const areaName = (hit.properties?.["区域区分"] as string) || "都市計画区域内";
      results["都市計画法"] = {
        status: "該当",
        note: `都市計画区域: ${areaName}（reinfolib自動判定）`,
        confirmationMethod: "WEB",
        confirmationSource: "https://www.reinfolib.mlit.go.jp/",
      };
    } else {
      results["都市計画法"] = {
        status: "非該当",
        note: "都市計画区域外（reinfolib自動判定）",
        confirmationMethod: "WEB",
        confirmationSource: "https://www.reinfolib.mlit.go.jp/",
      };
    }
  }

  // XKT002: 用途地域（都市計画法の詳細情報として追加）
  const xkt002 = await fetchReinfolibData("XKT002", x, y, z, apiKey);
  if (xkt002 && xkt002.features?.length > 0) {
    const hit = pointInGeoJsonFeatures(lon, lat, xkt002.features);
    if (hit) {
      const youto = (hit.properties?.["用途地域"] as string) || "";
      const existing = results["都市計画法"];
      if (existing) {
        existing.note += ` / 用途地域: ${youto}`;
      } else {
        results["都市計画法"] = {
          status: "該当",
          note: `用途地域: ${youto}（reinfolib自動判定）`,
          confirmationMethod: "WEB",
          confirmationSource: "https://www.reinfolib.mlit.go.jp/",
        };
      }
    }
  }

  // XKT019: 自然公園地域
  const xkt019 = await fetchReinfolibData("XKT019", x, y, z, apiKey);
  if (xkt019 && xkt019.features?.length > 0) {
    const hit = pointInGeoJsonFeatures(lon, lat, xkt019.features);
    if (hit) {
      const parkName = (hit.properties?.["自然公園名"] as string) || "自然公園地域内";
      results["自然公園法"] = {
        status: "該当",
        note: `${parkName}（reinfolib自動判定）`,
        confirmationMethod: "WEB",
        confirmationSource: "https://www.reinfolib.mlit.go.jp/",
      };
    } else {
      results["自然公園法"] = {
        status: "非該当",
        note: "自然公園地域外（reinfolib自動判定）",
        confirmationMethod: "WEB",
        confirmationSource: "https://www.reinfolib.mlit.go.jp/",
      };
    }
  }

  return results;
}

// ---------- Phase 2: 住所/地目/固定テキスト ----------

// 土壌汚染対策法・福山市要措置区域等の対象地区
const FUKUYAMA_SOIL_TARGET_DISTRICTS = [
  "瀬戸町", "加茂町", "鋼管町", "柳津町", "緑町", "三吉町", "松浜町",
] as const;

// 鳥獣保護法：赤アラート表示対象（広島県内）
const HIROSHIMA_BIRD_PROTECTION_AREAS = [
  "庄原市口和町", "東広島市志和町", "福山市走島町", "福山市赤坂町",
  "福山市沼隈町", "福山市千田町", "三原市",
] as const;

function checkWithAddress(
  address: string | null,
  landCategories: string[]
): LegalCheckResults {
  const results: LegalCheckResults = {};

  // --- 固定テキスト法令（Phase 2: 常に非該当） ---
  results["消防法"] = {
    status: "非該当",
    note: "低圧の為、消防署への届出が必要な機器設置なく、該当しません。",
    confirmationMethod: "WEB",
  };
  results["振動規制法"] = {
    status: "非該当",
    note: "特定施設を設置しないため、該当しません。",
    confirmationMethod: "WEB",
  };
  results["道路法"] = {
    status: "非該当",
    note: "工事区域に道路が無い為、道路使用許可が占用許可の必要な行為は予定されていません。",
    confirmationMethod: "WEB",
  };
  results["廃棄物の処理及び清掃に関する法律"] = {
    status: "非該当",
    note: "敷地内の残置物及び工事で発生した産廃物については適正に処理します。",
    confirmationMethod: "WEB",
  };

  // --- 土壌汚染対策法（福山市チェック） ---
  if (address && address.includes("福山市")) {
    const isSoilTarget = FUKUYAMA_SOIL_TARGET_DISTRICTS.some((d) =>
      address.includes(d)
    );
    if (isSoilTarget) {
      results["土壌汚染対策法"] = {
        status: "要確認",
        note: "福山市要措置区域等の対象地区に該当する可能性があります。",
        confirmationMethod: "WEB",
        confirmationSource:
          "https://www.city.fukuyama.hiroshima.jp/site/kankyo/335122.html",
      };
    } else {
      results["土壌汚染対策法"] = {
        status: "非該当",
        note: "福山市の要措置区域等の対象地区外です。",
        confirmationMethod: "WEB",
        confirmationSource:
          "https://www.city.fukuyama.hiroshima.jp/site/kankyo/335122.html",
      };
    }
  }

  // --- 鳥獣保護法（広島県チェック） ---
  if (address && address.includes("広島県")) {
    const isBirdArea = HIROSHIMA_BIRD_PROTECTION_AREAS.some((area) =>
      address.includes(area)
    );
    if (isBirdArea) {
      results["鳥獣の保護及び管理並びに狩猟の適正化に関する法律"] = {
        status: "要確認",
        note: "鳥獣保護区域に該当する可能性があります。",
        confirmationMethod: "WEB",
        confirmationSource:
          "https://www.pref.hiroshima.lg.jp/site/huntinglicense/hunter-map.html",
      };
    } else {
      results["鳥獣の保護及び管理並びに狩猟の適正化に関する法律"] = {
        status: "非該当",
        note: "広島県鳥獣保護区域外です。",
        confirmationMethod: "WEB",
        confirmationSource:
          "https://www.pref.hiroshima.lg.jp/site/huntinglicense/hunter-map.html",
      };
    }
  }

  // --- 農振法・農地法（地目ベース） ---
  const hasFarmland = landCategories.some(
    (cat) => cat === "田" || cat === "畑"
  );
  if (hasFarmland) {
    results["農業振興地域の整備に関する法律"] = {
      status: "該当",
      note: "地目に農地（田/畑）が含まれています。農振除外手続きが必要な可能性があります。",
      confirmationMethod: "",
    };
    results["農地法"] = {
      status: "該当",
      note: "地目に農地（田/畑）が含まれています。農地転用許可が必要な可能性があります。",
      confirmationMethod: "",
    };
  } else if (landCategories.length > 0) {
    results["農業振興地域の整備に関する法律"] = {
      status: "非該当",
      note: "地目に農地が含まれていません。",
      confirmationMethod: "",
    };
    results["農地法"] = {
      status: "非該当",
      note: "地目に農地が含まれていません。",
      confirmationMethod: "",
    };
  }

  return results;
}

// ---------- Phase 3: 残り法令（要確認 + 参照リンク） ----------

interface RemainingLawDef {
  name: string;
  note: string;
  url?: string;
}

const REMAINING_LAWS: RemainingLawDef[] = [
  {
    name: "国土利用計画法",
    note: "面積要件による確認が必要です。各都道府県の届出基準をご確認ください。",
  },
  {
    name: "港湾法",
    note: "港湾区域内の場合は許可が必要です。確認してください。",
  },
  {
    name: "海岸法",
    note: "海岸保全区域内の場合は許可が必要です。確認してください。",
  },
  {
    name: "景観法",
    note: "景観計画区域内の場合は届出が必要です。確認してください。",
  },
  {
    name: "文化財保護法",
    note: "埋蔵文化財包蔵地の場合は届出が必要です。確認してください。",
  },
  {
    name: "自然環境保全法",
    note: "自然環境保全地域内の場合は許可が必要です。確認してください。",
  },
  {
    name: "絶滅の恐れがある野生動植物の種の保存に関する法律",
    note: "生息地等保護区の場合は許可が必要です。確認してください。",
  },
  {
    name: "環境影響評価法・条例",
    note: "面積要件による確認が必要です。各都道府県の条例を確認してください。",
  },
];

function checkRemaining(): LegalCheckResults {
  const results: LegalCheckResults = {};
  for (const law of REMAINING_LAWS) {
    results[law.name] = {
      status: "要確認",
      note: law.note,
      confirmationMethod: "",
      ...(law.url ? { confirmationSource: law.url } : {}),
    };
  }
  return results;
}

// ---------- Main entry ----------

export async function performLegalAutoCheck(
  input: LegalCheckInput
): Promise<LegalCheckResults> {
  const results: LegalCheckResults = {};

  // Phase 1: reinfolib API（APIキーがある場合のみ）
  const apiKey = process.env.REINFOLIB_API_KEY;
  if (apiKey) {
    const reinfolibResults = await checkWithReinfolib(
      input.lat,
      input.lon,
      apiKey
    );
    Object.assign(results, reinfolibResults);
  }

  // Phase 2: 住所/地目/固定テキスト
  const addressResults = checkWithAddress(
    input.address,
    input.landCategories
  );
  Object.assign(results, addressResults);

  // Phase 3: 残り法令
  const remainingResults = checkRemaining();
  // 既にPhase1/2で判定済みのものは上書きしない
  for (const [key, value] of Object.entries(remainingResults)) {
    if (!results[key]) {
      results[key] = value;
    }
  }

  return results;
}
