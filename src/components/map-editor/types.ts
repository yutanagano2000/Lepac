import type { TileLayerType } from "./constants";

export interface MapEditorCoreProps {
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
