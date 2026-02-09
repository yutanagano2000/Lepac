import { useState, useCallback, useRef } from "react";
import type { TileLayerType } from "../constants";

export interface MapEditorState {
  activeTile: TileLayerType;
  drawMode: string | null;
  name: string;
  saving: boolean;
  isTextMode: boolean;
  isLeaderMode: boolean;
  isSitePinMode: boolean;
  currentCoord: [number, number] | null;
  hasUnsavedChanges: boolean;
}

export interface DialogState {
  textDialogOpen: boolean;
  leaderDialogOpen: boolean;
  editTextDialogOpen: boolean;
  editLeaderDialogOpen: boolean;
  pendingTextLatLng: L.LatLng | null;
  pendingLeaderLatLngs: { anchor: L.LatLng; box: L.LatLng } | null;
  editingTextMarker: L.Marker | null;
  editingTextValue: string;
  editingLeaderId: string | null;
  editingLeaderPostalCode: string;
  editingLeaderAddress: string;
}

export function useMapEditorState(
  initialTileLayer: TileLayerType,
  annotationName: string,
  siteCoordinate?: [number, number]
) {
  // 基本状態
  const [activeTile, setActiveTile] = useState<TileLayerType>(initialTileLayer);
  const [drawMode, setDrawMode] = useState<string | null>(null);
  const [name, setName] = useState(annotationName);
  const [saving, setSaving] = useState(false);
  const [isTextMode, setIsTextMode] = useState(false);
  const [isLeaderMode, setIsLeaderMode] = useState(false);
  const [isSitePinMode, setIsSitePinMode] = useState(false);
  const [currentCoord, setCurrentCoord] = useState<[number, number] | null>(siteCoordinate ?? null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Leader line mode ref
  const leaderAnchorRef = useRef<L.LatLng | null>(null);

  // 変更を記録
  const markAsChanged = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

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

  return {
    // State
    activeTile,
    drawMode,
    name,
    saving,
    isTextMode,
    isLeaderMode,
    isSitePinMode,
    currentCoord,
    hasUnsavedChanges,
    // Setters
    setActiveTile,
    setDrawMode,
    setName,
    setSaving,
    setIsTextMode,
    setIsLeaderMode,
    setIsSitePinMode,
    setCurrentCoord,
    setHasUnsavedChanges,
    // Refs
    leaderAnchorRef,
    // Actions
    markAsChanged,
    toggleTextMode,
    toggleLeaderMode,
    toggleSitePinMode,
  };
}
