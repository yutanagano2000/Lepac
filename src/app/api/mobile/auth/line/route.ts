/**
 * モバイル LINE 認証 API
 * POST /api/mobile/auth/line
 *
 * Vantage (iOS) から LINE SDK で取得したアクセストークンを検証し、
 * Lepac 用の JWT を発行する
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { signMobileToken } from "@/lib/jwt";
import bcrypt from "bcryptjs";

// LINE Profile API URL
const LINE_PROFILE_API = "https://api.line.me/v2/profile";

// リクエスト型
interface LineAuthRequest {
  accessToken: string;
  lineUserId?: string; // オプション（検証用）
}

// LINE Profile レスポンス型
interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

/**
 * LINE アクセストークンを検証してプロファイルを取得
 */
async function verifyLineToken(accessToken: string): Promise<LineProfile | null> {
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
    console.error("[LINE Auth] Token verification failed:", error);
    return null;
  }
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

    console.log("[LINE Auth] Profile verified:", lineProfile.userId);

    // DB でユーザーを検索
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

    // 組織情報を取得（存在すれば）
    let organization = null;
    if (existingUser.organizationId) {
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, existingUser.organizationId));
      organization = org || null;
    }

    // JWT を発行
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
