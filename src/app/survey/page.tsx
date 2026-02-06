"use client";

import { useState, useCallback, useRef } from "react";
import { Loader2, Mountain, Search, TriangleAlert, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseCoordinateString } from "@/lib/coordinates";
import { SlopeResultCard } from "@/components/survey/SlopeResultCard";
import { SurveyMap } from "@/components/survey/SurveyMap";
import { PolygonDrawMap } from "@/components/survey/PolygonDrawMap";
import { Surface3D } from "@/components/survey/Surface3D";
import { CrossSectionChart } from "@/components/survey/CrossSectionChart";
import { SlopeStatsCard } from "@/components/survey/SlopeStatsCard";
import { PolygonToolbar } from "@/components/survey/PolygonToolbar";
import type { DrawMode } from "@/components/survey/PolygonToolbar";
import type { SlopeResult } from "@/lib/slope";
import type { SlopeStats, CrossSectionPoint } from "@/lib/slope-analysis";

// ─── ポリゴン解析の結果型 ────────────────────────────
interface GridAnalysisResult {
  gridInfo: {
    rows: number;
    cols: number;
    interval: number;
    totalPoints: number;
    originLat: number;
    originLon: number;
  };
  elevationMatrix: (number | null)[][];
  slopeMatrix: (number | null)[][];
  stats: SlopeStats;
  crossSection: CrossSectionPoint[] | null;
}

