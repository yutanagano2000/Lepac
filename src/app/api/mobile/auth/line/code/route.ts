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

    // バリデーション
    if (!body.code) {
      return NextResponse.json(
        { error: "code is required" },
        { status: 400 }
      );
    }

    if (!body.redirectUri) {
      return NextResponse.json(
        { error: "redirectUri is required" },
        { status: 400 }
      );
    }

    // redirectURIのホワイトリスト検証（SSRF対策）
    if (!isValidRedirectUri(body.redirectUri)) {
      return NextResponse.json(
        { error: "Invalid redirect URI" },
        { status: 400 }
      );
    }

    // 1. 認証コードをアクセストークンに交換
    const tokenResponse = await exchangeCodeForToken(body.code, body.redirectUri);
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
    console.error("[LINE Auth] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
