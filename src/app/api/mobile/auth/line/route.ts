/**
 * モバイル LINE 認証 API
 * POST /api/mobile/auth/line
 *
 * Vantage (iOS) から LINE SDK で取得したアクセストークンを検証し、
 * Lepac 用の JWT を発行する
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyLineToken, processLineAuth } from "@/lib/line-auth";

// リクエスト型
interface LineAuthRequest {
  accessToken: string;
  lineUserId?: string; // オプション（検証用）
}

export async function POST(request: NextRequest) {
  try {
    const body: LineAuthRequest = await request.json();

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
