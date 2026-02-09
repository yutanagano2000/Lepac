"use client";

import { Suspense, useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2, Mountain, Search, TriangleAlert, MapPin, Save, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { parseCoordinateString } from "@/lib/coordinates";
import { PolygonDrawMap } from "@/components/survey/PolygonDrawMap";
import { Surface3D } from "@/components/survey/Surface3D";
import { CrossSectionChart } from "@/components/survey/CrossSectionChart";
import { SlopeStatsCard } from "@/components/survey/SlopeStatsCard";
import { PolygonToolbar } from "@/components/survey/PolygonToolbar";
import { SlopeLegend } from "@/components/survey/SlopeLegend";
import { ExportDialog } from "@/components/survey/ExportDialog";
import { FullscreenSurface } from "@/components/survey/FullscreenSurface";
import { AnalysisProgress } from "@/components/survey/AnalysisProgress";
import type { DrawMode } from "@/components/survey/PolygonToolbar";
import { extractCrossSection, type SlopeStats, type CrossSectionPoint } from "@/lib/slope-analysis";

const CesiumTerrainViewer = dynamic(
  () => import("@/components/survey/CesiumTerrainViewer"),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )}
);

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
  autoCrossSectionLine: [number, number][] | null;
}

const GRID_INTERVAL = 2; // 2m固定グリッド

export default function SurveyPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-6xl p-4 flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <SurveyPageContent />
    </Suspense>
  );
}

