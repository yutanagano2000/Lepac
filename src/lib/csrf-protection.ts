/**
 * CSRF保護ユーティリティ
 * Origin/Refererヘッダー検証によるクロスサイトリクエストフォージェリ対策
 */

import { NextRequest, NextResponse } from "next/server";

// 許可するオリジン（環境変数から取得、開発環境用にlocalhostも含む）
function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  // 本番環境URL
  if (process.env.NEXTAUTH_URL) {
    origins.push(new URL(process.env.NEXTAUTH_URL).origin);
  }

  // Vercelプレビュー/本番URL
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }

  // カスタム許可オリジン
  if (process.env.ALLOWED_ORIGINS) {
    origins.push(...process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()));
  }

  // 開発環境
  if (process.env.NODE_ENV === "development") {
    origins.push("http://localhost:3000");
    origins.push("http://127.0.0.1:3000");
  }

  return origins;
}

export interface CsrfValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * リクエストのOrigin/Refererヘッダーを検証
 * 状態変更を伴うリクエスト（POST, PUT, DELETE, PATCH）に適用
 */
export function validateCsrf(request: NextRequest): CsrfValidationResult {
  const method = request.method.toUpperCase();

  // GET, HEAD, OPTIONSは検証をスキップ（安全なメソッド）
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return { valid: true };
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // Originヘッダーがある場合は優先して検証
  if (origin) {
    const allowedOrigins = getAllowedOrigins();
    if (allowedOrigins.some((allowed) => origin === allowed)) {
      return { valid: true };
    }

    console.warn(`[CSRF] Origin rejected: ${origin}`);
    return {
      valid: false,
      error: "不正なオリジンからのリクエストです",
    };
  }

  // Refererヘッダーで検証（Originがない場合のフォールバック）
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      const allowedOrigins = getAllowedOrigins();
      if (allowedOrigins.some((allowed) => refererOrigin === allowed)) {
        return { valid: true };
      }

      console.warn(`[CSRF] Referer rejected: ${referer}`);
      return {
        valid: false,
        error: "不正なリファラからのリクエストです",
      };
    } catch {
      console.warn(`[CSRF] Invalid referer URL: ${referer}`);
      return {
        valid: false,
        error: "不正なリファラ形式です",
      };
    }
  }

  // 両方のヘッダーがない場合
  // APIクライアント（Postman等）やサーバー間通信を許可する場合はここで許可する
  // 厳格モードでは拒否する
  console.warn("[CSRF] No Origin or Referer header");
  return {
    valid: false,
    error: "オリジン情報がありません",
  };
}

/**
 * CSRF検証を行い、失敗時は403レスポンスを返す
 */
export function csrfGuard(request: NextRequest): NextResponse | null {
  const result = validateCsrf(request);

  if (!result.valid) {
    return NextResponse.json(
      { error: result.error || "CSRFトークン検証に失敗しました" },
      { status: 403 }
    );
  }

  return null;
}
