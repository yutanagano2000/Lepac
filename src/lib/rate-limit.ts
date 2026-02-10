/**
 * レート制限ユーティリティ
 * SQLiteベースのブルートフォース攻撃・DDoS対策
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

// レート制限設定
export const RATE_LIMIT_CONFIG = {
  // ログイン試行: 5回/5分
  login: {
    maxRequests: 5,
    windowMs: 5 * 60 * 1000, // 5分
  },
  // API呼び出し: 100回/分
  api: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1分
  },
  // 厳格なエンドポイント（パスワードリセット等）: 3回/15分
  strict: {
    maxRequests: 3,
    windowMs: 15 * 60 * 1000, // 15分
  },
} as const;

export type RateLimitType = keyof typeof RATE_LIMIT_CONFIG;

/**
 * リクエストからIPアドレスを取得
 */
function getIpAddress(request: NextRequest): string {
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

  return "unknown";
}

/**
 * レート制限チェック結果
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * レート制限をチェック
 * @param identifier IPアドレスまたはユーザーID
 * @param endpoint エンドポイント種別
 * @param type レート制限タイプ
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  type: RateLimitType = "api"
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIG[type];
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);
  const windowStartStr = windowStart.toISOString();

  try {
    // アトミックにカウントをインクリメント（競合状態防止）
    await db
      .update(rateLimits)
      .set({ requestCount: sql`${rateLimits.requestCount} + 1` })
      .where(
        and(
          eq(rateLimits.identifier, identifier),
          eq(rateLimits.endpoint, endpoint),
          gte(rateLimits.windowStart, windowStartStr)
        )
      );

    // 更新後の値を取得
    const [existing] = await db
      .select({
        id: rateLimits.id,
        requestCount: rateLimits.requestCount,
        windowStart: rateLimits.windowStart,
      })
      .from(rateLimits)
      .where(
        and(
          eq(rateLimits.identifier, identifier),
          eq(rateLimits.endpoint, endpoint),
          gte(rateLimits.windowStart, windowStartStr)
        )
      )
      .limit(1);

    if (existing) {
      if (existing.requestCount > config.maxRequests) {
        const resetAt = new Date(
          new Date(existing.windowStart).getTime() + config.windowMs
        );
        return {
          allowed: false,
          remaining: 0,
          resetAt,
        };
      }

      return {
        allowed: true,
        remaining: config.maxRequests - existing.requestCount,
        resetAt: new Date(
          new Date(existing.windowStart).getTime() + config.windowMs
        ),
      };
    } else {
      // 新しいウィンドウを開始
      await db.insert(rateLimits).values({
        identifier,
        endpoint,
        requestCount: 1,
        windowStart: now.toISOString(),
        createdAt: now.toISOString(),
      });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: new Date(now.getTime() + config.windowMs),
      };
    }
  } catch (error) {
    console.error("[RateLimit] Error checking rate limit:", error);
    // DB障害時はセキュリティ優先で拒否（fail-closed）
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(now.getTime() + config.windowMs),
    };
  }
}

/**
 * リクエストに対するレート制限チェック
 */
export async function checkRequestRateLimit(
  request: NextRequest,
  endpoint: string,
  type: RateLimitType = "api"
): Promise<RateLimitResult> {
  const ip = getIpAddress(request);
  return checkRateLimit(ip, endpoint, type);
}

/**
 * レート制限ガード（429レスポンスを返す）
 */
export async function rateLimitGuard(
  request: NextRequest,
  endpoint: string,
  type: RateLimitType = "api"
): Promise<NextResponse | null> {
  const result = await checkRequestRateLimit(request, endpoint, type);

  if (!result.allowed) {
    const retryAfter = Math.ceil(
      (result.resetAt.getTime() - Date.now()) / 1000
    );

    return NextResponse.json(
      {
        error: "リクエスト回数の上限に達しました。しばらく待ってから再試行してください。",
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(RATE_LIMIT_CONFIG[type].maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.floor(result.resetAt.getTime() / 1000)),
        },
      }
    );
  }

  return null;
}

/**
 * 古いレート制限レコードをクリーンアップ
 * 定期実行推奨（1時間ごと等）
 */
export async function cleanupOldRateLimits(): Promise<number> {
  // 1時間以上前のレコードを削除
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  try {
    const result = await db
      .delete(rateLimits)
      .where(sql`${rateLimits.windowStart} < ${cutoff}`);

    return result.rowsAffected ?? 0;
  } catch (error) {
    console.error("[RateLimit] Error cleaning up old records:", error);
    return 0;
  }
}
