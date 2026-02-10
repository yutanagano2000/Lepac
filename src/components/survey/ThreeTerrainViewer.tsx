"use client";

import { useState, useMemo, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Loader2, Mountain, Layers } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TerrainMesh, type TileLayerType } from "./three-terrain/TerrainMesh";
import { VertexLabels } from "./three-terrain/VertexLabels";
import type { ThreeTerrainViewerProps } from "./three-terrain/types";
import { computeDynamicExaggeration } from "./three-terrain/types";

function TerrainScene({
  elevationMatrix,
  gridInfo,
  polygon,
  tileLayer,
}: {
  elevationMatrix: (number | null)[][];
  gridInfo: NonNullable<ThreeTerrainViewerProps["gridInfo"]>;
  polygon?: [number, number][];
  tileLayer: TileLayerType;
}) {
  const horizontalExtent = useMemo(() => {
    const width = (gridInfo.cols - 1) * gridInfo.interval;
    const depth = (gridInfo.rows - 1) * gridInfo.interval;
    return Math.max(width, depth);
  }, [gridInfo]);

  const verticalExaggeration = useMemo(
    () => computeDynamicExaggeration(elevationMatrix, horizontalExtent),
    [elevationMatrix, horizontalExtent]
  );

  const cameraDistance = horizontalExtent * 1.2;

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[50, 100, 50]} intensity={0.8} />
      <directionalLight position={[-30, 60, -30]} intensity={0.3} />

      <TerrainMesh
        elevationMatrix={elevationMatrix}
        gridInfo={gridInfo}
        verticalExaggeration={verticalExaggeration}
        tileLayer={tileLayer}
      />

      {polygon && polygon.length >= 3 && (
        <VertexLabels
          polygon={polygon}
          elevationMatrix={elevationMatrix}
          gridInfo={gridInfo}
          verticalExaggeration={verticalExaggeration}
        />
      )}

      <OrbitControls
        makeDefault
        maxDistance={cameraDistance * 3}
        minDistance={cameraDistance * 0.1}
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.1}
      />
    </>
  );
}

function NoDataPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full bg-muted/50 rounded-lg">
      <div className="text-center p-4">
        <Mountain className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export function ThreeTerrainViewer({
  center,
  polygon,
  elevationMatrix,
  gridInfo,
}: ThreeTerrainViewerProps) {
  const [imageLayer, setImageLayer] = useState<TileLayerType>("photo");

  // 標高データがない場合のプレースホルダー
  const hasData = elevationMatrix && gridInfo;

  // カメラ初期位置の計算（地形起伏が見えやすい斜め上方から）
  const cameraPosition = useMemo<[number, number, number]>(() => {
    if (!gridInfo || !elevationMatrix) return [50, 80, 80];
    const width = (gridInfo.cols - 1) * gridInfo.interval;
    const depth = (gridInfo.rows - 1) * gridInfo.interval;
    const horizontalExtent = Math.max(width, depth);
    const exag = computeDynamicExaggeration(elevationMatrix, horizontalExtent);

    // 誇張後の概算鉛直レンジ
    const vals: number[] = [];
    for (const row of elevationMatrix) {
      for (const v of row) {
        if (v !== null) vals.push(v);
      }
    }
    let minV = Infinity;
    let maxV = -Infinity;
    for (const v of vals) {
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
    const elevRange = vals.length > 0 ? (maxV - minV) * exag : 0;

    // 水平距離の0.6倍の位置から、鉛直レンジ+水平距離の0.4倍の高さで見下ろす
    const dist = horizontalExtent * 0.6;
    const height = Math.max(elevRange * 0.8, horizontalExtent * 0.4);
    return [dist * 0.7, height, dist * 0.7];
  }, [gridInfo, elevationMatrix]);

  if (!hasData) {
    const msg = center
      ? "ポリゴンを描画して解析を実行すると、3D地形が表示されます"
      : "座標を入力してポリゴンを描画してください";
    return <NoDataPlaceholder message={msg} />;
  }

  return (
    <div className="relative w-full h-full">
      {/* レイヤー選択UI */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg p-2 shadow-md">
        <Select
          value={imageLayer}
          onValueChange={(v) => setImageLayer(v as "photo" | "std" | "pale")}
        >
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <Layers className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="photo">航空写真</SelectItem>
            <SelectItem value="std">標準地図</SelectItem>
            <SelectItem value="pale">淡色地図</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Canvas
        camera={{ position: cameraPosition, fov: 50, near: 0.1, far: 10000 }}
        style={{ width: "100%", height: "100%" }}
      >
        <Suspense fallback={null}>
          <TerrainScene
            elevationMatrix={elevationMatrix}
            gridInfo={gridInfo}
            polygon={polygon}
            tileLayer={imageLayer}
          />
        </Suspense>
      </Canvas>

      {/* 操作ヒント */}
      <div className="absolute bottom-2 left-2 z-10 bg-background/80 backdrop-blur-sm rounded px-2 py-1 text-xs text-muted-foreground">
        ドラッグ:回転 / 右クリック:パン / スクロール:ズーム
      </div>
    </div>
  );
}

export default ThreeTerrainViewer;
