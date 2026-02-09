"use client";

import { useState, useEffect, useCallback } from "react";

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

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [projectRes, photosRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/construction-photos`),
      ]);

      if (!projectRes.ok) {
        throw new Error("案件情報の取得に失敗しました");
      }
      if (!photosRes.ok) {
        throw new Error("写真の取得に失敗しました");
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
  }, [projectId]);

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
