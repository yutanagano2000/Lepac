"use client";

import { useCallback } from "react";
import { addTodoMessage } from "@/lib/utils";
import { normalizeCoordinateString } from "@/lib/coordinates";
import type { Project, Progress, Todo, Comment, DetailForm } from "../_types";

interface UseProjectActionsOptions {
  projectId: string;
  onRefreshProject: () => Promise<void>;
  onRefreshProgress: () => Promise<void>;
  onRefreshComments: () => Promise<void>;
  onRefreshTodos: () => Promise<void>;
  onRefreshConstructionData: () => Promise<void>;
}

/**
 * プロジェクト詳細ページのCRUD操作を提供するフック
 */
export function useProjectActions(options: UseProjectActionsOptions) {
  const {
    projectId,
    onRefreshProject,
    onRefreshProgress,
    onRefreshComments,
    onRefreshTodos,
    onRefreshConstructionData,
  } = options;

  // ========================================
  // Progress Actions
  // ========================================

  const createProgress = useCallback(
    async (data: {
      title: string;
      description: string;
      status: "planned" | "completed";
      date: Date;
    }) => {
      await fetch(`/api/projects/${projectId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          status: data.status,
          createdAt: data.date.toISOString(),
        }),
      });
      await onRefreshProgress();
    },
    [projectId, onRefreshProgress]
  );

  const updateProgress = useCallback(
    async (
      progressId: number,
      data: {
        title: string;
        description: string;
        status: "planned" | "completed";
        date: Date;
        completedAt?: Date;
      }
    ) => {
      await fetch(`/api/projects/${projectId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progressId,
          title: data.title,
          description: data.description,
          status: data.status,
          createdAt: data.date.toISOString(),
          completedAt: data.completedAt?.toISOString(),
        }),
      });
      await onRefreshProgress();
    },
    [projectId, onRefreshProgress]
  );

  const markProgressCompleted = useCallback(
    async (progressId: number) => {
      await fetch(`/api/projects/${projectId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progressId,
          status: "completed",
          completedAt: new Date().toISOString(),
        }),
      });
      await onRefreshProgress();
    },
    [projectId, onRefreshProgress]
  );

  const deleteProgress = useCallback(
    async (progressId: number) => {
      await fetch(`/api/projects/${projectId}/progress?progressId=${progressId}`, {
        method: "DELETE",
      });
      await onRefreshProgress();
    },
    [projectId, onRefreshProgress]
  );

  // ========================================
  // Comment Actions
  // ========================================

  const createComment = useCallback(
    async (content: string) => {
      await fetch(`/api/projects/${projectId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      await onRefreshComments();
    },
    [projectId, onRefreshComments]
  );

  const updateComment = useCallback(
    async (commentId: number, content: string) => {
      await fetch(`/api/projects/${projectId}/comments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, content }),
      });
      await onRefreshComments();
    },
    [projectId, onRefreshComments]
  );

  const deleteComment = useCallback(
    async (commentId: number) => {
      await fetch(`/api/projects/${projectId}/comments?commentId=${commentId}`, {
        method: "DELETE",
      });
      await onRefreshComments();
    },
    [projectId, onRefreshComments]
  );

  // ========================================
  // Todo Actions
  // ========================================

  const createTodo = useCallback(
    async (content: string, dueDate: string) => {
      await fetch(`/api/projects/${projectId}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), dueDate }),
      });
      await onRefreshTodos();
    },
    [projectId, onRefreshTodos]
  );

  const updateTodo = useCallback(
    async (todoId: number, data: { content?: string; dueDate?: string }) => {
      await fetch(`/api/todos/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: data.content?.trim(),
          dueDate: data.dueDate,
        }),
      });
      await onRefreshTodos();
    },
    [onRefreshTodos]
  );

  const completeTodo = useCallback(
    async (todoId: number, memo?: string) => {
      const completedMemo = memo?.trim()
        ? addTodoMessage(null, memo.trim())
        : null;
      await fetch(`/api/todos/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedAt: new Date().toISOString(),
          completedMemo,
        }),
      });
      await onRefreshTodos();
    },
    [onRefreshTodos]
  );

  const reopenTodo = useCallback(
    async (todoId: number) => {
      await fetch(`/api/todos/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedAt: null }),
      });
      await onRefreshTodos();
    },
    [onRefreshTodos]
  );

  const addTodoMessageAction = useCallback(
    async (todo: Todo, message: string) => {
      const updatedMemo = addTodoMessage(todo.completedMemo, message.trim());
      await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedMemo: updatedMemo }),
      });
      await onRefreshTodos();
    },
    [onRefreshTodos]
  );

  const deleteTodo = useCallback(
    async (todoId: number) => {
      await fetch(`/api/todos/${todoId}`, { method: "DELETE" });
      await onRefreshTodos();
    },
    [onRefreshTodos]
  );

  // ========================================
  // Project Detail Actions
  // ========================================

  const updateProjectDetails = useCallback(
    async (project: Project, detailForm: DetailForm) => {
      await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...project,
          address: detailForm.address,
          coordinates:
            normalizeCoordinateString(detailForm.coordinates) ||
            detailForm.coordinates,
          landowner1: detailForm.landowner1,
          landowner2: detailForm.landowner2,
          landowner3: detailForm.landowner3,
          landownerAddress1: detailForm.landownerAddress1,
          landownerAddress2: detailForm.landownerAddress2,
          landownerAddress3: detailForm.landownerAddress3,
          inheritanceStatus1: detailForm.inheritanceStatus1,
          inheritanceStatus2: detailForm.inheritanceStatus2,
          inheritanceStatus3: detailForm.inheritanceStatus3,
          correctionRegistration1: detailForm.correctionRegistration1,
          correctionRegistration2: detailForm.correctionRegistration2,
          correctionRegistration3: detailForm.correctionRegistration3,
          mortgageStatus1: detailForm.mortgageStatus1,
          mortgageStatus2: detailForm.mortgageStatus2,
          mortgageStatus3: detailForm.mortgageStatus3,
          landCategory1: detailForm.landCategory1,
          landCategory2: detailForm.landCategory2,
          landCategory3: detailForm.landCategory3,
          landArea1: detailForm.landArea1,
          landArea2: detailForm.landArea2,
          landArea3: detailForm.landArea3,
          verticalSnowLoad: detailForm.verticalSnowLoad,
          windSpeed: detailForm.windSpeed,
          dococabiLink: detailForm.dococabiLink,
        }),
      });
      await onRefreshProject();
    },
    [projectId, onRefreshProject]
  );

  // ========================================
  // Construction Actions
  // ========================================

  const updateConstructionProgress = useCallback(
    async (category: string, status: string, note?: string) => {
      await fetch(`/api/projects/${projectId}/construction-progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, status, note }),
      });
      await onRefreshConstructionData();
    },
    [projectId, onRefreshConstructionData]
  );

  const uploadConstructionPhoto = useCallback(
    async (
      file: File,
      category: string,
      contractorName?: string,
      note?: string
    ): Promise<boolean> => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);
      if (contractorName) formData.append("contractorName", contractorName);
      if (note) formData.append("note", note);

      const res = await fetch(`/api/projects/${projectId}/construction-photos`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "アップロードに失敗しました");
      }

      await onRefreshConstructionData();
      return true;
    },
    [projectId, onRefreshConstructionData]
  );

  const deleteConstructionPhoto = useCallback(
    async (photoId: number) => {
      await fetch(`/api/projects/${projectId}/construction-photos/${photoId}`, {
        method: "DELETE",
      });
      await onRefreshConstructionData();
    },
    [projectId, onRefreshConstructionData]
  );

  // ========================================
  // Construction Date Actions
  // ========================================

  const updateConstructionDate = useCallback(
    async (field: string, date: Date | null) => {
      const dateValue = date
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
        : null;

      await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: dateValue }),
      });
      await onRefreshProject();
    },
    [projectId, onRefreshProject]
  );

  return {
    // Progress
    createProgress,
    updateProgress,
    markProgressCompleted,
    deleteProgress,

    // Comments
    createComment,
    updateComment,
    deleteComment,

    // Todos
    createTodo,
    updateTodo,
    completeTodo,
    reopenTodo,
    addTodoMessage: addTodoMessageAction,
    deleteTodo,

    // Project Details
    updateProjectDetails,

    // Construction
    updateConstructionProgress,
    uploadConstructionPhoto,
    deleteConstructionPhoto,
    updateConstructionDate,
  };
}
