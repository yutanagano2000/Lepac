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

    // バリデーション
    if (!body.accessToken) {
      return NextResponse.json(
        { error: "accessToken is required" },
        { status: 400 }
      );
    }

    // LINE トークンを検証
    const lineProfile = await verifyLineToken(body.accessToken);
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
    console.error("[LINE Auth] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
