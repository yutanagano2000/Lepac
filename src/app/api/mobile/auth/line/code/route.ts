/**
 * モバイル LINE 認証コード交換 API
 * POST /api/mobile/auth/line/code
 *
 * Vantage (iOS) から LINE OAuth 認証コードを受け取り、
 * サーバーサイドでアクセストークンに交換し、JWT を発行する
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { signMobileToken } from "@/lib/jwt";
import bcrypt from "bcryptjs";

// LINE Token API
const LINE_TOKEN_API = "https://api.line.me/oauth2/v2.1/token";
const LINE_PROFILE_API = "https://api.line.me/v2/profile";

// リクエスト型
interface CodeAuthRequest {
  code: string;
  redirectUri: string;
}

// LINE Token レスポンス型
interface LineTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  id_token?: string;
}

// LINE Profile レスポンス型
interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

/**
 * 認証コードをアクセストークンに交換
 */
async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<LineTokenResponse | null> {
  try {
    const channelId = process.env.LINE_CHANNEL_ID;
    const channelSecret = process.env.LINE_CHANNEL_SECRET;

    if (!channelId || !channelSecret) {
      console.error("[LINE Auth] Channel ID or Secret not configured");
      return null;
    }

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: channelId,
      client_secret: channelSecret,
    });

    const response = await fetch(LINE_TOKEN_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[LINE Auth] Token exchange failed:", response.status, errorText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("[LINE Auth] Token exchange error:", error);
    return null;
  }
}

/**
 * アクセストークンでプロファイルを取得
 */
async function getLineProfile(accessToken: string): Promise<LineProfile | null> {
  try {
    const response = await fetch(LINE_PROFILE_API, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error("[LINE Auth] Profile API error:", response.status);
      return null;
    }

    const profile = await response.json();
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
    };
  } catch (error) {
    console.error("[LINE Auth] Profile fetch failed:", error);
    return null;
  }
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

    console.log("[LINE Auth] Exchanging code for token...");

    // 1. 認証コードをアクセストークンに交換
    const tokenResponse = await exchangeCodeForToken(body.code, body.redirectUri);
    if (!tokenResponse) {
      return NextResponse.json(
        { error: "Failed to exchange authorization code" },
        { status: 401 }
      );
    }

    console.log("[LINE Auth] Token obtained, fetching profile...");

    // 2. プロファイル取得
    const lineProfile = await getLineProfile(tokenResponse.access_token);
    if (!lineProfile) {
      return NextResponse.json(
        { error: "Failed to get LINE profile" },
        { status: 401 }
      );
    }

    console.log("[LINE Auth] Profile verified:", lineProfile.userId);

    // 3. DB でユーザーを検索
    let [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.lineId, lineProfile.userId));

    if (existingUser) {
      // 既存ユーザー: プロファイル情報を更新
      await db
        .update(users)
        .set({
          name: lineProfile.displayName,
          image: lineProfile.pictureUrl,
        })
        .where(eq(users.lineId, lineProfile.userId));

      console.log("[LINE Auth] Existing user updated:", existingUser.id);
    } else {
      // 新規ユーザー: 作成
      const username = `line_${lineProfile.userId.substring(0, 8)}`;
      const hashedPassword = await bcrypt.hash(lineProfile.userId, 10);

      const [newUser] = await db
        .insert(users)
        .values({
          username,
          name: lineProfile.displayName,
          password: hashedPassword,
          lineId: lineProfile.userId,
          image: lineProfile.pictureUrl,
          role: "field", // 現場作業員としてデフォルト設定
        })
        .returning();

      existingUser = newUser;
      console.log("[LINE Auth] New user created:", newUser.id);
    }

    // 4. 組織情報を取得（存在すれば）
    let organization = null;
    if (existingUser.organizationId) {
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, existingUser.organizationId));
      organization = org || null;
    }

    // 5. JWT を発行
    const token = await signMobileToken({
      userId: existingUser.id,
      username: existingUser.username,
      organizationId: existingUser.organizationId,
      role: existingUser.role,
    });

    // レスポンス
    return NextResponse.json({
      token,
      user: {
        id: existingUser.id,
        name: existingUser.name,
        username: existingUser.username,
        image: existingUser.image,
        role: existingUser.role,
        organizationId: existingUser.organizationId,
      },
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
            code: organization.code,
          }
        : null,
    });
  } catch (error) {
    console.error("[LINE Auth] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
