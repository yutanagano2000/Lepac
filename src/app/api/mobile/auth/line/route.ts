/**
 * モバイル LINE 認証 API
 * POST /api/mobile/auth/line
 *
 * Vantage (iOS) から LINE SDK で取得したアクセストークンを検証し、
 * Lepac 用の JWT を発行する
 *
 * セキュリティ対策:
 * - レート制限（ブルートフォース攻撃対策）
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyLineToken, processLineAuth } from "@/lib/line-auth";
import { rateLimitGuard } from "@/lib/rate-limit";

// リクエスト型
interface LineAuthRequest {
  accessToken: string;
  lineUserId?: string; // オプション（検証用）
}

// 入力検証用の定数
const MAX_TOKEN_LENGTH = 2048;
const TOKEN_PATTERN = /^[a-zA-Z0-9_.-]+$/;
const MAX_LINE_USER_ID_LENGTH = 64;
const LINE_USER_ID_PATTERN = /^U[a-f0-9]{32}$/;

/**
 * アクセストークンをサニタイズ・検証
 */
function validateAccessToken(token: unknown): string | null {
  if (typeof token !== "string") return null;
  const trimmed = token.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_TOKEN_LENGTH) return null;
  if (!TOKEN_PATTERN.test(trimmed)) return null;
  return trimmed;
}

/**
 * LINE User IDをサニタイズ・検証（オプション）
 */
function validateLineUserId(userId: unknown): string | null {
  if (userId === undefined || userId === null) return null;
  if (typeof userId !== "string") return null;
  const trimmed = userId.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_LINE_USER_ID_LENGTH) return null;
  if (!LINE_USER_ID_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export async function POST(request: NextRequest) {
  // レート制限チェック
  const rateLimitError = await rateLimitGuard(request, "mobile-auth-line", "login");
  if (rateLimitError) {
    return rateLimitError;
  }

  try {
    let body: LineAuthRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // バリデーション（サニタイズ含む）
    const accessToken = validateAccessToken(body.accessToken);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Invalid or missing accessToken" },
        { status: 400 }
      );
    }

    // lineUserIdが提供された場合は検証（オプション）
    const lineUserId = validateLineUserId(body.lineUserId);
    if (body.lineUserId !== undefined && lineUserId === null && body.lineUserId !== "") {
      return NextResponse.json(
        { error: "Invalid lineUserId format" },
        { status: 400 }
      );
    }

    // LINE トークンを検証（サニタイズ済みの値を使用）
    const lineProfile = await verifyLineToken(accessToken);
    if (!lineProfile) {
      return NextResponse.json(
        { error: "Invalid LINE access token" },
        { status: 401 }
      );
    }

    // ユーザー処理とJWT発行
    const result = await processLineAuth(lineProfile);

    return NextResponse.json(result);
  } catch (error) {
    // エラーログには詳細を記録するが、クライアントには一般的なメッセージのみ返す
    console.error("[LINE Auth] Error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
