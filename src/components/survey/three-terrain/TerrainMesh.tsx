"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { fetchGsiPhotoTiles } from "./geo-utils";
import { VERTICAL_EXAGGERATION } from "./types";

interface TerrainMeshProps {
  elevationMatrix: (number | null)[][];
  gridInfo: {
    originLat: number;
    originLon: number;
    interval: number;
    rows: number;
    cols: number;
  };
}

export function TerrainMesh({ elevationMatrix, gridInfo }: TerrainMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { rows, cols, interval } = gridInfo;

  // 標高の基準値（中央値）を計算してオフセットに使う
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

  // PlaneGeometry を生成し、Y座標に標高を設定
  const geometry = useMemo(() => {
    const width = (cols - 1) * interval;
    const depth = (rows - 1) * interval;
    const geo = new THREE.PlaneGeometry(width, depth, cols - 1, rows - 1);
    geo.rotateX(-Math.PI / 2); // XZ平面に水平配置

    const posAttr = geo.attributes.position;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const elev = elevationMatrix[r]?.[c];
        const y = elev !== null && elev !== undefined
          ? (elev - baseElevation) * VERTICAL_EXAGGERATION
          : 0;
        posAttr.setY(idx, y);
      }
    }

    geo.computeVertexNormals();
    geo.center();
    return geo;
  }, [elevationMatrix, rows, cols, interval, baseElevation]);

  // GSI航空写真テクスチャをロード
  useEffect(() => {
    let cancelled = false;

    fetchGsiPhotoTiles(
      gridInfo.originLat,
      gridInfo.originLon,
      gridInfo.interval,
      gridInfo.rows,
      gridInfo.cols
    ).then((result) => {
      if (cancelled || !result || !meshRef.current) return;

      const texture = new THREE.CanvasTexture(result.canvas);
      texture.colorSpace = THREE.SRGBColorSpace;

      // UV座標をグリッド範囲に合わせてオフセット
      const uvAttr = geometry.attributes.uv;
      for (let i = 0; i < uvAttr.count; i++) {
        const u = uvAttr.getX(i);
        const v = uvAttr.getY(i);
        uvAttr.setXY(
          i,
          result.uvOffsetX + u * result.uvScaleX,
          result.uvOffsetY + v * result.uvScaleY
        );
      }
      uvAttr.needsUpdate = true;

      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.map = texture;
      mat.needsUpdate = true;
    });

    return () => { cancelled = true; };
  }, [gridInfo, geometry]);

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color="#aaa"
        side={THREE.DoubleSide}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
}
