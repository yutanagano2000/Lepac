"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import { DrawingToolbar } from "./DrawingToolbar";
import { TextInputDialog, LeaderInputDialog } from "./InputDialog";
import { TILE_LAYERS, createSitePinIcon, createLeaderBoxHtml, formatCoord } from "./constants";
import type { TileLayerType } from "./constants";
export type { TileLayerType } from "./constants";
import type { MapEditorCoreProps } from "./types";

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
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Refs for coordinate overlay DOM elements
  const coordTopRightRef = useRef<HTMLDivElement | null>(null);
  const coordBottomRef = useRef<HTMLDivElement | null>(null);

  // Ref for site pin marker
  const sitePinRef = useRef<L.Marker | null>(null);

  // Leader line mode refs
  const leaderAnchorRef = useRef<L.LatLng | null>(null);
  const leaderLinksRef = useRef<Map<string, { anchor: L.CircleMarker; line: L.Polyline; box: L.Marker }>>(new Map());

  // 画像オーバーレイ refs
  const imageOverlayRef = useRef<L.ImageOverlay | null>(null);
  const cornerMarkersRef = useRef<L.CircleMarker[]>([]);

  const [activeTile, setActiveTile] = useState<TileLayerType>(initialTileLayer);
  const [drawMode, setDrawMode] = useState<string | null>(null);
  const [name, setName] = useState(annotationName);
  const [saving, setSaving] = useState(false);
  const [isTextMode, setIsTextMode] = useState(false);
  const [isLeaderMode, setIsLeaderMode] = useState(false);
  const [isSitePinMode, setIsSitePinMode] = useState(false);
  const [currentCoord, setCurrentCoord] = useState<[number, number] | null>(siteCoordinate ?? null);

  // 画像オーバーレイ状態
  const [overlayImage, setOverlayImage] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [overlayVisible, setOverlayVisible] = useState(true);

  // ダイアログ状態
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [leaderDialogOpen, setLeaderDialogOpen] = useState(false);
  const [pendingTextLatLng, setPendingTextLatLng] = useState<L.LatLng | null>(null);
  const [pendingLeaderLatLngs, setPendingLeaderLatLngs] = useState<{ anchor: L.LatLng; box: L.LatLng } | null>(null);

  // 編集ダイアログ状態
  const [editTextDialogOpen, setEditTextDialogOpen] = useState(false);
  const [editLeaderDialogOpen, setEditLeaderDialogOpen] = useState(false);
  const [editingTextMarker, setEditingTextMarker] = useState<L.Marker | null>(null);
  const [editingTextValue, setEditingTextValue] = useState("");
  const [editingLeaderId, setEditingLeaderId] = useState<string | null>(null);
  const [editingLeaderPostalCode, setEditingLeaderPostalCode] = useState("");
  const [editingLeaderAddress, setEditingLeaderAddress] = useState("");

  // 未保存変更の追跡
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 変更を記録
  const markAsChanged = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  // Update coordinate overlay text
  const updateCoordOverlay = useCallback((lat: number, lng: number) => {
    const text = formatCoord(lat, lng);
    if (coordTopRightRef.current) coordTopRightRef.current.textContent = text;
    if (coordBottomRef.current) coordBottomRef.current.textContent = text;
    setCurrentCoord([lat, lng]);
  }, []);

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
    // Remove existing site pin
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
      markAsChanged();
    });

    featureGroup.addLayer(pin);
    sitePinRef.current = pin;
    updateCoordOverlay(latlng.lat, latlng.lng);
    markAsChanged();

    return pin;
  }, [updateCoordOverlay, markAsChanged]);

  // Create leader annotation (anchor + line + box)
  const createLeaderAnnotation = useCallback((
    map: L.Map,
    featureGroup: L.FeatureGroup,
    anchorLatLng: L.LatLng,
    boxLatLng: L.LatLng,
    postalCode: string,
    address: string,
    annotationId?: string,
  ) => {
    const id = annotationId || `leader-${Date.now()}`;

    // Anchor marker (black circle)
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

    // Leader line
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

    // Address box marker
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

    // ダブルクリックで編集
    box.on("dblclick", (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      setEditingLeaderId(id);
      setEditingLeaderPostalCode(postalCode);
      setEditingLeaderAddress(address);
      setEditLeaderDialogOpen(true);
    });

    // Drag handler: update line endpoint when box is dragged
    box.on("drag", () => {
      const newPos = box.getLatLng();
      line.setLatLngs([anchorLatLng, newPos]);
    });
    box.on("dragend", () => {
      const newPos = box.getLatLng();
      (box as any).feature.geometry.coordinates = [newPos.lng, newPos.lat];
      (line as any).feature.geometry.coordinates[1] = [newPos.lng, newPos.lat];
      markAsChanged();
    });

    featureGroup.addLayer(anchor);
    featureGroup.addLayer(line);
    featureGroup.addLayer(box);

    leaderLinksRef.current.set(id, { anchor, line, box });
    markAsChanged();

    return id;
  }, [markAsChanged]);

  // 引き出し線の更新
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
    markAsChanged();
  }, [markAsChanged]);

  // テキストマーカー作成
  const createTextMarker = useCallback((map: L.Map, featureGroup: L.FeatureGroup, latlng: L.LatLng, label: string) => {
    const marker = L.marker(latlng, {
      icon: L.divIcon({
        className: "map-text-label",
        html: `<div style="background:rgba(255,255,255,0.9);padding:2px 6px;border:1px solid #666;border-radius:3px;font-size:13px;white-space:nowrap;color:#000;cursor:pointer;">${label}</div>`,
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

    // ダブルクリックで編集
    marker.on("dblclick", (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      setEditingTextMarker(marker);
      setEditingTextValue((marker as any).feature.properties.label);
      setEditTextDialogOpen(true);
    });

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      (marker as any).feature.geometry.coordinates = [pos.lng, pos.lat];
      markAsChanged();
    });

    featureGroup.addLayer(marker);
    markAsChanged();
    return marker;
  }, [markAsChanged]);

  // テキストマーカー更新
  const updateTextMarker = useCallback((marker: L.Marker, newLabel: string) => {
    const newIcon = L.divIcon({
      className: "map-text-label",
      html: `<div style="background:rgba(255,255,255,0.9);padding:2px 6px;border:1px solid #666;border-radius:3px;font-size:13px;white-space:nowrap;color:#000;cursor:pointer;">${newLabel}</div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
    marker.setIcon(newIcon);
    (marker as any).feature.properties.label = newLabel;
    markAsChanged();
  }, [markAsChanged]);

  // ─── 画像オーバーレイ: コーナーマーカー配置 ───
  const placeCornerMarkers = useCallback((map: L.Map, bounds: L.LatLngBounds) => {
    cornerMarkersRef.current.forEach((m) => map.removeLayer(m));
    cornerMarkersRef.current = [];

    const corners = [
      bounds.getNorthWest(),
      bounds.getNorthEast(),
      bounds.getSouthEast(),
      bounds.getSouthWest(),
    ];

    const markers = corners.map((corner) => {
      const marker = L.circleMarker(corner, {
        radius: 8,
        color: "#ef4444",
        fillColor: "#ef4444",
        fillOpacity: 0.5,
        weight: 2,
        interactive: true,
      });
      let dragging = false;
      marker.on("mousedown", (e: L.LeafletMouseEvent) => {
        dragging = true;
        map.dragging.disable();
        L.DomEvent.stopPropagation(e.originalEvent);
      });
      map.on("mousemove", (e: L.LeafletMouseEvent) => {
        if (!dragging) return;
        marker.setLatLng(e.latlng);
        const currentPositions = cornerMarkersRef.current.map((m) => m.getLatLng());
        const lats = currentPositions.map((p) => p.lat);
        const lngs = currentPositions.map((p) => p.lng);
        const newBounds = L.latLngBounds(
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)]
        );
        imageOverlayRef.current?.setBounds(newBounds);
      });
      map.on("mouseup", () => {
        if (!dragging) return;
        dragging = false;
        map.dragging.enable();
      });
      marker.addTo(map);
      return marker;
    });

    cornerMarkersRef.current = markers;
  }, []);

  // ─── 画像オーバーレイ: アップロードハンドラ ───
  const handleImageUpload = useCallback((dataUrl: string) => {
    const map = mapRef.current;
    if (!map) return;
    if (imageOverlayRef.current) {
      map.removeLayer(imageOverlayRef.current);
    }
    cornerMarkersRef.current.forEach((m) => map.removeLayer(m));
    cornerMarkersRef.current = [];

    const bounds = map.getBounds();
    const overlay = L.imageOverlay(dataUrl, bounds, { opacity: 0.5 });
    overlay.addTo(map);
    imageOverlayRef.current = overlay;

    setOverlayImage(dataUrl);
    setOverlayOpacity(0.5);
    setOverlayVisible(true);

    placeCornerMarkers(map, bounds);
  }, [placeCornerMarkers]);

  // ─── 画像オーバーレイ: 透過度変更 ───
  const handleOpacityChange = useCallback((value: number) => {
    setOverlayOpacity(value);
    imageOverlayRef.current?.setOpacity(value);
  }, []);

  // ─── 画像オーバーレイ: 表示/非表示 ───
  const handleToggleOverlay = useCallback(() => {
    setOverlayVisible((prev) => {
      const next = !prev;
      if (imageOverlayRef.current) {
        imageOverlayRef.current.setOpacity(next ? overlayOpacity : 0);
      }
      cornerMarkersRef.current.forEach((m) => {
        m.setStyle({ opacity: next ? 1 : 0, fillOpacity: next ? 0.5 : 0 });
      });
      return next;
    });
  }, [overlayOpacity]);

  // ─── 画像オーバーレイ: 削除 ───
  const handleRemoveOverlay = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (imageOverlayRef.current) {
      map.removeLayer(imageOverlayRef.current);
      imageOverlayRef.current = null;
    }
    cornerMarkersRef.current.forEach((m) => map.removeLayer(m));
    cornerMarkersRef.current = [];
    setOverlayImage(null);
    setOverlayOpacity(0.5);
    setOverlayVisible(true);
  }, []);

  // 未保存変更の警告
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && onSave) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges, onSave]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Inject CSS to hide default leaflet-draw toolbar
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

    // Add draw control (hidden via CSS, but needed for internal functionality)
    const drawControl = new L.Control.Draw({
      position: "topright",
      draw: {
        polyline: {
          shapeOptions: { color: "#3b82f6", weight: 3 },
        },
        polygon: {
          shapeOptions: { color: "#ef4444", weight: 2, fillOpacity: 0.2 },
          allowIntersection: false,
          showArea: true,
        },
        rectangle: {
          shapeOptions: { color: "#f59e0b", weight: 2, fillOpacity: 0.15 },
        },
        circle: false,
        circlemarker: false,
        marker: {},
      },
      edit: {
        featureGroup: featureGroupRef.current,
        remove: true,
      },
    });
    drawControl.addTo(map);
    drawControlRef.current = drawControl;

    // Handle draw events
    map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      featureGroupRef.current.addLayer(layer);
      markAsChanged();
    });

    map.on(L.Draw.Event.EDITED, () => {
      markAsChanged();
    });

    map.on(L.Draw.Event.DELETED, () => {
      markAsChanged();
    });

    // Create coordinate overlays if siteCoordinate exists
    if (siteCoordinate && mapContainerRef.current) {
      createCoordOverlays(mapContainerRef.current, siteCoordinate[0], siteCoordinate[1]);
    }

    // Load initial GeoJSON
    if (initialGeoJson) {
      try {
        const geoJsonData = JSON.parse(initialGeoJson);
        // Collect leader components for linking after all layers are created
        const leaderAnchors: Map<string, L.CircleMarker> = new Map();
        const leaderLines: Map<string, L.Polyline> = new Map();
        const leaderBoxes: Map<string, { marker: L.Marker; postalCode: string; address: string }> = new Map();

        L.geoJSON(geoJsonData, {
          pointToLayer: (feature, latlng) => {
            // Site pin restoration
            if (feature.properties?.isSitePin) {
              const pin = L.marker(latlng, {
                icon: createSitePinIcon(),
                draggable: true,
                zIndexOffset: 1000,
              });
              pin.on("dragend", () => {
                const pos = pin.getLatLng();
                (pin as any).feature.properties.lat = pos.lat;
                (pin as any).feature.properties.lng = pos.lng;
                (pin as any).feature.geometry.coordinates = [pos.lng, pos.lat];
                updateCoordOverlay(pos.lat, pos.lng);
                markAsChanged();
              });
              sitePinRef.current = pin;
              // Update coordinate overlay with restored pin position
              updateCoordOverlay(latlng.lat, latlng.lng);
              // Create overlays if not already created
              if (!coordTopRightRef.current && mapContainerRef.current) {
                createCoordOverlays(mapContainerRef.current, latlng.lat, latlng.lng);
              }
              return pin;
            }

            // Leader anchor restoration
            if (feature.properties?.isLeaderAnchor) {
              const anchor = L.circleMarker(latlng, {
                radius: 5,
                color: "#333",
                fillColor: "#333",
                fillOpacity: 1,
                weight: 2,
              });
              const aid = feature.properties.annotationId;
              if (aid) leaderAnchors.set(aid, anchor);
              return anchor as any;
            }

            // Leader box restoration
            if (feature.properties?.isLeaderBox) {
              const { postalCode, address, annotationId: aid } = feature.properties;
              const box = L.marker(latlng, {
                icon: L.divIcon({
                  className: "leader-box-icon",
                  html: createLeaderBoxHtml(postalCode || "", address || ""),
                  iconSize: [0, 0],
                  iconAnchor: [0, 0],
                }),
                draggable: true,
                zIndexOffset: 500,
              });

              // ダブルクリックで編集
              box.on("dblclick", (e: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(e);
                setEditingLeaderId(aid);
                setEditingLeaderPostalCode(postalCode || "");
                setEditingLeaderAddress(address || "");
                setEditLeaderDialogOpen(true);
              });

              if (aid) leaderBoxes.set(aid, { marker: box, postalCode: postalCode || "", address: address || "" });
              return box;
            }

            // Text annotation restoration
            if (feature.properties?.isTextAnnotation && feature.properties?.label) {
              const marker = L.marker(latlng, {
                icon: L.divIcon({
                  className: "map-text-label",
                  html: `<div style="background:rgba(255,255,255,0.9);padding:2px 6px;border:1px solid #666;border-radius:3px;font-size:13px;white-space:nowrap;color:#000;cursor:pointer;">${feature.properties.label}</div>`,
                  iconSize: [0, 0],
                  iconAnchor: [0, 0],
                }),
                draggable: true,
              });

              // ダブルクリックで編集
              marker.on("dblclick", (e: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(e);
                setEditingTextMarker(marker);
                setEditingTextValue((marker as any).feature?.properties?.label || feature.properties.label);
                setEditTextDialogOpen(true);
              });

              marker.on("dragend", () => {
                const pos = marker.getLatLng();
                if ((marker as any).feature) {
                  (marker as any).feature.geometry.coordinates = [pos.lng, pos.lat];
                }
                markAsChanged();
              });

              return marker;
            }

            return L.marker(latlng);
          },
          onEachFeature: (feature, layer) => {
            // Attach feature to layer for GeoJSON export
            (layer as any).feature = feature;

            // Leader line restoration
            if (feature.properties?.isLeaderLine) {
              const aid = feature.properties.annotationId;
              if (aid) leaderLines.set(aid, layer as L.Polyline);
            }
          },
          style: (feature) => {
            // Leader line style
            if (feature?.properties?.isLeaderLine) {
              return { color: "#333", weight: 2 };
            }
            if (feature?.geometry.type === "Polygon" || feature?.geometry.type === "MultiPolygon") {
              return { color: "#ef4444", weight: 2, fillOpacity: 0.2 };
            }
            if (feature?.geometry.type === "LineString" || feature?.geometry.type === "MultiLineString") {
              return { color: "#3b82f6", weight: 3 };
            }
            return {};
          },
        }).eachLayer((layer) => {
          featureGroupRef.current.addLayer(layer);
        });

        // Link leader components (anchor + line + box) for drag behavior
        for (const [aid, anchor] of leaderAnchors) {
          const line = leaderLines.get(aid);
          const boxData = leaderBoxes.get(aid);
          if (line && boxData) {
            const { marker: box } = boxData;
            const anchorLatLng = anchor.getLatLng();
            box.on("drag", () => {
              const newPos = box.getLatLng();
              line.setLatLngs([anchorLatLng, newPos]);
            });
            box.on("dragend", () => {
              const newPos = box.getLatLng();
              (box as any).feature.geometry.coordinates = [newPos.lng, newPos.lat];
              const lineFeature = (line as any).feature;
              if (lineFeature?.geometry?.coordinates) {
                lineFeature.geometry.coordinates[1] = [newPos.lng, newPos.lat];
              }
              markAsChanged();
            });
            leaderLinksRef.current.set(aid, { anchor, line, box });
          }
        }
      } catch (e) {
        console.error("Failed to parse GeoJSON:", e);
      }
    }

    // Place site pin if siteCoordinate exists and no pin was restored from GeoJSON
    if (siteCoordinate && !sitePinRef.current) {
      placeSitePin(map, L.latLng(siteCoordinate[0], siteCoordinate[1]), featureGroupRef.current);
      // Reset hasUnsavedChanges since this is initial state
      setHasUnsavedChanges(false);
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      styleEl.remove();
      // Clean up overlay refs
      coordTopRightRef.current = null;
      coordBottomRef.current = null;
      sitePinRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Text mode + leader mode + site pin mode click handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handler = (e: L.LeafletMouseEvent) => {
      // Site pin mode
      if (isSitePinMode) {
        placeSitePin(map, e.latlng, featureGroupRef.current);
        // Create overlays if not yet present
        if (!coordTopRightRef.current && mapContainerRef.current) {
          createCoordOverlays(mapContainerRef.current, e.latlng.lat, e.latlng.lng);
        }
        setIsSitePinMode(false);
        return;
      }

      // Leader mode
      if (isLeaderMode) {
        if (!leaderAnchorRef.current) {
          // First click: set anchor point
          leaderAnchorRef.current = e.latlng;
          return;
        }
        // Second click: set box position, open dialog
        const anchorLatlng = leaderAnchorRef.current;
        const boxLatlng = e.latlng;
        leaderAnchorRef.current = null;

        setPendingLeaderLatLngs({ anchor: anchorLatlng, box: boxLatlng });
        setLeaderDialogOpen(true);
        setIsLeaderMode(false);
        return;
      }

      // Text mode
      if (isTextMode) {
        setPendingTextLatLng(e.latlng);
        setTextDialogOpen(true);
        setIsTextMode(false);
      }
    };

    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [isTextMode, isLeaderMode, isSitePinMode, placeSitePin, createCoordOverlays]);

  // Update cursor for active mode
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (isTextMode || isLeaderMode || isSitePinMode) {
      mapContainerRef.current.style.cursor = "crosshair";
    } else {
      mapContainerRef.current.style.cursor = "";
    }
  }, [isTextMode, isLeaderMode, isSitePinMode]);

  // Switch tile layer
  const switchTileLayer = useCallback((type: TileLayerType) => {
    if (!mapRef.current || !tileLayerRef.current) return;
    const config = TILE_LAYERS[type];
    tileLayerRef.current.setUrl(config.url);
    setActiveTile(type);
  }, []);

  // Clear all drawings
  const clearAll = useCallback(() => {
    if (confirm("全ての描画を削除しますか？")) {
      featureGroupRef.current.clearLayers();
      sitePinRef.current = null;
      leaderLinksRef.current.clear();
      if (coordTopRightRef.current) {
        coordTopRightRef.current.remove();
        coordTopRightRef.current = null;
      }
      if (coordBottomRef.current) {
        coordBottomRef.current.remove();
        coordBottomRef.current = null;
      }
      setCurrentCoord(null);
      handleRemoveOverlay();
      markAsChanged();
    }
  }, [handleRemoveOverlay, markAsChanged]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!mapRef.current || !onSave) return;
    setSaving(true);
    try {
      const geoJson = JSON.stringify((featureGroupRef.current as any).toGeoJSON());
      const center = mapRef.current.getCenter();
      const zoom = mapRef.current.getZoom();
      await onSave({
        geoJson,
        center: [center.lat, center.lng],
        zoom,
        tileLayer: activeTile,
        name,
      });
      setHasUnsavedChanges(false);
    } catch (e) {
      console.error("Save failed:", e);
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }, [onSave, activeTile, name]);

  // Toggle text mode (exclusive with leader/sitepin mode)
  const toggleTextMode = useCallback(() => {
    setIsTextMode((prev) => {
      if (!prev) {
        setIsLeaderMode(false);
        setIsSitePinMode(false);
        leaderAnchorRef.current = null;
      }
      return !prev;
    });
  }, []);

  // Toggle leader mode (exclusive with text/sitepin mode)
  const toggleLeaderMode = useCallback(() => {
    setIsLeaderMode((prev) => {
      if (!prev) {
        setIsTextMode(false);
        setIsSitePinMode(false);
      }
      leaderAnchorRef.current = null;
      return !prev;
    });
  }, []);

  // Toggle site pin mode (exclusive with text/leader mode)
  const toggleSitePinMode = useCallback(() => {
    setIsSitePinMode((prev) => {
      if (!prev) {
        setIsTextMode(false);
        setIsLeaderMode(false);
        leaderAnchorRef.current = null;
      }
      return !prev;
    });
  }, []);

  // ダイアログハンドラー
  const handleTextSubmit = useCallback((text: string) => {
    const map = mapRef.current;
    if (!map || !pendingTextLatLng) return;
    createTextMarker(map, featureGroupRef.current, pendingTextLatLng, text);
    setPendingTextLatLng(null);
  }, [pendingTextLatLng, createTextMarker]);

  const handleLeaderSubmit = useCallback((postalCode: string, address: string) => {
    const map = mapRef.current;
    if (!map || !pendingLeaderLatLngs) return;
    createLeaderAnnotation(
      map,
      featureGroupRef.current,
      pendingLeaderLatLngs.anchor,
      pendingLeaderLatLngs.box,
      postalCode,
      address
    );
    setPendingLeaderLatLngs(null);
  }, [pendingLeaderLatLngs, createLeaderAnnotation]);

  const handleEditTextSubmit = useCallback((text: string) => {
    if (!editingTextMarker) return;
    updateTextMarker(editingTextMarker, text);
    setEditingTextMarker(null);
    setEditingTextValue("");
  }, [editingTextMarker, updateTextMarker]);

  const handleEditLeaderSubmit = useCallback((postalCode: string, address: string) => {
    if (!editingLeaderId) return;
    updateLeaderAnnotation(editingLeaderId, postalCode, address);
    setEditingLeaderId(null);
    setEditingLeaderPostalCode("");
    setEditingLeaderAddress("");
  }, [editingLeaderId, updateLeaderAnnotation]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" id="map-editor-container" />
      <DrawingToolbar
        activeTile={activeTile}
        onTileChange={switchTileLayer}
        onClear={clearAll}
        onSave={onSave ? handleSave : undefined}
        saving={saving}
        name={name}
        onNameChange={setName}
        isTextMode={isTextMode}
        onToggleTextMode={toggleTextMode}
        isLeaderMode={isLeaderMode}
        onToggleLeaderMode={toggleLeaderMode}
        isSitePinMode={isSitePinMode}
        onToggleSitePinMode={toggleSitePinMode}
        mapContainerRef={mapContainerRef}
        projectId={projectId}
        onImageUpload={handleImageUpload}
        overlayOpacity={overlayOpacity}
        onOpacityChange={handleOpacityChange}
        overlayVisible={overlayVisible}
        onToggleOverlay={handleToggleOverlay}
        onRemoveOverlay={handleRemoveOverlay}
        hasOverlay={!!overlayImage}
        hasUnsavedChanges={hasUnsavedChanges}
      />

      {/* テキスト入力ダイアログ */}
      <TextInputDialog
        open={textDialogOpen}
        onOpenChange={(open) => {
          setTextDialogOpen(open);
          if (!open) setPendingTextLatLng(null);
        }}
        onSubmit={handleTextSubmit}
        title="テキストラベルを追加"
        placeholder="ラベルを入力..."
      />

      {/* 引き出し線入力ダイアログ */}
      <LeaderInputDialog
        open={leaderDialogOpen}
        onOpenChange={(open) => {
          setLeaderDialogOpen(open);
          if (!open) setPendingLeaderLatLngs(null);
        }}
        onSubmit={handleLeaderSubmit}
      />

      {/* テキスト編集ダイアログ */}
      <TextInputDialog
        open={editTextDialogOpen}
        onOpenChange={(open) => {
          setEditTextDialogOpen(open);
          if (!open) {
            setEditingTextMarker(null);
            setEditingTextValue("");
          }
        }}
        onSubmit={handleEditTextSubmit}
        title="テキストラベルを編集"
        placeholder="ラベルを入力..."
        initialValue={editingTextValue}
      />

      {/* 引き出し線編集ダイアログ */}
      <LeaderInputDialog
        open={editLeaderDialogOpen}
        onOpenChange={(open) => {
          setEditLeaderDialogOpen(open);
          if (!open) {
            setEditingLeaderId(null);
            setEditingLeaderPostalCode("");
            setEditingLeaderAddress("");
          }
        }}
        onSubmit={handleEditLeaderSubmit}
        initialPostalCode={editingLeaderPostalCode}
        initialAddress={editingLeaderAddress}
        isEditing
      />
    </div>
  );
}
