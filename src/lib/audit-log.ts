/**
 * 監査ログユーティリティ
 * セキュリティインシデント追跡のためのログ記録
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import type { AuthUser } from "./auth-guard";

export type AuditAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "login_failed";

export type ResourceType =
  | "project"
  | "todo"
  | "meeting"
  | "feedback"
  | "user"
  | "calendar_event"
  | "file"
  | "session"
  | "workflow_template"
  | "workflow_assignment";

export interface AuditLogParams {
  user?: AuthUser | null;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: number | null;
  resourceName?: string | null;
  details?: Record<string, unknown> | null;
  request?: NextRequest | null;
}

/**
 * リクエストからIPアドレスを取得
 */
function getIpAddress(request?: NextRequest | null): string | null {
  if (!request) return null;

  // Vercel が設定する信頼済みヘッダーを最優先
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    return vercelIp.split(",")[0].trim();
  }

  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) {
    return cfIp.trim();
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return null;
}

/**
 * リクエストからUser-Agentを取得
 */
function getUserAgent(request?: NextRequest | null): string | null {
  if (!request) return null;
  return request.headers.get("user-agent");
}

/** 監査ログに保存すべきでない機密フィールドを除去 */
const SENSITIVE_KEYS = new Set([
  "password", "passwordHash", "token", "secret", "apiKey",
  "authToken", "accessToken", "refreshToken", "creditCard",
  "ssn", "pin",
]);

function scrubSensitiveData(
  data: Record<string, unknown>
): Record<string, unknown> {
  const scrubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(key.toLowerCase())) {
      scrubbed[key] = "[REDACTED]";
    } else {
      scrubbed[key] = value;
    }
  }
  return scrubbed;
}

/**
 * 監査ログを記録
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  const {
    user,
    action,
    resourceType,
    resourceId,
    resourceName,
    details,
    request,
  } = params;

  const safeDetails = details ? scrubSensitiveData(details) : null;

  try {
    await db.insert(auditLogs).values({
      organizationId: user?.organizationId ?? null,
      userId: user ? parseInt(user.id, 10) : null,
      userName: user?.name ?? user?.username ?? null,
      action,
      resourceType,
      resourceId: resourceId ?? null,
      resourceName: resourceName ?? null,
      details: safeDetails ? JSON.stringify(safeDetails) : null,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    // 監査ログの記録失敗はエラーログに出力するが、
    // 本来の処理は継続させる
    console.error("[AuditLog] Failed to record audit log:", error);
  }
}

/**
 * プロジェクト作成ログ
 */
export async function logProjectCreate(
  user: AuthUser,
  projectId: number,
  projectName: string,
  request?: NextRequest
): Promise<void> {
  await logAudit({
    user,
    action: "create",
    resourceType: "project",
    resourceId: projectId,
    resourceName: projectName,
    request,
  });
}

/**
 * プロジェクト更新ログ
 */
export async function logProjectUpdate(
  user: AuthUser,
  projectId: number,
  projectName: string,
  changes?: Record<string, unknown>,
  request?: NextRequest
): Promise<void> {
  await logAudit({
    user,
    action: "update",
    resourceType: "project",
    resourceId: projectId,
    resourceName: projectName,
    details: changes,
    request,
  });
}

/**
 * プロジェクト削除ログ
 */
export async function logProjectDelete(
  user: AuthUser,
  projectId: number,
  projectName: string,
  request?: NextRequest
): Promise<void> {
  await logAudit({
    user,
    action: "delete",
    resourceType: "project",
    resourceId: projectId,
    resourceName: projectName,
    request,
  });
}

/**
 * TODO作成ログ
 */
export async function logTodoCreate(
  user: AuthUser,
  todoId: number,
  content: string,
  request?: NextRequest
): Promise<void> {
  await logAudit({
    user,
    action: "create",
    resourceType: "todo",
    resourceId: todoId,
    resourceName: content.substring(0, 100),
    request,
  });
}

/**
 * TODO更新ログ
 */
export async function logTodoUpdate(
  user: AuthUser,
  todoId: number,
  content: string,
  changes?: Record<string, unknown>,
  request?: NextRequest
): Promise<void> {
  await logAudit({
    user,
    action: "update",
    resourceType: "todo",
    resourceId: todoId,
    resourceName: content.substring(0, 100),
    details: changes,
    request,
  });
}

/**
 * TODO削除ログ
 */
