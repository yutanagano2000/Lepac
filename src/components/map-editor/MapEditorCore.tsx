"use client";

import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import { DrawingToolbar } from "./DrawingToolbar";
import { TextInputDialog, LeaderInputDialog } from "./InputDialog";
import { TILE_LAYERS, createSitePinIcon, createLeaderBoxHtml, formatCoord, escapeHtml } from "./constants";
import type { TileLayerType } from "./constants";
export type { TileLayerType } from "./constants";
import type { MapEditorCoreProps } from "./types";
import { useMapEditorState, useMapEditorDialogs, useImageOverlay } from "./_hooks";

// Leaflet default icon fix for Next.js/Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Hide leaflet-draw default toolbar via CSS
const hideDrawToolbarStyle = `
  .leaflet-draw-toolbar,
  .leaflet-draw-actions,
  .leaflet-draw.leaflet-control {
    display: none !important;
  }
`;

export default function MapEditorCore({
  projectId,
  initialCenter = [36.0, 138.0],
  initialZoom = 5,
  initialTileLayer = "photo",
  initialGeoJson,
  annotationId,
  annotationName = "無題の案内図",
  siteCoordinate,
  onSave,
}: MapEditorCoreProps) {
  // Map refs
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Coordinate overlay refs
  const coordTopRightRef = useRef<HTMLDivElement | null>(null);
  const coordBottomRef = useRef<HTMLDivElement | null>(null);

  // Site pin ref
  const sitePinRef = useRef<L.Marker | null>(null);

  // Leader links ref
  const leaderLinksRef = useRef<Map<string, { anchor: L.CircleMarker; line: L.Polyline; box: L.Marker }>>(new Map());

  // Custom hooks
  const editorState = useMapEditorState(initialTileLayer, annotationName, siteCoordinate);
  const dialogs = useMapEditorDialogs();
  const imageOverlay = useImageOverlay();

  // Update coordinate overlay text
  const updateCoordOverlay = useCallback((lat: number, lng: number) => {
    const text = formatCoord(lat, lng);
    if (coordTopRightRef.current) coordTopRightRef.current.textContent = text;
    if (coordBottomRef.current) coordBottomRef.current.textContent = text;
    editorState.setCurrentCoord([lat, lng]);
  }, [editorState]);

  // Create coordinate overlay DOM elements
  const createCoordOverlays = useCallback((container: HTMLElement, lat: number, lng: number) => {
    // Top-right overlay
    const topRight = document.createElement("div");
    topRight.className = "coord-overlay-topright";
    topRight.style.cssText = "position:absolute;top:12px;right:12px;z-index:1000;background:rgba(0,0,0,0.7);color:#fff;padding:6px 12px;border-radius:4px;font-family:'Consolas','Monaco','Courier New',monospace;font-size:13px;pointer-events:none;";
    topRight.textContent = formatCoord(lat, lng);
    container.appendChild(topRight);
    coordTopRightRef.current = topRight;

    // Bottom-center overlay
    const bottom = document.createElement("div");
    bottom.className = "coord-overlay-bottom";
    bottom.style.cssText = "position:absolute;bottom:24px;left:50%;transform:translateX(-50%);z-index:1000;background:rgba(0,0,0,0.7);color:#fff;padding:6px 12px;border-radius:4px;font-family:'Consolas','Monaco','Courier New',monospace;font-size:13px;pointer-events:none;";
    bottom.textContent = formatCoord(lat, lng);
    container.appendChild(bottom);
    coordBottomRef.current = bottom;
  }, []);

  // Place site pin on map
  const placeSitePin = useCallback((map: L.Map, latlng: L.LatLng, featureGroup: L.FeatureGroup) => {
    if (sitePinRef.current) {
      featureGroup.removeLayer(sitePinRef.current);
    }

    const pin = L.marker(latlng, {
      icon: createSitePinIcon(),
      draggable: true,
      zIndexOffset: 1000,
    });

    (pin as any).feature = {
      type: "Feature",
      properties: { isSitePin: true, lat: latlng.lat, lng: latlng.lng },
      geometry: { type: "Point", coordinates: [latlng.lng, latlng.lat] },
    };

    pin.on("dragend", () => {
      const pos = pin.getLatLng();
      (pin as any).feature.properties.lat = pos.lat;
      (pin as any).feature.properties.lng = pos.lng;
      (pin as any).feature.geometry.coordinates = [pos.lng, pos.lat];
      updateCoordOverlay(pos.lat, pos.lng);
      editorState.markAsChanged();
    });

    featureGroup.addLayer(pin);
    sitePinRef.current = pin;
    updateCoordOverlay(latlng.lat, latlng.lng);
    editorState.markAsChanged();

    return pin;
  }, [updateCoordOverlay, editorState]);

  // Create leader annotation (anchor + line + box)
  const createLeaderAnnotation = useCallback((
    map: L.Map,
    featureGroup: L.FeatureGroup,
    anchorLatLng: L.LatLng,
    boxLatLng: L.LatLng,
    postalCode: string,
    address: string,
    annotationIdParam?: string,
  ) => {
    const id = annotationIdParam || `leader-${Date.now()}`;

    const anchor = L.circleMarker(anchorLatLng, {
      radius: 5,
      color: "#333",
      fillColor: "#333",
      fillOpacity: 1,
      weight: 2,
    });
    (anchor as any).feature = {
      type: "Feature",
      properties: { isLeaderAnchor: true, annotationId: id },
      geometry: { type: "Point", coordinates: [anchorLatLng.lng, anchorLatLng.lat] },
    };

    const line = L.polyline([anchorLatLng, boxLatLng], {
      color: "#333",
      weight: 2,
    });
    (line as any).feature = {
      type: "Feature",
      properties: { isLeaderLine: true, annotationId: id },
      geometry: {
        type: "LineString",
        coordinates: [
          [anchorLatLng.lng, anchorLatLng.lat],
          [boxLatLng.lng, boxLatLng.lat],
        ],
      },
    };

    const box = L.marker(boxLatLng, {
      icon: L.divIcon({
        className: "leader-box-icon",
        html: createLeaderBoxHtml(postalCode, address),
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      }),
      draggable: true,
      zIndexOffset: 500,
    });
    (box as any).feature = {
      type: "Feature",
      properties: { isLeaderBox: true, annotationId: id, postalCode, address },
      geometry: { type: "Point", coordinates: [boxLatLng.lng, boxLatLng.lat] },
    };

    box.on("dblclick", (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      dialogs.openEditLeaderDialog(id, postalCode, address);
    });

    box.on("drag", () => {
      const newPos = box.getLatLng();
      line.setLatLngs([anchorLatLng, newPos]);
    });
    box.on("dragend", () => {
      const newPos = box.getLatLng();
      (box as any).feature.geometry.coordinates = [newPos.lng, newPos.lat];
      (line as any).feature.geometry.coordinates[1] = [newPos.lng, newPos.lat];
      editorState.markAsChanged();
    });

    featureGroup.addLayer(anchor);
    featureGroup.addLayer(line);
    featureGroup.addLayer(box);

    leaderLinksRef.current.set(id, { anchor, line, box });
    editorState.markAsChanged();

    return id;
  }, [editorState, dialogs]);

  // Update leader annotation
  const updateLeaderAnnotation = useCallback((id: string, postalCode: string, address: string) => {
    const leaderData = leaderLinksRef.current.get(id);
    if (!leaderData) return;

    const { box } = leaderData;
    const newIcon = L.divIcon({
      className: "leader-box-icon",
      html: createLeaderBoxHtml(postalCode, address),
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
    box.setIcon(newIcon);
    (box as any).feature.properties.postalCode = postalCode;
    (box as any).feature.properties.address = address;
    editorState.markAsChanged();
  }, [editorState]);

  // Create text marker
  const createTextMarker = useCallback((map: L.Map, featureGroup: L.FeatureGroup, latlng: L.LatLng, label: string) => {
    const safeLabel = escapeHtml(label);
    const marker = L.marker(latlng, {
      icon: L.divIcon({
        className: "map-text-label",
        html: `<div style="background:rgba(255,255,255,0.9);padding:2px 6px;border:1px solid #666;border-radius:3px;font-size:13px;white-space:nowrap;color:#000;cursor:pointer;">${safeLabel}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      }),
      draggable: true,
    });
    (marker as any).feature = {
      type: "Feature",
      properties: { label, isTextAnnotation: true },
      geometry: { type: "Point", coordinates: [latlng.lng, latlng.lat] },
    };

    marker.on("dblclick", (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      dialogs.openEditTextDialog(marker, (marker as any).feature.properties.label);
    });

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      (marker as any).feature.geometry.coordinates = [pos.lng, pos.lat];
      editorState.markAsChanged();
    });

    featureGroup.addLayer(marker);
    editorState.markAsChanged();
    return marker;
  }, [editorState, dialogs]);

  // Update text marker
  const updateTextMarker = useCallback((marker: L.Marker, newLabel: string) => {
    const safeLabel = escapeHtml(newLabel);
    const newIcon = L.divIcon({
      className: "map-text-label",
      html: `<div style="background:rgba(255,255,255,0.9);padding:2px 6px;border:1px solid #666;border-radius:3px;font-size:13px;white-space:nowrap;color:#000;cursor:pointer;">${safeLabel}</div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
    marker.setIcon(newIcon);
    (marker as any).feature.properties.label = newLabel;
    editorState.markAsChanged();
  }, [editorState]);

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (editorState.hasUnsavedChanges && onSave) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [editorState.hasUnsavedChanges, onSave]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const styleEl = document.createElement("style");
    styleEl.textContent = hideDrawToolbarStyle;
    document.head.appendChild(styleEl);

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: true,
    });

    const tileConfig = TILE_LAYERS[initialTileLayer];
    const tileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    featureGroupRef.current.addTo(map);

    const drawControl = new L.Control.Draw({
      position: "topright",
      draw: {
        polyline: { shapeOptions: { color: "#3b82f6", weight: 3 } },
        polygon: { shapeOptions: { color: "#ef4444", weight: 2, fillOpacity: 0.2 }, allowIntersection: false, showArea: true },
        rectangle: { shapeOptions: { color: "#f59e0b", weight: 2, fillOpacity: 0.15 } },
        circle: false,
        circlemarker: false,
        marker: {},
      },
      edit: { featureGroup: featureGroupRef.current, remove: true },
    });
    drawControl.addTo(map);
    drawControlRef.current = drawControl;

    map.on(L.Draw.Event.CREATED, (e: any) => {
      featureGroupRef.current.addLayer(e.layer);
      editorState.markAsChanged();
    });
    map.on(L.Draw.Event.EDITED, () => editorState.markAsChanged());
    map.on(L.Draw.Event.DELETED, () => editorState.markAsChanged());

    if (siteCoordinate && mapContainerRef.current) {
      createCoordOverlays(mapContainerRef.current, siteCoordinate[0], siteCoordinate[1]);
    }

    // Load initial GeoJSON
    if (initialGeoJson) {
      try {
        const geoJsonData = JSON.parse(initialGeoJson);
        const leaderAnchors: Map<string, L.CircleMarker> = new Map();
        const leaderLines: Map<string, L.Polyline> = new Map();
        const leaderBoxes: Map<string, { marker: L.Marker; postalCode: string; address: string }> = new Map();

        L.geoJSON(geoJsonData, {
          pointToLayer: (feature, latlng) => {
            if (feature.properties?.isSitePin) {
              const pin = L.marker(latlng, { icon: createSitePinIcon(), draggable: true, zIndexOffset: 1000 });
              pin.on("dragend", () => {
                const pos = pin.getLatLng();
                (pin as any).feature.properties.lat = pos.lat;
                (pin as any).feature.properties.lng = pos.lng;
                (pin as any).feature.geometry.coordinates = [pos.lng, pos.lat];
                updateCoordOverlay(pos.lat, pos.lng);
                editorState.markAsChanged();
              });
              sitePinRef.current = pin;
              updateCoordOverlay(latlng.lat, latlng.lng);
              if (!coordTopRightRef.current && mapContainerRef.current) {
                createCoordOverlays(mapContainerRef.current, latlng.lat, latlng.lng);
              }
              return pin;
            }

            if (feature.properties?.isLeaderAnchor) {
              const anchor = L.circleMarker(latlng, { radius: 5, color: "#333", fillColor: "#333", fillOpacity: 1, weight: 2 });
              const aid = feature.properties.annotationId;
              if (aid) leaderAnchors.set(aid, anchor);
              return anchor as any;
            }

            if (feature.properties?.isLeaderBox) {
              const { postalCode, address, annotationId: aid } = feature.properties;
              const box = L.marker(latlng, {
                icon: L.divIcon({ className: "leader-box-icon", html: createLeaderBoxHtml(postalCode || "", address || ""), iconSize: [0, 0], iconAnchor: [0, 0] }),
                draggable: true,
                zIndexOffset: 500,
              });
              box.on("dblclick", (e: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(e);
                dialogs.openEditLeaderDialog(aid, postalCode || "", address || "");
              });
              if (aid) leaderBoxes.set(aid, { marker: box, postalCode: postalCode || "", address: address || "" });
              return box;
            }

            if (feature.properties?.isTextAnnotation && feature.properties?.label) {
              const safeLabel = escapeHtml(feature.properties.label);
              const marker = L.marker(latlng, {
                icon: L.divIcon({ className: "map-text-label", html: `<div style="background:rgba(255,255,255,0.9);padding:2px 6px;border:1px solid #666;border-radius:3px;font-size:13px;white-space:nowrap;color:#000;cursor:pointer;">${safeLabel}</div>`, iconSize: [0, 0], iconAnchor: [0, 0] }),
                draggable: true,
              });
              marker.on("dblclick", (e: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(e);
                dialogs.openEditTextDialog(marker, (marker as any).feature?.properties?.label || feature.properties.label);
              });
              marker.on("dragend", () => {
                const pos = marker.getLatLng();
                if ((marker as any).feature) (marker as any).feature.geometry.coordinates = [pos.lng, pos.lat];
                editorState.markAsChanged();
              });
              return marker;
            }

            return L.marker(latlng);
          },
          onEachFeature: (feature, layer) => {
            (layer as any).feature = feature;
            if (feature.properties?.isLeaderLine) {
              const aid = feature.properties.annotationId;
              if (aid) leaderLines.set(aid, layer as L.Polyline);
            }
          },
          style: (feature) => {
            if (feature?.properties?.isLeaderLine) return { color: "#333", weight: 2 };
            if (feature?.geometry.type === "Polygon" || feature?.geometry.type === "MultiPolygon") return { color: "#ef4444", weight: 2, fillOpacity: 0.2 };
            if (feature?.geometry.type === "LineString" || feature?.geometry.type === "MultiLineString") return { color: "#3b82f6", weight: 3 };
            return {};
          },
        }).eachLayer((layer) => featureGroupRef.current.addLayer(layer));

        for (const [aid, anchor] of leaderAnchors) {
          const line = leaderLines.get(aid);
          const boxData = leaderBoxes.get(aid);
          if (line && boxData) {
            const { marker: box } = boxData;
            const anchorLatLng = anchor.getLatLng();
            box.on("drag", () => line.setLatLngs([anchorLatLng, box.getLatLng()]));
            box.on("dragend", () => {
              const newPos = box.getLatLng();
              (box as any).feature.geometry.coordinates = [newPos.lng, newPos.lat];
              const lineFeature = (line as any).feature;
              if (lineFeature?.geometry?.coordinates) lineFeature.geometry.coordinates[1] = [newPos.lng, newPos.lat];
              editorState.markAsChanged();
            });
            leaderLinksRef.current.set(aid, { anchor, line, box });
          }
        }
      } catch (e) {
        console.error("Failed to parse GeoJSON:", e);
      }
    }

    if (siteCoordinate && !sitePinRef.current) {
      placeSitePin(map, L.latLng(siteCoordinate[0], siteCoordinate[1]), featureGroupRef.current);
      editorState.setHasUnsavedChanges(false);
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      styleEl.remove();
      coordTopRightRef.current = null;
      coordBottomRef.current = null;
      sitePinRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click handler for text, leader, and site pin modes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handler = (e: L.LeafletMouseEvent) => {
      if (editorState.isSitePinMode) {
        placeSitePin(map, e.latlng, featureGroupRef.current);
        if (!coordTopRightRef.current && mapContainerRef.current) {
          createCoordOverlays(mapContainerRef.current, e.latlng.lat, e.latlng.lng);
        }
        editorState.setIsSitePinMode(false);
        return;
      }

      if (editorState.isLeaderMode) {
        if (!editorState.leaderAnchorRef.current) {
          editorState.leaderAnchorRef.current = e.latlng;
          return;
        }
        const anchorLatlng = editorState.leaderAnchorRef.current;
        editorState.leaderAnchorRef.current = null;
        dialogs.openLeaderDialog(anchorLatlng, e.latlng);
        editorState.setIsLeaderMode(false);
        return;
      }

      if (editorState.isTextMode) {
        dialogs.openTextDialog(e.latlng);
        editorState.setIsTextMode(false);
      }
    };

    map.on("click", handler);
    return () => { map.off("click", handler); };
  }, [editorState.isTextMode, editorState.isLeaderMode, editorState.isSitePinMode, editorState, placeSitePin, createCoordOverlays, dialogs]);

  // Update cursor for active mode
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (editorState.isTextMode || editorState.isLeaderMode || editorState.isSitePinMode) {
      mapContainerRef.current.style.cursor = "crosshair";
    } else {
      mapContainerRef.current.style.cursor = "";
    }
  }, [editorState.isTextMode, editorState.isLeaderMode, editorState.isSitePinMode]);

  // Switch tile layer
  const switchTileLayer = useCallback((type: TileLayerType) => {
    if (!mapRef.current || !tileLayerRef.current) return;
    tileLayerRef.current.setUrl(TILE_LAYERS[type].url);
    editorState.setActiveTile(type);
  }, [editorState]);

  // Clear all drawings
  const clearAll = useCallback(() => {
    if (confirm("全ての描画を削除しますか？")) {
      featureGroupRef.current.clearLayers();
      sitePinRef.current = null;
      leaderLinksRef.current.clear();
      if (coordTopRightRef.current) { coordTopRightRef.current.remove(); coordTopRightRef.current = null; }
      if (coordBottomRef.current) { coordBottomRef.current.remove(); coordBottomRef.current = null; }
      editorState.setCurrentCoord(null);
      imageOverlay.handleRemoveOverlay(mapRef.current);
      editorState.markAsChanged();
    }
  }, [editorState, imageOverlay]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!mapRef.current || !onSave) return;
    editorState.setSaving(true);
    try {
      const geoJson = JSON.stringify((featureGroupRef.current as any).toGeoJSON());
      const center = mapRef.current.getCenter();
      const zoom = mapRef.current.getZoom();
      await onSave({ geoJson, center: [center.lat, center.lng], zoom, tileLayer: editorState.activeTile, name: editorState.name });
      editorState.setHasUnsavedChanges(false);
    } catch (e) {
      console.error("Save failed:", e);
      alert("保存に失敗しました");
    } finally {
      editorState.setSaving(false);
    }
  }, [onSave, editorState]);

  // Dialog submit handlers
  const handleTextSubmit = useCallback((text: string) => {
    const map = mapRef.current;
    if (!map || !dialogs.pendingTextLatLng) return;
    createTextMarker(map, featureGroupRef.current, dialogs.pendingTextLatLng, text);
    dialogs.closeTextDialog();
  }, [dialogs, createTextMarker]);

  const handleLeaderSubmit = useCallback((postalCode: string, address: string) => {
    const map = mapRef.current;
    if (!map || !dialogs.pendingLeaderLatLngs) return;
    createLeaderAnnotation(map, featureGroupRef.current, dialogs.pendingLeaderLatLngs.anchor, dialogs.pendingLeaderLatLngs.box, postalCode, address);
    dialogs.closeLeaderDialog();
  }, [dialogs, createLeaderAnnotation]);

  const handleEditTextSubmit = useCallback((text: string) => {
    if (!dialogs.editingTextMarker) return;
    updateTextMarker(dialogs.editingTextMarker, text);
    dialogs.closeEditTextDialog();
  }, [dialogs, updateTextMarker]);

  const handleEditLeaderSubmit = useCallback((postalCode: string, address: string) => {
    if (!dialogs.editingLeaderId) return;
    updateLeaderAnnotation(dialogs.editingLeaderId, postalCode, address);
    dialogs.closeEditLeaderDialog();
  }, [dialogs, updateLeaderAnnotation]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" id="map-editor-container" />
      <DrawingToolbar
        activeTile={editorState.activeTile}
        onTileChange={switchTileLayer}
        onClear={clearAll}
        onSave={onSave ? handleSave : undefined}
        saving={editorState.saving}
        name={editorState.name}
        onNameChange={editorState.setName}
        isTextMode={editorState.isTextMode}
        onToggleTextMode={editorState.toggleTextMode}
        isLeaderMode={editorState.isLeaderMode}
        onToggleLeaderMode={editorState.toggleLeaderMode}
        isSitePinMode={editorState.isSitePinMode}
        onToggleSitePinMode={editorState.toggleSitePinMode}
        mapContainerRef={mapContainerRef}
        projectId={projectId}
        onImageUpload={(dataUrl) => imageOverlay.handleImageUpload(dataUrl, mapRef.current)}
        overlayOpacity={imageOverlay.overlayOpacity}
        onOpacityChange={imageOverlay.handleOpacityChange}
        overlayVisible={imageOverlay.overlayVisible}
        onToggleOverlay={imageOverlay.handleToggleOverlay}
        onRemoveOverlay={() => imageOverlay.handleRemoveOverlay(mapRef.current)}
        hasOverlay={!!imageOverlay.overlayImage}
        hasUnsavedChanges={editorState.hasUnsavedChanges}
      />

      <TextInputDialog
        open={dialogs.textDialogOpen}
        onOpenChange={(open) => { dialogs.setTextDialogOpen(open); if (!open) dialogs.setPendingTextLatLng(null); }}
        onSubmit={handleTextSubmit}
        title="テキストラベルを追加"
        placeholder="ラベルを入力..."
      />

      <LeaderInputDialog
        open={dialogs.leaderDialogOpen}
        onOpenChange={(open) => { dialogs.setLeaderDialogOpen(open); if (!open) dialogs.setPendingLeaderLatLngs(null); }}
        onSubmit={handleLeaderSubmit}
      />

      <TextInputDialog
        open={dialogs.editTextDialogOpen}
        onOpenChange={(open) => { dialogs.setEditTextDialogOpen(open); if (!open) dialogs.closeEditTextDialog(); }}
        onSubmit={handleEditTextSubmit}
        title="テキストラベルを編集"
        placeholder="ラベルを入力..."
        initialValue={dialogs.editingTextValue}
      />

      <LeaderInputDialog
        open={dialogs.editLeaderDialogOpen}
        onOpenChange={(open) => { dialogs.setEditLeaderDialogOpen(open); if (!open) dialogs.closeEditLeaderDialog(); }}
        onSubmit={handleEditLeaderSubmit}
        initialPostalCode={dialogs.editingLeaderPostalCode}
        initialAddress={dialogs.editingLeaderAddress}
        isEditing
      />
    </div>
  );
}
