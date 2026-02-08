import { NextRequest, NextResponse } from "next/server";
import {
  generateGridPoints,
  fetchElevationBatchFromTiles,
  buildElevationMatrix,
} from "@/lib/elevation-tile";
import {
  calculateGridSlopes,
  computeStats,
  extractCrossSection,
} from "@/lib/slope-analysis";

const MAX_GRID_POINTS = 1000;
const FIXED_INTERVAL = 2; // 2m固定グリッド

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { polygon, crossSectionLine } = body;
    const interval = FIXED_INTERVAL; // 2m固定

    // バリデーション
    if (
      !polygon ||
      !Array.isArray(polygon) ||
      polygon.length < 4
    ) {
      return NextResponse.json(
        { error: "polygon は4点以上の [lon, lat][] 配列で指定してください" },
        { status: 400 }
      );
    }

    // グリッド点生成
    const { points, rows, cols, originLat, originLon } = generateGridPoints(
      polygon as [number, number][],
      interval
    );

    if (points.length === 0) {
      return NextResponse.json(
        { error: "ポリゴン内にグリッド点がありません。ポリゴンを大きくするかintervalを小さくしてください" },
        { status: 400 }
      );
    }

    if (points.length > MAX_GRID_POINTS) {
      return NextResponse.json(
        {
          error: `グリッド点が${points.length}点と多すぎます（上限${MAX_GRID_POINTS}点）。intervalを大きくしてください`,
        },
        { status: 400 }
      );
    }

    // 標高バッチ取得（タイルベースで高速化）
    const elevations = await fetchElevationBatchFromTiles(points);

    // 標高マトリクス構築
    const { z, x, y } = buildElevationMatrix(elevations, rows, cols);

    // 傾斜計算
    const slopes = calculateGridSlopes(z, interval);

    // 統計算出
    const stats = computeStats(slopes, z);

    // 最高点・最低点を自動検出（自動断面生成用）
    let maxPoint: { row: number; col: number; elev: number } | null = null;
    let minPoint: { row: number; col: number; elev: number } | null = null;
    for (let r = 0; r < z.length; r++) {
      for (let c = 0; c < z[r].length; c++) {
        const elev = z[r][c];
        if (elev === null) continue;
        if (!maxPoint || elev > maxPoint.elev) maxPoint = { row: r, col: c, elev };
        if (!minPoint || elev < minPoint.elev) minPoint = { row: r, col: c, elev };
      }
    }

    // グリッド座標を地理座標に変換
    const EARTH_RADIUS_M = 6371000;
    const dLat = (interval / EARTH_RADIUS_M) * (180 / Math.PI);
    const dLon = (interval / (EARTH_RADIUS_M * Math.cos((originLat * Math.PI) / 180))) * (180 / Math.PI);

    let autoCrossSectionLine: [number, number][] | null = null;
    if (maxPoint && minPoint && (maxPoint.row !== minPoint.row || maxPoint.col !== minPoint.col)) {
      const maxLat = originLat - maxPoint.row * dLat;
      const maxLon = originLon + maxPoint.col * dLon;
      const minLat = originLat - minPoint.row * dLat;
      const minLon = originLon + minPoint.col * dLon;
      autoCrossSectionLine = [[maxLon, maxLat], [minLon, minLat]];
    }

    // 断面プロファイル（ユーザー指定または自動生成）
    const effectiveLine = (crossSectionLine && Array.isArray(crossSectionLine) && crossSectionLine.length >= 2)
      ? crossSectionLine as [number, number][]
      : autoCrossSectionLine;

    let crossSection = null;
    if (effectiveLine && effectiveLine.length >= 2) {
      crossSection = extractCrossSection(
        z,
        originLat,
        originLon,
        interval,
        effectiveLine,
        50
      );
    }

    // 傾斜マトリクス（ヒートマップ用）
    const slopeMatrix: (number | null)[][] = Array.from({ length: rows }, () =>
      Array(cols).fill(null)
    );
    for (const s of slopes) {
      slopeMatrix[s.row][s.col] = s.degrees;
    }

    return NextResponse.json({
      gridInfo: { rows, cols, interval, totalPoints: points.length, originLat, originLon },
      elevationMatrix: z,
      slopeMatrix,
      slopes,
      stats,
      crossSection,
      autoCrossSectionLine,
    });
  } catch (e: any) {
    console.error("Slope Grid API error:", e);
    return NextResponse.json(
      { error: e.message || "グリッド傾斜計算に失敗しました" },
      { status: 500 }
    );
  }
}
