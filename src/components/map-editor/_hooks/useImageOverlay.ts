import { useState, useCallback, useRef } from "react";
import L from "leaflet";

export function useImageOverlay() {
  const imageOverlayRef = useRef<L.ImageOverlay | null>(null);
  const cornerMarkersRef = useRef<L.CircleMarker[]>([]);

  const [overlayImage, setOverlayImage] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [overlayVisible, setOverlayVisible] = useState(true);

  // コーナーマーカー配置
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

  // 画像アップロードハンドラ
  const handleImageUpload = useCallback((dataUrl: string, map: L.Map | null) => {
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

  // 透過度変更
  const handleOpacityChange = useCallback((value: number) => {
    setOverlayOpacity(value);
    imageOverlayRef.current?.setOpacity(value);
  }, []);

  // 表示/非表示切り替え
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

  // オーバーレイ削除
  const handleRemoveOverlay = useCallback((map: L.Map | null) => {
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

  return {
    imageOverlayRef,
    cornerMarkersRef,
    overlayImage,
    overlayOpacity,
    overlayVisible,
    handleImageUpload,
    handleOpacityChange,
    handleToggleOverlay,
    handleRemoveOverlay,
  };
}
