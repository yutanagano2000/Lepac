import { NextRequest } from "next/server";

/**
 * 監査ログのエントリ型
 */
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  userId?: string;
  userName?: string;
  resourceType: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  details?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
}

/**
 * 監査ログのアクション種別
 */
export const AuditAction = {
  // 認証関連
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILURE: "LOGIN_FAILURE",
  LOGOUT: "LOGOUT",

  // プロジェクト関連
  PROJECT_CREATE: "PROJECT_CREATE",
  PROJECT_UPDATE: "PROJECT_UPDATE",
  PROJECT_DELETE: "PROJECT_DELETE",
  PROJECT_VIEW: "PROJECT_VIEW",

  // TODO関連
  TODO_CREATE: "TODO_CREATE",
  TODO_UPDATE: "TODO_UPDATE",
  TODO_DELETE: "TODO_DELETE",
  TODO_COMPLETE: "TODO_COMPLETE",

  // ファイル関連
  FILE_UPLOAD: "FILE_UPLOAD",
  FILE_DELETE: "FILE_DELETE",
  FILE_DOWNLOAD: "FILE_DOWNLOAD",

  // セキュリティ関連
  CSRF_VIOLATION: "CSRF_VIOLATION",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  UNAUTHORIZED_ACCESS: "UNAUTHORIZED_ACCESS",
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];

// インメモリログストア（本番ではDBまたは外部サービスを使用）
const auditLogs: AuditLogEntry[] = [];

/**
 * リクエストからIPアドレスを取得
 */
function getIpAddress(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

/**
 * リクエストからUser-Agentを取得
 */
function getUserAgent(request: NextRequest): string {
  return request.headers.get("user-agent") || "unknown";
}

/**
 * 監査ログを記録
 */
export function logAudit(
  request: NextRequest,
  action: AuditActionType,
  options: {
    userId?: string;
    userName?: string;
    resourceType: string;
    resourceId?: string;
    details?: Record<string, unknown>;
    success?: boolean;
    errorMessage?: string;
  }
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    action,
    userId: options.userId,
    userName: options.userName,
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    ipAddress: getIpAddress(request),
    userAgent: getUserAgent(request),
    details: options.details,
    success: options.success ?? true,
    errorMessage: options.errorMessage,
  };

  auditLogs.push(entry);

  // コンソールにも出力（開発環境）
  if (process.env.NODE_ENV === "development") {
    console.log("[AUDIT]", JSON.stringify(entry, null, 2));
  }

  return entry;
}

/**
 * 監査ログを取得（テスト・管理用）
 */
export function getAuditLogs(filter?: {
  userId?: string;
  action?: AuditActionType;
  resourceType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): AuditLogEntry[] {
  let result = [...auditLogs];

  if (filter) {
    if (filter.userId) {
      result = result.filter((log) => log.userId === filter.userId);
    }
    if (filter.action) {
      result = result.filter((log) => log.action === filter.action);
    }
    if (filter.resourceType) {
      result = result.filter((log) => log.resourceType === filter.resourceType);
    }
    if (filter.startDate) {
      result = result.filter((log) => new Date(log.timestamp) >= filter.startDate!);
    }
    if (filter.endDate) {
      result = result.filter((log) => new Date(log.timestamp) <= filter.endDate!);
    }
    if (filter.limit) {
      result = result.slice(0, filter.limit);
    }
  }

  return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * 監査ログをクリア（テスト用）
 */
export function clearAuditLogs(): void {
  auditLogs.length = 0;
}

/**
 * 簡易ID生成
 */
function generateId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
