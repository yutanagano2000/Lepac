"use client";

import { useCallback, useMemo } from "react";
import { parseValidId } from "@/lib/validation";
import type { Photo } from "./useConstructionData";

interface UseConstructionActionsProps {
  projectId: string;
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
}

export function useConstructionActions({ projectId, setPhotos }: UseConstructionActionsProps) {
  // projectIdのバリデーション
  const validatedId = useMemo(() => parseValidId(projectId), [projectId]);

  const uploadPhoto = useCallback(async (
    category: string,
    file: File,
    note: string
  ): Promise<Photo | null> => {
    // バリデーション失敗時はエラー
    if (validatedId === null) {
      throw new Error("無効なプロジェクトIDです");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);
    formData.append("note", note);

    const res = await fetch(`/api/projects/${validatedId}/construction-photos`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "写真のアップロードに失敗しました");
    }

    const newPhoto = await res.json();
    setPhotos((prev) => [newPhoto, ...prev]);
    return newPhoto;
  }, [validatedId, setPhotos]);

  const deletePhoto = useCallback(async (photoId: number): Promise<void> => {
    // バリデーション失敗時はエラー
    if (validatedId === null) {
      throw new Error("無効なプロジェクトIDです");
    }

    // photoIdもバリデーション
    if (!Number.isSafeInteger(photoId) || photoId <= 0) {
      throw new Error("無効な写真IDです");
    }

    const res = await fetch(
      `/api/projects/${validatedId}/construction-photos/${photoId}`,
      { method: "DELETE" }
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "写真の削除に失敗しました");
    }

    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }, [validatedId, setPhotos]);

  return {
    uploadPhoto,
    deletePhoto,
  };
}
