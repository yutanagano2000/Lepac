/**
 * モバイル ユーザー名/パスワード認証 API
 * POST /api/mobile/auth/credentials
 *
 * ユーザー名とパスワードで認証し、JWTを発行
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { signMobileToken } from "@/lib/jwt";
import bcrypt from "bcryptjs";

interface CredentialsRequest {
  username: string;
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CredentialsRequest = await request.json();

    // バリデーション
    if (!body.username || !body.password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // 開発用admin認証（NODE_ENV=developmentの場合のみ有効）
    if (
      process.env.NODE_ENV === "development" &&
      body.username === "admin" &&
      body.password === "admin123"
    ) {
      console.log(`[Credentials Auth] Dev admin login`);

      // JWT発行（開発用admin）
      const token = await signMobileToken({
        userId: 999,
        username: "admin",
        organizationId: null, // 組織未選択
        role: "admin",
      });

      return NextResponse.json({
        token,
        user: {
          id: 999,
          name: "管理者",
          username: "admin",
          image: null,
          role: "admin",
          organizationId: null,
        },
        organization: null,
      });
    }

    // ユーザー検索
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, body.username));

    if (!user) {
      console.log(`[Credentials Auth] User not found`);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // パスワード検証
    let isValidPassword = false;

    if (user.password) {
      // ハッシュ化されたパスワードと比較
      isValidPassword = await bcrypt.compare(body.password, user.password);
    }

    if (!isValidPassword) {
      console.log(`[Credentials Auth] Invalid password`);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 組織情報を取得
    let organization = null;
    if (user.organizationId) {
      const [org] = await db
        .select()
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

    console.log(`[Credentials Auth] Login successful (userId: ${user.id}, role: ${user.role})`);

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
    console.error("[Credentials Auth API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
