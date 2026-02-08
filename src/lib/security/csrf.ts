import { NextRequest } from "next/server";

/**
 * CSRF保護のためのOrigin/Referer検証
 *
 * GET/HEAD/OPTIONS以外のリクエストに対して、
 * OriginまたはRefererヘッダーが信頼できるオリジンからのものか検証する
 */

// 信頼できるオリジンのリスト
const TRUSTED_ORIGINS = [
  "http://localhost:3000",
  "https://localhost:3000",
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean) as string[];

/**
 * CSRFの検証が不要なHTTPメソッド
 */
const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

/**
 * リクエストのOriginを検証
 */
export function validateCsrf(request: NextRequest): {
  valid: boolean;
  error?: string;
} {
  const method = request.method.toUpperCase();

  // 安全なメソッドはCSRF検証をスキップ
  if (SAFE_METHODS.includes(method)) {
    return { valid: true };
  }

  // Originヘッダーを取得
  const origin = request.headers.get("Origin");
  const referer = request.headers.get("Referer");

  // Originが存在する場合、それを検証
  if (origin) {
    if (TRUSTED_ORIGINS.some((trusted) => origin.startsWith(trusted))) {
      return { valid: true };
    }
    return {
      valid: false,
      error: `Untrusted origin: ${origin}`,
    };
  }

  // Originがない場合、Refererを検証
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      if (TRUSTED_ORIGINS.some((trusted) => refererOrigin.startsWith(trusted))) {
        return { valid: true };
      }
    } catch {
      // 無効なReferer URL
    }
    return {
      valid: false,
      error: `Untrusted referer: ${referer}`,
    };
  }

  // Origin/Refererどちらもない場合（APIクライアントなど）
  // モバイルAPIの場合はJWT認証で保護されるためOK
  const isMobileApi = request.nextUrl.pathname.startsWith("/api/mobile");
  if (isMobileApi) {
    return { valid: true };
  }

  return {
    valid: false,
    error: "Missing Origin or Referer header",
  };
}

/**
 * CSRF検証をミドルウェアとして使用
 */
export function csrfMiddleware(handler: (request: NextRequest) => Promise<Response>) {
  return async (request: NextRequest): Promise<Response> => {
    const { valid, error } = validateCsrf(request);

    if (!valid) {
      return new Response(JSON.stringify({ error: "CSRF validation failed", details: error }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    return handler(request);
  };
}
