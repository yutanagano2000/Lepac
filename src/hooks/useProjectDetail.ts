"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  Project,
  Progress,
  Comment,
  Todo,
  ProjectFile,
  ConstructionProgress,
  ConstructionPhoto,
} from "@/db/schema";

interface UseProjectDetailOptions {
  /** プロジェクトID */
  projectId: string;
  /** 初回フェッチ時に進捗自動生成APIを呼ぶか */
  autoGenerateProgress?: boolean;
}

interface UseProjectDetailReturn {
  // データ
  project: Project | null;
  progressList: Progress[];
  comments: Comment[];
  todos: Todo[];
  files: ProjectFile[];
  constructionProgressList: ConstructionProgress[];
  constructionPhotos: ConstructionPhoto[];

  // ローディング状態
  isLoading: boolean;
  isLoadingConstruction: boolean;

  // 個別リフレッシュ関数
  refetchProject: () => Promise<void>;
  refetchProgress: () => Promise<void>;
  refetchComments: () => Promise<void>;
  refetchTodos: () => Promise<void>;
  refetchFiles: () => Promise<void>;
  refetchConstructionData: () => Promise<void>;

  // 一括リフレッシュ
  refetchAll: () => Promise<void>;

  // セッター（外部からの更新用）
  setProject: React.Dispatch<React.SetStateAction<Project | null>>;
  setProgressList: React.Dispatch<React.SetStateAction<Progress[]>>;
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  setTodos: React.Dispatch<React.SetStateAction<Todo[]>>;
  setFiles: React.Dispatch<React.SetStateAction<ProjectFile[]>>;
  setConstructionProgressList: React.Dispatch<React.SetStateAction<ConstructionProgress[]>>;
  setConstructionPhotos: React.Dispatch<React.SetStateAction<ConstructionPhoto[]>>;
}

/**
 * プロジェクト詳細データのフェッチを統合するフック
 *
 * @example
 * ```tsx
 * const {
 *   project,
 *   progressList,
 *   comments,
 *   todos,
 *   files,
 *   isLoading,
 *   refetchProject,
 *   refetchAll,
 * } = useProjectDetail({ projectId: id, autoGenerateProgress: true });
 *
 * if (isLoading) return <Loading />;
 * if (!project) return <NotFound />;
 * ```
 */
export function useProjectDetail(options: UseProjectDetailOptions): UseProjectDetailReturn {
  const { projectId, autoGenerateProgress = true } = options;

  // データ状態
  const [project, setProject] = useState<Project | null>(null);
  const [progressList, setProgressList] = useState<Progress[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [constructionProgressList, setConstructionProgressList] = useState<ConstructionProgress[]>([]);
  const [constructionPhotos, setConstructionPhotos] = useState<ConstructionPhoto[]>([]);

  // ローディング状態
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingConstruction, setIsLoadingConstruction] = useState(false);

  // React Strict Modeでの二重呼び出し防止
  const hasGeneratedRef = useRef(false);

  // 個別フェッチ関数
  const refetchProject = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    const data = await res.json();
    setProject(data);
  }, [projectId]);

  const refetchProgress = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/progress`);
    const data = await res.json();
    setProgressList(data);
  }, [projectId]);

  const refetchComments = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/comments`);
    const data = await res.json();
    setComments(data);
  }, [projectId]);

  const refetchTodos = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/todos`);
    const data = await res.json();
    setTodos(data);
  }, [projectId]);

  const refetchFiles = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/files`);
    const data = await res.json();
    setFiles(data);
  }, [projectId]);

  const refetchConstructionData = useCallback(async () => {
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

  // 進捗自動生成付きフェッチ
  const generateAndFetchProgress = useCallback(async () => {
    try {
      await fetch(`/api/projects/${projectId}/progress/generate`, { method: "POST" });
    } catch (error) {
      console.error("Failed to generate progress:", error);
    }
    await refetchProgress();
  }, [projectId, refetchProgress]);

  // 一括リフレッシュ
  const refetchAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      refetchProject(),
      refetchProgress(),
      refetchComments(),
      refetchTodos(),
      refetchFiles(),
      refetchConstructionData(),
    ]);
    setIsLoading(false);
  }, [refetchProject, refetchProgress, refetchComments, refetchTodos, refetchFiles, refetchConstructionData]);

  // 初回フェッチ
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);

      // 並列でデータ取得
      await Promise.all([
        refetchProject(),
        refetchComments(),
        refetchTodos(),
        refetchFiles(),
        refetchConstructionData(),
      ]);

      // 進捗は自動生成オプションに応じて処理
      if (autoGenerateProgress && !hasGeneratedRef.current) {
        hasGeneratedRef.current = true;
        await generateAndFetchProgress();
      } else {
        await refetchProgress();
      }

      setIsLoading(false);
    };

    fetchInitialData();
  }, [
    projectId,
    autoGenerateProgress,
    refetchProject,
    refetchComments,
    refetchTodos,
    refetchFiles,
    refetchConstructionData,
    refetchProgress,
    generateAndFetchProgress,
  ]);

  return {
    // データ
    project,
    progressList,
    comments,
    todos,
    files,
    constructionProgressList,
    constructionPhotos,

    // ローディング状態
    isLoading,
    isLoadingConstruction,

    // リフレッシュ関数
    refetchProject,
    refetchProgress,
    refetchComments,
    refetchTodos,
    refetchFiles,
    refetchConstructionData,
    refetchAll,

    // セッター
    setProject,
    setProgressList,
    setComments,
    setTodos,
    setFiles,
    setConstructionProgressList,
    setConstructionPhotos,
  };
}
