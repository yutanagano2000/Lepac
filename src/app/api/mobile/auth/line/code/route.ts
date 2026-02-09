/**
 * モバイル LINE 認証コード交換 API
 * POST /api/mobile/auth/line/code
 *
 * Vantage (iOS) から LINE OAuth 認証コードを受け取り、
 * サーバーサイドでアクセストークンに交換し、JWT を発行する
 */

import { NextRequest, NextResponse } from "next/server";
import {
  isValidRedirectUri,
  exchangeCodeForToken,
  verifyLineToken,
  processLineAuth,
} from "@/lib/line-auth";

// リクエスト型
interface CodeAuthRequest {
  code: string;
  redirectUri: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CodeAuthRequest = await request.json();

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
