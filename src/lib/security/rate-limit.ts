import { NextRequest } from "next/server";

/**
 * シンプルなインメモリレート制限
 *
 * 本番環境ではRedisなどの分散キャッシュを使用することを推奨
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// レート制限のストア（インメモリ）
const rateLimitStore = new Map<string, RateLimitEntry>();

// デフォルトのレート制限設定
const DEFAULT_MAX_REQUESTS = 100; // 最大リクエスト数
const DEFAULT_WINDOW_MS = 60 * 1000; // ウィンドウサイズ（1分）

interface RateLimitConfig {
  maxRequests?: number;
  windowMs?: number;
  keyGenerator?: (request: NextRequest) => string;
}

/**
 * クライアントの識別キーを生成
 */
function getDefaultKey(request: NextRequest): string {
  // X-Forwarded-ForヘッダーからクライアントIPを取得
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  // X-Real-IPヘッダー
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // フォールバック
  return "unknown";
}

/**
 * レート制限をチェック
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = {}
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const {
    maxRequests = DEFAULT_MAX_REQUESTS,
    windowMs = DEFAULT_WINDOW_MS,
    keyGenerator = getDefaultKey,
  } = config;

  const key = keyGenerator(request);
  const now = Date.now();

  // 既存のエントリを取得または新規作成
  let entry = rateLimitStore.get(key);

  // エントリがない、またはウィンドウがリセットされた場合
  if (!entry || now >= entry.resetTime) {
    entry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, entry);
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: entry.resetTime,
    };
  }

  // カウントを増加
  entry.count++;
  rateLimitStore.set(key, entry);

  // 制限を超えたかチェック
  if (entry.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * レート制限ミドルウェア
 */
export function rateLimitMiddleware(
  handler: (request: NextRequest) => Promise<Response>,
  config: RateLimitConfig = {}
) {
  return async (request: NextRequest): Promise<Response> => {
    const result = checkRateLimit(request, config);

    // レスポンスヘッダーにレート制限情報を追加
    const headers = new Headers();
    headers.set("X-RateLimit-Remaining", String(result.remaining));
    headers.set("X-RateLimit-Reset", String(result.resetTime));

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: "Too many requests",
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            ...Object.fromEntries(headers),
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((result.resetTime - Date.now()) / 1000)),
          },
        }
      );
    }

    const response = await handler(request);

    // ハンドラーがレスポンスを返さない場合のフォールバック
    if (!response) {
      return new Response(null, {
        status: 200,
        headers: Object.fromEntries(headers),
      });
    }

    // 既存のレスポンスにレート制限ヘッダーを追加
    const newResponse = new Response(response.body, response);
    headers.forEach((value, key) => {
      newResponse.headers.set(key, value);
    });

    return newResponse;
  };
}

/**
 * レート制限ストアをクリア（テスト用）
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}

/**
 * 特定のキーのエントリを取得（テスト用）
 */
export function getRateLimitEntry(key: string): RateLimitEntry | undefined {
  return rateLimitStore.get(key);
}