export default function SurveyPage() {
  // ─── 座標入力タブ ──────────────────────────────────
  const [coordInput, setCoordInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SlopeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── ポリゴン解析タブ ──────────────────────────────
  const [polygon, setPolygon] = useState<[number, number][]>([]);
  const [crossSectionLine, setCrossSectionLine] = useState<[number, number][]>([]);
  const [gridInterval, setGridInterval] = useState(5);
  const [gridLoading, setGridLoading] = useState(false);
  const [gridResult, setGridResult] = useState<GridAnalysisResult | null>(null);
  const [gridError, setGridError] = useState<string | null>(null);
  const [jumpCoordInput, setJumpCoordInput] = useState("");
  const [jumpTarget, setJumpTarget] = useState<[number, number] | null>(null);
  const jumpCountRef = useRef(0);
  const [drawMode, setDrawMode] = useState<DrawMode>(null);

  // ─── 座標入力タブのハンドラ ─────────────────────────
  const handleMeasure = async () => {
    setError(null);
    setResult(null);

    const parsed = parseCoordinateString(coordInput);
    if (!parsed) {
      setError("座標を正しく入力してください（例: 34.3963, 132.4596）");
      return;
    }

    const lat = parseFloat(parsed.lat);
    const lon = parseFloat(parsed.lon);

    if (isNaN(lat) || isNaN(lon)) {
      setError("座標の数値が不正です");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/slope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "計測に失敗しました");
        return;
      }
      setResult(data as SlopeResult);
    } catch (e: any) {
      setError(e.message || "通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) handleMeasure();
  };

  // ─── 座標ジャンプ ──────────────────────────────────
  const handleJump = () => {
    const parsed = parseCoordinateString(jumpCoordInput);
    if (!parsed) return;
    const lat = parseFloat(parsed.lat);
    const lon = parseFloat(parsed.lon);
    if (isNaN(lat) || isNaN(lon)) return;
    // 同じ座標でも再ジャンプできるようカウンターで参照を変える
    jumpCountRef.current += 1;
    setJumpTarget([lat, lon]);
  };

  const handleJumpKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleJump();
  };

  // ─── ポリゴン解析タブのハンドラ ─────────────────────
  const handlePolygonReady = useCallback((coords: [number, number][]) => {
    setPolygon(coords);
    // ポリゴンが変わったら結果をクリア
    setGridResult(null);
    setGridError(null);
    setCrossSectionLine([]);
  }, []);

  const handleCrossSectionLine = useCallback(
    (coords: [number, number][]) => {
      setCrossSectionLine(coords);
      // 既に解析済みなら断面だけ再計算
      if (gridResult && coords.length >= 2) {
        rerunWithCrossSection(coords);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gridResult, polygon, gridInterval]
  );

  const rerunWithCrossSection = async (line: [number, number][]) => {
    if (polygon.length < 4) return;
    try {
      const res = await fetch("/api/slope-grid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          polygon,
          interval: gridInterval,
          crossSectionLine: line,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGridResult(data as GridAnalysisResult);
      }
    } catch {
      // 断面再取得のエラーは無視
    }
  };

  const handleAnalyze = async () => {
    if (polygon.length < 4) {
      setGridError("地図上でポリゴンを描画してください");
      return;
    }

    setGridError(null);
    setGridResult(null);
    setGridLoading(true);

    try {
      const res = await fetch("/api/slope-grid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          polygon,
          interval: gridInterval,
          crossSectionLine:
            crossSectionLine.length >= 2 ? crossSectionLine : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGridError(data.error || "解析に失敗しました");
        return;
      }

      setGridResult(data as GridAnalysisResult);
    } catch (e: any) {
      setGridError(e.message || "通信エラーが発生しました");
    } finally {
      setGridLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <Mountain className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">現地調査（傾斜判定）</h1>
      </div>

      <Tabs defaultValue="point" className="space-y-4">
        <TabsList>
          <TabsTrigger value="point">座標入力</TabsTrigger>
          <TabsTrigger value="polygon">ポリゴン解析</TabsTrigger>
        </TabsList>

        {/* ═══ 座標入力タブ ═══ */}
        <TabsContent value="point" className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="座標を入力（例: 34.3963, 132.4596）"
              value={coordInput}
              onChange={(e) => setCoordInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button
              onClick={handleMeasure}
              disabled={loading || !coordInput.trim()}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Search className="h-4 w-4 mr-1" />
              )}
              計測
            </Button>
          </div>

          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-4">
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {result && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SlopeResultCard result={result} />
              <Card className="overflow-hidden">
                <div className="h-[400px]">
                  <SurveyMap
                    center={[
                      result.points.find((p) => p.label === "center")!.lat,
                      result.points.find((p) => p.label === "center")!.lon,
                    ]}
                    points={result.points}
                  />
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ═══ ポリゴン解析タブ ═══ */}
        <TabsContent value="polygon" className="space-y-4">
          {/* 座標ジャンプ */}
          <div className="flex gap-2">
            <Input
              placeholder="座標を入力して地図をジャンプ（例: 34.3963, 132.4596）"
              value={jumpCoordInput}
              onChange={(e) => setJumpCoordInput(e.target.value)}
              onKeyDown={handleJumpKeyDown}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={handleJump}
              disabled={!jumpCoordInput.trim()}
            >
              <MapPin className="h-4 w-4 mr-1" />
              ジャンプ
            </Button>
          </div>

          {/* 操作バー */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">
                グリッド間隔
              </label>
              <Input
                type="number"
                min={1}
                max={50}
                value={gridInterval}
                onChange={(e) =>
                  setGridInterval(Math.max(1, Math.min(50, Number(e.target.value) || 5)))
                }
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">m</span>
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={gridLoading || polygon.length < 4}
            >
              {gridLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Search className="h-4 w-4 mr-1" />
              )}
              解析
            </Button>
            {polygon.length >= 4 && (
              <span className="text-xs text-muted-foreground">
                ポリゴン設定済み（{polygon.length - 1}頂点）
              </span>
            )}
            {gridLoading && (
              <span className="text-xs text-muted-foreground animate-pulse">
                標高データを取得中...
              </span>
            )}
          </div>

          {gridError && (
            <Card className="border-destructive">
              <CardContent className="pt-4 flex items-start gap-2">
                <TriangleAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{gridError}</p>
              </CardContent>
            </Card>
          )}

          {/* 地図 + 3Dサーフェス */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="overflow-hidden relative">
              <div className="h-[450px]">
                <PolygonDrawMap
                  onPolygonReady={handlePolygonReady}
                  onCrossSectionLine={handleCrossSectionLine}
                  flyTo={jumpTarget}
                  analyzed={!!gridResult}
                  drawMode={drawMode}
                  onDrawModeChange={setDrawMode}
                  slopeOverlay={
                    gridResult
                      ? {
                          originLat: gridResult.gridInfo.originLat,
                          originLon: gridResult.gridInfo.originLon,
                          interval: gridResult.gridInfo.interval,
                          slopeMatrix: gridResult.slopeMatrix,
                        }
                      : undefined
                  }
                />
                <PolygonToolbar
                  activeMode={drawMode}
                  onModeChange={setDrawMode}
                />
              </div>
            </Card>

            {gridResult ? (
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">3D地形サーフェス</CardTitle>
                </CardHeader>
                <div className="h-[400px]">
                  <Surface3D
                    z={gridResult.elevationMatrix}
                    interval={gridResult.gridInfo.interval}
                    gridOrigin={{
                      lat: gridResult.gridInfo.originLat,
                      lon: gridResult.gridInfo.originLon,
                    }}
                    polygonCoords={polygon}
                  />
                </div>
              </Card>
            ) : (
              <Card className="flex items-center justify-center h-[450px]">
                <p className="text-sm text-muted-foreground">
                  ポリゴンを描画して「解析」を押してください
                </p>
              </Card>
            )}
          </div>

          {/* 断面図 + 統計 */}
          {gridResult && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">断面プロファイル</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <CrossSectionChart
                      data={gridResult.crossSection ?? []}
                    />
                  </div>
                </CardContent>
              </Card>

              <SlopeStatsCard
                stats={gridResult.stats}
                totalPoints={gridResult.gridInfo.totalPoints}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
