import { NextRequest, NextResponse } from "next/server";
import {
  generateGridPoints,
  fetchElevationBatch,
  buildElevationMatrix,
} from "@/lib/elevation-grid";
import {
  calculateGridSlopes,
  computeStats,
  extractCrossSection,
} from "@/lib/slope-analysis";

const MAX_GRID_POINTS = 500;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { polygon, interval = 5, crossSectionLine } = body;

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

    if (interval < 1 || interval > 50) {
      return NextResponse.json(
        { error: "interval は 1〜50（メートル）で指定してください" },
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

    // 標高バッチ取得
    const elevations = await fetchElevationBatch(points, 10);

    // 標高マトリクス構築
    const { z, x, y } = buildElevationMatrix(elevations, rows, cols);

    // 傾斜計算
    const slopes = calculateGridSlopes(z, interval);

    // 統計算出
    const stats = computeStats(slopes, z);

    // 断面プロファイル（オプション）
    let crossSection = null;
    if (
      crossSectionLine &&
      Array.isArray(crossSectionLine) &&
      crossSectionLine.length >= 2
    ) {
      crossSection = extractCrossSection(
        z,
        originLat,
        originLon,
        interval,
        crossSectionLine as [number, number][],
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
    });
  } catch (e: any) {
    console.error("Slope Grid API error:", e);
    return NextResponse.json(
      { error: e.message || "グリッド傾斜計算に失敗しました" },
      { status: 500 }
    );
  }
}
