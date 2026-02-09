"use client";

import { useState, useEffect, useCallback } from "react";
import { parseValidId } from "@/lib/validation";

type Project = {
  id: number;
  managementNumber: string;
  siteName: string | null;
  cityName: string | null;
  prefecture: string | null;
  address: string | null;
  client: string | null;
  completionMonth: string | null;
};

type Photo = {
  id: number;
  projectId: number;
  category: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  contractorName: string | null;
  note: string | null;
  takenAt: string | null;
  createdAt: string;
};

export function useConstructionData(projectId: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // projectIdのバリデーション
  const validatedId = parseValidId(projectId);

  const fetchData = useCallback(async () => {
    // バリデーション失敗時は早期リターン
    if (validatedId === null) {
      setError("無効なプロジェクトIDです");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [projectRes, photosRes] = await Promise.all([
        fetch(`/api/projects/${validatedId}`),
        fetch(`/api/projects/${validatedId}/construction-photos`),
      ]);

      if (!projectRes.ok) {
        const errorData = await projectRes.json().catch(() => ({}));
        throw new Error(errorData.error || "案件情報の取得に失敗しました");
      }
      if (!photosRes.ok) {
        const errorData = await photosRes.json().catch(() => ({}));
        throw new Error(errorData.error || "写真の取得に失敗しました");
      }

      const projectData = await projectRes.json();
      const photosData = await photosRes.json();

      setProject(projectData);
      setPhotos(photosData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "データの取得に失敗しました";
      setError(message);
      console.error("Failed to fetch data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [validatedId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    project,
    photos,
    setPhotos,
    isLoading,
    error,
    refetch: fetchData,
  };
}

export type { Project, Photo };
