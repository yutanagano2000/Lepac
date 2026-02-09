import { useState, useCallback } from "react";

export function useMapEditorDialogs() {
  // テキスト入力ダイアログ
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [pendingTextLatLng, setPendingTextLatLng] = useState<L.LatLng | null>(null);

  // 引き出し線入力ダイアログ
  const [leaderDialogOpen, setLeaderDialogOpen] = useState(false);
  const [pendingLeaderLatLngs, setPendingLeaderLatLngs] = useState<{ anchor: L.LatLng; box: L.LatLng } | null>(null);

  // テキスト編集ダイアログ
  const [editTextDialogOpen, setEditTextDialogOpen] = useState(false);
  const [editingTextMarker, setEditingTextMarker] = useState<L.Marker | null>(null);
  const [editingTextValue, setEditingTextValue] = useState("");

  // 引き出し線編集ダイアログ
  const [editLeaderDialogOpen, setEditLeaderDialogOpen] = useState(false);
  const [editingLeaderId, setEditingLeaderId] = useState<string | null>(null);
  const [editingLeaderPostalCode, setEditingLeaderPostalCode] = useState("");
  const [editingLeaderAddress, setEditingLeaderAddress] = useState("");

  // テキストダイアログを開く
  const openTextDialog = useCallback((latlng: L.LatLng) => {
    setPendingTextLatLng(latlng);
    setTextDialogOpen(true);
  }, []);

  // テキストダイアログを閉じる
  const closeTextDialog = useCallback(() => {
    setTextDialogOpen(false);
    setPendingTextLatLng(null);
  }, []);

  // 引き出し線ダイアログを開く
  const openLeaderDialog = useCallback((anchor: L.LatLng, box: L.LatLng) => {
    setPendingLeaderLatLngs({ anchor, box });
    setLeaderDialogOpen(true);
  }, []);

  // 引き出し線ダイアログを閉じる
  const closeLeaderDialog = useCallback(() => {
    setLeaderDialogOpen(false);
    setPendingLeaderLatLngs(null);
  }, []);

  // テキスト編集ダイアログを開く
  const openEditTextDialog = useCallback((marker: L.Marker, currentLabel: string) => {
    setEditingTextMarker(marker);
    setEditingTextValue(currentLabel);
    setEditTextDialogOpen(true);
  }, []);

  // テキスト編集ダイアログを閉じる
  const closeEditTextDialog = useCallback(() => {
    setEditTextDialogOpen(false);
    setEditingTextMarker(null);
    setEditingTextValue("");
  }, []);

  // 引き出し線編集ダイアログを開く
  const openEditLeaderDialog = useCallback((id: string, postalCode: string, address: string) => {
    setEditingLeaderId(id);
    setEditingLeaderPostalCode(postalCode);
    setEditingLeaderAddress(address);
    setEditLeaderDialogOpen(true);
  }, []);

  // 引き出し線編集ダイアログを閉じる
  const closeEditLeaderDialog = useCallback(() => {
    setEditLeaderDialogOpen(false);
    setEditingLeaderId(null);
    setEditingLeaderPostalCode("");
    setEditingLeaderAddress("");
  }, []);

  return {
    // テキスト入力
    textDialogOpen,
    setTextDialogOpen,
    pendingTextLatLng,
    setPendingTextLatLng,
    openTextDialog,
    closeTextDialog,
    // 引き出し線入力
    leaderDialogOpen,
    setLeaderDialogOpen,
    pendingLeaderLatLngs,
    setPendingLeaderLatLngs,
    openLeaderDialog,
    closeLeaderDialog,
    // テキスト編集
    editTextDialogOpen,
    setEditTextDialogOpen,
    editingTextMarker,
    setEditingTextMarker,
    editingTextValue,
    setEditingTextValue,
    openEditTextDialog,
    closeEditTextDialog,
    // 引き出し線編集
    editLeaderDialogOpen,
    setEditLeaderDialogOpen,
    editingLeaderId,
    setEditingLeaderId,
    editingLeaderPostalCode,
    setEditingLeaderPostalCode,
    editingLeaderAddress,
    setEditingLeaderAddress,
    openEditLeaderDialog,
    closeEditLeaderDialog,
  };
}
