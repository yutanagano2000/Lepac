"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { DrawMode } from "./PolygonToolbar";

const PolygonDrawMapCore = dynamic(() => import("./PolygonDrawMapCore"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface PolygonDrawMapProps {
  onPolygonReady: (coords: [number, number][]) => void;
  onCrossSectionLine?: (coords: [number, number][]) => void;
  slopeOverlay?: {
    originLat: number;
    originLon: number;
    interval: number;
    slopeMatrix: (number | null)[][];
  };
  flyTo?: [number, number] | null;
  analyzed?: boolean;
  initialCenter?: [number, number];
  initialZoom?: number;
  drawMode?: DrawMode;
  onDrawModeChange?: (mode: DrawMode) => void;
}

export function PolygonDrawMap(props: PolygonDrawMapProps) {
  return <PolygonDrawMapCore {...props} />;
}
