"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { TileLayerType } from "./MapEditorCore";

const MapEditorCore = dynamic(() => import("./MapEditorCore"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted/30">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface MapEditorProps {
  projectId?: number;
  initialCenter?: [number, number];
  initialZoom?: number;
  initialTileLayer?: TileLayerType;
  initialGeoJson?: string;
  annotationId?: number;
  annotationName?: string;
  siteCoordinate?: [number, number];
  onSave?: (data: {
    geoJson: string;
    center: [number, number];
    zoom: number;
    tileLayer: TileLayerType;
    name: string;
  }) => Promise<void>;
}

export function MapEditor(props: MapEditorProps) {
  return <MapEditorCore {...props} />;
}
