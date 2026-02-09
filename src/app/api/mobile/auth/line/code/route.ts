/**
 * モバイル LINE 認証コード交換 API
 * POST /api/mobile/auth/line/code
 *
 * Vantage (iOS) から LINE OAuth 認証コードを受け取り、
 * サーバーサイドでアクセストークンに交換し、JWT を発行する
 *
 * セキュリティ対策:
 * - レート制限（ブルートフォース攻撃対策）
 * - redirectURIホワイトリスト検証（SSRF対策）
 */

import { NextRequest, NextResponse } from "next/server";
import {
  isValidRedirectUri,
  exchangeCodeForToken,
  verifyLineToken,
  processLineAuth,
} from "@/lib/line-auth";
import { rateLimitGuard } from "@/lib/rate-limit";

// リクエスト型
interface CodeAuthRequest {
  code: string;
  redirectUri: string;
}

// 入力検証用の定数
const MAX_CODE_LENGTH = 512;
const MAX_REDIRECT_URI_LENGTH = 2048;
const CODE_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * 入力文字列をサニタイズ・検証
 */
function validateAuthCode(code: unknown): string | null {
  if (typeof code !== "string") return null;
  const trimmed = code.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_CODE_LENGTH) return null;
  if (!CODE_PATTERN.test(trimmed)) return null;
  return trimmed;
}

function validateRedirectUri(uri: unknown): string | null {
  if (typeof uri !== "string") return null;
  const trimmed = uri.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_REDIRECT_URI_LENGTH) return null;
  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  // レート制限チェック
  const rateLimitError = await rateLimitGuard(request, "mobile-auth-line-code", "login");
  if (rateLimitError) {
    return rateLimitError;
  }

  try {
    let body: CodeAuthRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // バリデーション（サニタイズ含む）
    const code = validateAuthCode(body.code);
    if (!code) {
      return NextResponse.json(
        { error: "Invalid or missing code" },
        { status: 400 }
      );
    }

    const redirectUri = validateRedirectUri(body.redirectUri);
    if (!redirectUri) {
      return NextResponse.json(
        { error: "Invalid or missing redirectUri" },
        { status: 400 }
      );
    }

    // redirectURIのホワイトリスト検証（SSRF対策）
    if (!isValidRedirectUri(redirectUri)) {
      return NextResponse.json(
        { error: "Unauthorized redirect URI" },
        { status: 400 }
      );
    }

    // 1. 認証コードをアクセストークンに交換（サニタイズ済みの値を使用）
    const tokenResponse = await exchangeCodeForToken(code, redirectUri);
    if (!tokenResponse) {
      return NextResponse.json(
        { error: "Failed to exchange authorization code" },
        { status: 401 }
      );
    }

    // 2. プロファイル取得
    const lineProfile = await verifyLineToken(tokenResponse.access_token);
    if (!lineProfile) {
      return NextResponse.json(
        { error: "Failed to get LINE profile" },
        { status: 401 }
      );
    }

    // 3. ユーザー処理とJWT発行
    const result = await processLineAuth(lineProfile);

    return NextResponse.json(result);
  } catch (error) {
    // エラーログには詳細を記録するが、クライアントには一般的なメッセージのみ返す
    console.error("[LINE Auth Code] Error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
