import { NextRequest, NextResponse } from "next/server";
import {
  getSurroundingPoints,
  calculateSlope,
  classifySlope,
  type ElevationPoint,
  type SlopeResult,
} from "@/lib/slope";
import { fetchElevation } from "@/lib/elevation-grid";
import { requireOrganizationWithCsrf } from "@/lib/auth-guard";

const OFFSET_METERS = 10;

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const authResult = await requireOrganizationWithCsrf(req);
    if (!authResult.success) return authResult.response;

    const body = await req.json();
    const { lat, lon } = body;

    if (typeof lat !== "number" || typeof lon !== "number") {
      return NextResponse.json(
        { error: "lat, lon は数値で指定してください" },
        { status: 400 }
      );
    }

    // 日本国内の座標バリデーション
    if (lat < 20 || lat > 46 || lon < 122 || lon > 154) {
      return NextResponse.json(
        { error: "日本国内の座標を指定してください（lat: 20-46, lon: 122-154）" },
        { status: 400 }
      );
    }

    const surrounding = getSurroundingPoints(lat, lon, OFFSET_METERS);

    // 5点の標高を並列取得（共通キャッシュ利用）
    const elevations = await Promise.all(
      surrounding.map(async (pt) => {
        const elevation = await fetchElevation(pt.lat, pt.lon);
        return {
          lat: pt.lat,
          lon: pt.lon,
          elevation,
          label: pt.label,
        } as ElevationPoint;
      })
    );

    const { slopeDegrees, slopePercent, aspectDegrees, aspectDirection } =
      calculateSlope(elevations, OFFSET_METERS);

    const classification = classifySlope(slopeDegrees);
    const centerPoint = elevations.find((p) => p.label === "center")!;

    const result: SlopeResult = {
      centerElevation: centerPoint.elevation,
      points: elevations,
      slopeDegrees,
      slopePercent,
      aspectDegrees,
      aspectDirection,
      classification,
    };

    return NextResponse.json(result);
  } catch (e) {
    console.error("Slope API error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "傾斜計算に失敗しました" },
      { status: 500 }
    );
  }
}
