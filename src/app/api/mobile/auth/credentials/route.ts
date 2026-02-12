/**
 * モバイル ユーザー名/パスワード認証 API
 * POST /api/mobile/auth/credentials
 *
 * ユーザー名とパスワードで認証し、JWTを発行
 * セキュリティ対策:
 * - レート制限（ブルートフォース攻撃対策）
 * - タイミング攻撃対策（常に一定時間で応答）
 * - 詳細なエラー情報を隠蔽
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { signMobileToken } from "@/lib/jwt";
import { rateLimitGuard } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

interface CredentialsRequest {
  username: string;
  password: string;
}

// タイミング攻撃対策: ダミーのハッシュ比較用
const DUMMY_HASH = "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYqQJUHG8T16";

export async function POST(request: NextRequest) {
  // レート制限チェック（ブルートフォース攻撃対策）
  const rateLimitError = await rateLimitGuard(request, "mobile-auth-credentials", "login");
  if (rateLimitError) {
    return rateLimitError;
  }

  try {
    let body: CredentialsRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // バリデーション
    if (!body.username || !body.password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // 入力の長さ制限（DoS対策）
    if (body.username.length > 100 || body.password.length > 200) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // ユーザー検索
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, body.username));

    // タイミング攻撃対策: ユーザーが存在しなくてもハッシュ比較を実行
    // パスワードがnull/undefined/空文字列の場合もダミーハッシュを使用
    const passwordToCompare = (user?.password && user.password.length > 0) ? user.password : DUMMY_HASH;
    const isValidPassword = await bcrypt.compare(body.password, passwordToCompare);

    // ユーザーが存在しないか、パスワードが設定されていないか、パスワードが不正
    if (!user || !user.password || !isValidPassword) {
      // 詳細なエラー情報を隠蔽（ユーザー名の存在確認を防止）
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 組織情報を取得
    let organization = null;
    if (user.organizationId) {
      const [org] = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          code: organizations.code,
        })
        .from(organizations)
        .where(eq(organizations.id, user.organizationId));
      organization = org;
    }

    // JWT発行
    const token = await signMobileToken({
      userId: user.id,
      username: user.username,
      organizationId: user.organizationId,
      role: user.role,
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
        role: user.role,
        organizationId: user.organizationId,
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
    // セキュリティ: errorオブジェクトの詳細をログに出力しない（機密情報漏洩防止）
    console.error("[Credentials Auth API] Authentication error occurred");
    if (process.env.NODE_ENV === "development") {
      console.error("[DEV]", error instanceof Error ? error.message : "Unknown error");
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
