"use client";

import { useCallback } from "react";
import type { Photo } from "./useConstructionData";

interface UseConstructionActionsProps {
  projectId: string;
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
}

export function useConstructionActions({ projectId, setPhotos }: UseConstructionActionsProps) {
  const uploadPhoto = useCallback(async (
    category: string,
    file: File,
    note: string
  ): Promise<Photo | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);
      formData.append("note", note);

      const res = await fetch(`/api/projects/${projectId}/construction-photos`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("写真のアップロードに失敗しました");
      }

      const newPhoto = await res.json();
      setPhotos((prev) => [newPhoto, ...prev]);
      return newPhoto;
    } catch (err) {
      console.error("Upload failed:", err);
      throw err;
    }
  }, [projectId, setPhotos]);

  const deletePhoto = useCallback(async (photoId: number): Promise<void> => {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/construction-photos/${photoId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        throw new Error("写真の削除に失敗しました");
      }
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      console.error("Delete failed:", err);
      throw err;
    }
  }, [projectId, setPhotos]);

  return {
    uploadPhoto,
    deletePhoto,
  };
}