function SurveyPageContent() {
  const searchParams = useSearchParams();

  // ─── ポリゴン解析 ──────────────────────────────────
  const [polygon, setPolygon] = useState<[number, number][]>([]);
  const [crossSectionLine, setCrossSectionLine] = useState<[number, number][]>([]);
  const [gridLoading, setGridLoading] = useState(false);
  const [gridResult, setGridResult] = useState<GridAnalysisResult | null>(null);
  const [gridError, setGridError] = useState<string | null>(null);
  const [jumpCoordInput, setJumpCoordInput] = useState("");
  const [jumpTarget, setJumpTarget] = useState<[number, number] | null>(null);
  const jumpCountRef = useRef(0);
  const [drawMode, setDrawMode] = useState<DrawMode>(null);
  const [projectInfo, setProjectInfo] = useState<{ id: string; name: string } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0);

  // ─── エクスポート用 Ref ───────────────────────────────
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const surfaceContainerRef = useRef<HTMLDivElement>(null);

  // ─── カウントダウン管理 ────────────────────────────────
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // ─── クエリパラメータから座標を取得して自動ジャンプ ───
  useEffect(() => {
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");
    const projectId = searchParams.get("projectId");
    const projectName = searchParams.get("projectName");

    if (lat && lon) {
      const latNum = parseFloat(lat);
      const lonNum = parseFloat(lon);
      if (!isNaN(latNum) && !isNaN(lonNum)) {
        setJumpTarget([latNum, lonNum]);
        setJumpCoordInput(`${lat}, ${lon}`);
      }
    }

    if (projectId && projectName) {
      setProjectInfo({ id: projectId, name: decodeURIComponent(projectName) });
    }
  }, [searchParams]);

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

  // ─── ポリゴンリセット ─────────────────────────────
  const handleReset = useCallback(() => {
    setPolygon([]);
    setCrossSectionLine([]);
    setGridResult(null);
    setGridError(null);
    setDrawMode(null);
    setSaveStatus(null);
    // 選択地点もリセット
    setJumpTarget(null);
    setJumpCoordInput("");
    // 地図上のポリゴンもリセット
    setResetTrigger((prev) => prev + 1);
  }, []);

  // ─── 解析結果保存 ─────────────────────────────────
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | "error" | null>(null);

  const handleSave = async () => {
    if (!gridResult || !projectInfo) return;

    setSaveStatus("saving");
    try {
      const res = await fetch("/api/slope-analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: parseInt(projectInfo.id, 10),
          polygon,
          gridInterval: GRID_INTERVAL,
          totalPoints: gridResult.gridInfo.totalPoints,
          avgSlope: gridResult.stats.avgSlope,
          maxSlope: gridResult.stats.maxSlope,
          minSlope: gridResult.stats.minSlope,
          flatPercent: gridResult.stats.flatPercent,
          steepPercent: gridResult.stats.steepPercent,
          avgElevation: gridResult.stats.avgElevation,
          maxElevation: gridResult.stats.maxElevation,
          minElevation: gridResult.stats.minElevation,
          elevationMatrix: gridResult.elevationMatrix,
          slopeMatrix: gridResult.slopeMatrix,
          crossSection: gridResult.crossSection,
        }),
      });

      if (res.ok) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
  };

  const handleCrossSectionLine = useCallback(
    (coords: [number, number][]) => {
      setCrossSectionLine(coords);
      // 既に解析済みなら断面をローカルで再計算（API不要）
      if (gridResult && coords.length >= 2) {
        const newCrossSection = extractCrossSection(
          gridResult.elevationMatrix,
          gridResult.gridInfo.originLat,
          gridResult.gridInfo.originLon,
          gridResult.gridInfo.interval,
          coords,
          50
        );
        setGridResult((prev) =>
          prev ? { ...prev, crossSection: newCrossSection } : null
        );
      }
    },
    [gridResult]
  );

  const handleAnalyze = async () => {
    if (polygon.length < 4) {
      setGridError("地図上でポリゴンを描画してください");
      return;
    }

    setGridError(null);
    setGridResult(null);
    setGridLoading(true);

    // 推定秒数を計算（2mグリッドで30x30m = 225点、100点あたり約3秒）
    // ポリゴンのバウンディングボックスから概算
    const lats = polygon.map((p) => p[0]);
    const lons = polygon.map((p) => p[1]);
    const latRange = Math.max(...lats) - Math.min(...lats);
    const lonRange = Math.max(...lons) - Math.min(...lons);
    const estWidth = lonRange * 111000 * Math.cos((Math.min(...lats) * Math.PI) / 180);
    const estHeight = latRange * 111000;
    const estPoints = Math.ceil((estWidth / GRID_INTERVAL) * (estHeight / GRID_INTERVAL));
    const estSeconds = Math.max(3, Math.ceil(estPoints / 30)); // 30点/秒の概算
    setCountdown(estSeconds);

    try {
      const res = await fetch("/api/slope-grid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          polygon,
          interval: GRID_INTERVAL,
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
    } catch {
      setGridError("通信エラーが発生しました");
    } finally {
      setGridLoading(false);
      setCountdown(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <Mountain className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">現地調査（傾斜判定）</h1>
      </div>

      <div className="space-y-4">
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
            {gridResult && projectInfo && (
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={saveStatus === "saving"}
              >
                {saveStatus === "saving" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : saveStatus === "saved" ? (
                  <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                {saveStatus === "saved" ? "保存完了" : "保存"}
              </Button>
            )}
            {gridResult && (
              <ExportDialog
                stats={gridResult.stats}
                totalPoints={gridResult.gridInfo.totalPoints}
                crossSection={gridResult.crossSection}
                mapContainerRef={mapContainerRef}
                surfaceContainerRef={surfaceContainerRef}
                projectName={projectInfo?.name}
              />
            )}
            {polygon.length >= 4 && (
              <span className="text-xs text-muted-foreground">
                ポリゴン設定済み（{polygon.length - 1}頂点）
              </span>
            )}
          </div>

          {/* プログレス表示 */}
          <AnalysisProgress countdown={countdown} isLoading={gridLoading} />

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
            <Card className="overflow-hidden relative" ref={mapContainerRef}>
              <div className="h-[450px]">
                <PolygonDrawMap
                  onPolygonReady={handlePolygonReady}
                  onCrossSectionLine={handleCrossSectionLine}
                  flyTo={jumpTarget}
                  analyzed={!!gridResult}
                  drawMode={drawMode}
                  onDrawModeChange={setDrawMode}
                  resetTrigger={resetTrigger}
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
                  crossSectionLineDisplay={
                    crossSectionLine.length >= 2
                      ? crossSectionLine
                      : gridResult?.autoCrossSectionLine ?? null
                  }
                />
                <PolygonToolbar
                  activeMode={drawMode}
                  onModeChange={setDrawMode}
                  onReset={handleReset}
                  hasPolygon={polygon.length >= 4}
                />
                {gridResult && (
                  <SlopeLegend className="absolute bottom-2 right-2 z-[1000]" />
                )}
              </div>
            </Card>

            <Card className="overflow-hidden" ref={surfaceContainerRef}>
              <Tabs defaultValue={gridResult ? "surface" : "cesium"}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">3D地形ビューワー</CardTitle>
                    <TabsList className="h-8">
                      {gridResult && (
                        <TabsTrigger value="surface" className="text-xs px-3 h-7">
                          3D解析
                        </TabsTrigger>
                      )}
                      <TabsTrigger value="cesium" className="text-xs px-3 h-7">
                        航空写真3D
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </CardHeader>
                {gridResult && (
                  <TabsContent value="surface" className="mt-0">
                    <div className="h-[400px] relative">
                      <Surface3D
                        z={gridResult.elevationMatrix}
                        interval={gridResult.gridInfo.interval}
                        gridOrigin={{
                          lat: gridResult.gridInfo.originLat,
                          lon: gridResult.gridInfo.originLon,
                        }}
                        polygonCoords={polygon}
                        crossSectionLine={
                          crossSectionLine.length >= 2
                            ? crossSectionLine
                            : gridResult?.autoCrossSectionLine ?? null
                        }
                      />
                      <FullscreenSurface
                        z={gridResult.elevationMatrix}
                        interval={gridResult.gridInfo.interval}
                        gridOrigin={{
                          lat: gridResult.gridInfo.originLat,
                          lon: gridResult.gridInfo.originLon,
                        }}
                        polygonCoords={polygon}
                        crossSectionLine={
                          crossSectionLine.length >= 2
                            ? crossSectionLine
                            : gridResult?.autoCrossSectionLine ?? null
                        }
                      />
                    </div>
                  </TabsContent>
                )}
                <TabsContent value="cesium" className="mt-0">
                  <div className="h-[400px]">
                    <CesiumTerrainViewer
                      center={jumpTarget ?? undefined}
                      polygon={gridResult ? polygon : undefined}
                      slopeMatrix={gridResult?.slopeMatrix}
                      gridInfo={gridResult ? {
                        originLat: gridResult.gridInfo.originLat,
                        originLon: gridResult.gridInfo.originLon,
                        interval: gridResult.gridInfo.interval,
                        rows: gridResult.gridInfo.rows,
                        cols: gridResult.gridInfo.cols,
                      } : undefined}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
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
      </div>
    </div>
  );
}