export async function logTodoDelete(
  user: AuthUser,
  todoId: number,
  content: string,
  request?: NextRequest
): Promise<void> {
  await logAudit({
    user,
    action: "delete",
    resourceType: "todo",
    resourceId: todoId,
    resourceName: content.substring(0, 100),
    request,
  });
}

/**
 * 会議作成ログ
 */
export async function logMeetingCreate(
  user: AuthUser,
  meetingId: number,
  title: string,
  request?: NextRequest
): Promise<void> {
  await logAudit({
    user,
    action: "create",
    resourceType: "meeting",
    resourceId: meetingId,
    resourceName: title,
    request,
  });
}

/**
 * 会議更新ログ
 */
export async function logMeetingUpdate(
  user: AuthUser,
  meetingId: number,
  title: string,
  changes?: Record<string, unknown>,
  request?: NextRequest
): Promise<void> {
  await logAudit({
    user,
    action: "update",
    resourceType: "meeting",
    resourceId: meetingId,
    resourceName: title,
    details: changes,
    request,
  });
}

/**
 * 会議削除ログ
 */
export async function logMeetingDelete(
  user: AuthUser,
  meetingId: number,
  title: string,
  request?: NextRequest
): Promise<void> {
  await logAudit({
    user,
    action: "delete",
    resourceType: "meeting",
    resourceId: meetingId,
    resourceName: title,
    request,
  });
}

/**
 * フィードバック作成ログ
 */
export async function logFeedbackCreate(
  user: AuthUser,
  feedbackId: number,
  content: string,
  request?: NextRequest
): Promise<void> {
  await logAudit({
    user,
    action: "create",
    resourceType: "feedback",
    resourceId: feedbackId,
    resourceName: content.substring(0, 100),
    request,
  });
}

/**
 * フィードバック更新ログ
 */
export async function logFeedbackUpdate(
  user: AuthUser,
  feedbackId: number,
  content: string,
  changes?: Record<string, unknown>,
  request?: NextRequest
): Promise<void> {
  await logAudit({
    user,
    action: "update",
    resourceType: "feedback",
    resourceId: feedbackId,
    resourceName: content.substring(0, 100),
    details: changes,
    request,
  });
}

/**
 * フィードバック削除ログ
 */
export async function logFeedbackDelete(
  user: AuthUser,
  feedbackId: number,
  content: string,
  request?: NextRequest
): Promise<void> {
  await logAudit({
    user,
    action: "delete",
    resourceType: "feedback",
    resourceId: feedbackId,
    resourceName: content.substring(0, 100),
    request,
  });
}

/**
 * ログイン成功ログ
 */
export async function logLoginSuccess(
  user: AuthUser,
  request?: NextRequest
): Promise<void> {
  await logAudit({
    user,
    action: "login",
    resourceType: "session",
    resourceName: user.username ?? user.name,
    request,
  });
}

/**
 * ログイン失敗ログ
 */
export async function logLoginFailed(
  username: string,
  request?: NextRequest
): Promise<void> {
  await logAudit({
    user: null,
    action: "login_failed",
    resourceType: "session",
    resourceName: username,
    details: { reason: "invalid_credentials" },
    request,
  });
}

/**
 * ログアウトログ
 */
export async function logLogout(
  user: AuthUser,
  request?: NextRequest
): Promise<void> {
  await logAudit({
    user,
    action: "logout",
    resourceType: "session",
    resourceName: user.username ?? user.name,
    request,
  });
}

/**
 * ワークフローテンプレート作成ログ
 */
export async function logWorkflowTemplateCreate(
  user: AuthUser,
  templateId: number,
  name: string,
  request?: NextRequest
): Promise<void> {
  await logAudit({
    user,
    action: "create",
    resourceType: "workflow_template",
    resourceId: templateId,
    resourceName: name,
    request,
  });
}

/**
 * ワークフローテンプレート削除ログ
 */
export async function logWorkflowTemplateDelete(
  user: AuthUser,
  templateId: number,
  name: string,
  request?: NextRequest
): Promise<void> {
  await logAudit({
    user,
    action: "delete",
    resourceType: "workflow_template",
    resourceId: templateId,
    resourceName: name,
    request,
  });
}

/**
 * ワークフロー割り当てログ
 */
export async function logWorkflowAssignmentCreate(
  user: AuthUser,
  assignmentId: number,
  workflowName: string,
  assigneeId: number,
  request?: NextRequest
): Promise<void> {
  await logAudit({
    user,
    action: "create",
    resourceType: "workflow_assignment",
    resourceId: assignmentId,
    resourceName: workflowName,
    details: { assigneeId },
    request,
  });
}
