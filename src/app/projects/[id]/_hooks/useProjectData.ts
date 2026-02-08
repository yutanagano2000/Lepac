"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Project, Progress, Comment, Todo, ProjectFile, ConstructionProgress, ConstructionPhoto } from "@/db/schema";

interface UseProjectDataReturn {
  // データ
  project: Project | null;
  progressList: Progress[];
  comments: Comment[];
  todos: Todo[];
  files: ProjectFile[];
  constructionProgressList: ConstructionProgress[];
  constructionPhotos: ConstructionPhoto[];
  isLoadingConstruction: boolean;
  // リフレッシュ関数（Promise対応でuseProjectActionsと互換）
  fetchProject: () => Promise<void>;
  fetchProgress: () => Promise<void>;
  fetchComments: () => Promise<void>;
  fetchTodos: () => Promise<void>;
  fetchFiles: () => Promise<void>;
  fetchConstructionData: () => Promise<void>;
  // プロジェクト更新
  setProject: React.Dispatch<React.SetStateAction<Project | null>>;
}

export function useProjectData(projectId: string): UseProjectDataReturn {
  const [project, setProject] = useState<Project | null>(null);
  const [progressList, setProgressList] = useState<Progress[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [constructionProgressList, setConstructionProgressList] = useState<ConstructionProgress[]>([]);
  const [constructionPhotos, setConstructionPhotos] = useState<ConstructionPhoto[]>([]);
  const [isLoadingConstruction, setIsLoadingConstruction] = useState(false);

  // Strict Modeでの二重呼び出しを防止
  const hasGeneratedRef = useRef(false);

  const fetchProject = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    const data = await res.json();
    setProject(data);
  }, [projectId]);

  const fetchProgress = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/progress`);
    const data = await res.json();
    setProgressList(data);
  }, [projectId]);

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/comments`);
    const data = await res.json();
    setComments(data);
  }, [projectId]);

  const fetchTodos = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/todos`);
    const data = await res.json();
    setTodos(data);
  }, [projectId]);

  const fetchFiles = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/files`);
    const data = await res.json();
    setFiles(data);
  }, [projectId]);

  const fetchConstructionData = useCallback(async () => {
    setIsLoadingConstruction(true);
    try {
      const [progressRes, photosRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/construction-progress`),
        fetch(`/api/projects/${projectId}/construction-photos`),
      ]);
      const progressData = await progressRes.json();
      const photosData = await photosRes.json();
      setConstructionProgressList(Array.isArray(progressData) ? progressData : []);
      setConstructionPhotos(Array.isArray(photosData) ? photosData : []);
    } catch (error) {
      console.error("Failed to fetch construction data:", error);
    } finally {
      setIsLoadingConstruction(false);
    }
  }, [projectId]);

  // タイムラインを自動生成してから進捗を取得
  const generateAndFetchProgress = useCallback(async () => {
    await fetch(`/api/projects/${projectId}/progress/generate`, { method: "POST" });
    fetchProgress();
  }, [projectId, fetchProgress]);

  // 初期データ取得
  useEffect(() => {
    fetchProject();
    fetchComments();
    fetchTodos();
    fetchFiles();
    fetchConstructionData();
    // generate APIは1回だけ呼び出す（React Strict Modeでの二重実行防止）
    if (!hasGeneratedRef.current) {
      hasGeneratedRef.current = true;
      generateAndFetchProgress();
    } else {
      // 2回目以降は進捗の取得のみ
      fetchProgress();
    }
  }, [projectId]);

  return {
    project,
    progressList,
    comments,
    todos,
    files,
    constructionProgressList,
    constructionPhotos,
    isLoadingConstruction,
    fetchProject,
    fetchProgress,
    fetchComments,
    fetchTodos,
    fetchFiles,
    fetchConstructionData,
    setProject,
  };
}
