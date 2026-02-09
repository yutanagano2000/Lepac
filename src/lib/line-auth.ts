/**
 * LINE 認証共通ユーティリティ
 * モバイルAPI用のLINE認証処理を共通化
 */

import { db } from "@/db";
import { users, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { signMobileToken } from "@/lib/jwt";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

// LINE API URLs
export const LINE_TOKEN_API = "https://api.line.me/oauth2/v2.1/token";
export const LINE_PROFILE_API = "https://api.line.me/v2/profile";

// 許可されたリダイレクトURIのパターン
const ALLOWED_REDIRECT_PATTERNS = [
  /^vantage:\/\/oauth$/,                           // iOSアプリ
  /^https:\/\/lepac\.vercel\.app\/.*$/,           // 本番環境
  /^http:\/\/localhost:\d+\/.*$/,                 // ローカル開発
];

// LINE Profile 型
export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

// LINE Token レスポンス型
export interface LineTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  id_token?: string;
}

// 認証レスポンス型
export interface AuthResult {
  token: string;
  user: {
    id: number;
    name: string | null;
    username: string;
    image: string | null;
    role: string;
    organizationId: number | null;
  };
  organization: {
    id: number;
    name: string;
    code: string | null;
  } | null;
}

/**
 * リダイレクトURIが許可されているかチェック
 */
export function isValidRedirectUri(uri: string): boolean {
  return ALLOWED_REDIRECT_PATTERNS.some(pattern => pattern.test(uri));
}

/**
 * LINE アクセストークンを検証してプロファイルを取得
 */
export async function verifyLineToken(accessToken: string): Promise<LineProfile | null> {
  try {
    const response = await fetch(LINE_PROFILE_API, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const profile = await response.json();
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
    };
  } catch {
    return null;
  }
}

/**
 * 認証コードをアクセストークンに交換
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<LineTokenResponse | null> {
  try {
    const channelId = process.env.LINE_CHANNEL_ID;
    const channelSecret = process.env.LINE_CHANNEL_SECRET;

    if (!channelId || !channelSecret) {
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
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

/**
 * LINE プロファイルからユーザーを検索または作成し、JWTを発行
 */
export async function processLineAuth(lineProfile: LineProfile): Promise<AuthResult> {
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
  } else {
    // 新規ユーザー: 作成
    const username = `line_${lineProfile.userId.substring(0, 8)}`;
    // セキュアなランダムパスワードを生成（LINE認証ユーザーはパスワード不使用）
    const randomPassword = randomBytes(32).toString("hex");
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

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

  return {
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
  };
}
