"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import { MapEditor } from "@/components/map-editor/MapEditor";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { TileLayerType } from "@/components/map-editor/MapEditorCore";

interface SavedAnnotation {
  id: number;
  name: string;
  geoJson: string;
  mapCenter: string | null;
  mapZoom: number | null;
  tileLayer: string | null;
}

function MapEditorContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId")
    ? Number(searchParams.get("projectId"))
    : undefined;
  const lat = searchParams.get("lat") ? Number(searchParams.get("lat")) : undefined;
  const lon = searchParams.get("lon") ? Number(searchParams.get("lon")) : undefined;

  const [loading, setLoading] = useState(!!projectId);
  const [annotation, setAnnotation] = useState<SavedAnnotation | null>(null);

  // Load existing annotation
  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/map-annotations`);
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            setAnnotation(data[0]);
          }
        }
      } catch (e) {
        console.error("Failed to load annotation:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  // Save handler
  const handleSave = useCallback(
    async (data: {
      geoJson: string;
      center: [number, number];
      zoom: number;
      tileLayer: TileLayerType;
      name: string;
    }) => {
      if (!projectId) return;
      const res = await fetch(`/api/projects/${projectId}/map-annotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: annotation?.id,
          name: data.name,
          geoJson: data.geoJson,
          mapCenter: JSON.stringify(data.center),
          mapZoom: data.zoom,
          tileLayer: data.tileLayer,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        setAnnotation(saved);
        alert("保存しました");
      } else {
        const err = await res.json();
        throw new Error(err.error || "保存失敗");
      }
    },
    [projectId, annotation?.id]
  );

  // Compute initial center with safe JSON parsing
  const parseMapCenter = (mapCenter: string | null): [number, number] | null => {
    if (!mapCenter) return null;
    try {
      const parsed = JSON.parse(mapCenter);
      if (Array.isArray(parsed) && parsed.length === 2 &&
          typeof parsed[0] === "number" && typeof parsed[1] === "number") {
        return parsed as [number, number];
      }
      return null;
    } catch {
      return null;
    }
  };

  const initialCenter: [number, number] =
    parseMapCenter(annotation?.mapCenter ?? null) ??
    (lat && lon ? [lat, lon] : [36.0, 138.0]);

  const initialZoom = annotation?.mapZoom ?? (lat && lon ? 16 : 5);
  const initialTileLayer = (annotation?.tileLayer as TileLayerType) ?? "photo";
  const siteCoordinate: [number, number] | undefined =
    lat && lon ? [lat, lon] : undefined;

  if (loading) {
    return (
      <div className="w-full h-[calc(100vh-64px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-background">
        <Link href={projectId ? `/projects/${projectId}` : "/tools"}>
          <Button variant="ghost" size="sm" className="h-8">
            <ArrowLeft className="h-4 w-4 mr-1" />
            戻る
          </Button>
        </Link>
        <h1 className="text-sm font-medium">
          現場案内図エディタ
          {projectId && <span className="text-muted-foreground ml-2">案件ID: {projectId}</span>}
        </h1>
      </div>
      <div className="flex-1">
        <MapEditor
          projectId={projectId}
          initialCenter={initialCenter}
          initialZoom={initialZoom}
          initialTileLayer={initialTileLayer}
          initialGeoJson={annotation?.geoJson}
          annotationId={annotation?.id}
          annotationName={annotation?.name}
          siteCoordinate={siteCoordinate}
          onSave={projectId ? handleSave : undefined}
        />
      </div>
    </div>
  );
}

export default function MapEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-[calc(100vh-64px)] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <MapEditorContent />
    </Suspense>
  );
}
