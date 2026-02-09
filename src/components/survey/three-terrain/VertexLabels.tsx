"use client";

import { useMemo } from "react";
import { Html } from "@react-three/drei";
import { latLonToLocalXZ } from "./geo-utils";
import { VERTICAL_EXAGGERATION, VERTEX_LABELS } from "./types";

interface VertexLabelsProps {
  polygon: [number, number][];
  elevationMatrix: (number | null)[][];
  gridInfo: {
    originLat: number;
    originLon: number;
    interval: number;
    rows: number;
    cols: number;
  };
}

export function VertexLabels({ polygon, elevationMatrix, gridInfo }: VertexLabelsProps) {
  const { originLat, originLon, interval, rows, cols } = gridInfo;

  // 標高の基準値（TerrainMeshと同じ計算）
  const baseElevation = useMemo(() => {
    const vals: number[] = [];
    for (const row of elevationMatrix) {
      for (const v of row) {
        if (v !== null) vals.push(v);
      }
    }
    if (vals.length === 0) return 0;
    vals.sort((a, b) => a - b);
    return vals[Math.floor(vals.length / 2)];
  }, [elevationMatrix]);

  // メッシュ中心のオフセット（geometry.center()に合わせる）
  const meshCenterOffset = useMemo(() => ({
    x: ((cols - 1) * interval) / 2,
    z: ((rows - 1) * interval) / 2,
  }), [rows, cols, interval]);

  // 各頂点の3D位置を計算
  const labels = useMemo(() => {
    return polygon.map(([lat, lon], i) => {
      if (i >= VERTEX_LABELS.length) return null;

      const local = latLonToLocalXZ(lat, lon, originLat, originLon);

      // グリッド座標からおおよその標高を補間
      const EARTH_RADIUS = 6371000;
      const dLat = (interval / EARTH_RADIUS) * (180 / Math.PI);
      const dLon =
        (interval / (EARTH_RADIUS * Math.cos((originLat * Math.PI) / 180))) *
        (180 / Math.PI);
      const gridR = (originLat - lat) / dLat;
      const gridC = (lon - originLon) / dLon;
      const r = Math.round(gridR);
      const c = Math.round(gridC);
      const elev =
        r >= 0 && r < rows && c >= 0 && c < cols
          ? (elevationMatrix[r]?.[c] ?? baseElevation)
          : baseElevation;

      const y = (elev - baseElevation) * VERTICAL_EXAGGERATION + 3; // ラベルを少し浮かせる

      return {
        label: VERTEX_LABELS[i],
        position: [
          local.x - meshCenterOffset.x,
          y,
          local.z - meshCenterOffset.z,
        ] as [number, number, number],
      };
    }).filter(Boolean) as { label: string; position: [number, number, number] }[];
  }, [polygon, originLat, originLon, interval, rows, cols, elevationMatrix, baseElevation, meshCenterOffset]);

  return (
    <>
      {labels.map(({ label, position }) => (
        <Html
          key={label}
          position={position}
          center
          style={{ pointerEvents: "none" }}
        >
          <div className="bg-blue-700 text-white text-xs font-bold px-1.5 py-0.5 rounded shadow-md border border-white whitespace-nowrap">
            {label}
          </div>
        </Html>
      ))}
    </>
  );
}
