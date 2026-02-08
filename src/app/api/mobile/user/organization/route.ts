/**
 * モバイル ユーザー組織設定 API
 * PUT /api/mobile/user/organization
 *
 * ユーザーの所属組織を設定し、新しいJWTを発行
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getMobileAuthFromRequest, signMobileToken } from "@/lib/jwt";

interface SetOrganizationRequest {
  organizationId: number;
}

export async function PUT(request: NextRequest) {
  try {
    // JWT認証チェック
    const auth = await getMobileAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: SetOrganizationRequest = await request.json();

    // バリデーション
    if (!body.organizationId || typeof body.organizationId !== "number") {
      return NextResponse.json(
        { error: "organizationId is required and must be a number" },
        { status: 400 }
      );
    }

    // 組織の存在確認
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, body.organizationId));

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // 開発用adminユーザー (id: 999) の場合はDB更新をスキップ
    if (auth.userId === 999) {
      const newToken = await signMobileToken({
        userId: 999,
        username: "admin",
        organizationId: body.organizationId,
        role: "admin",
      });

      console.log(`[User Organization] Dev admin set organization to ${body.organizationId}`);

      return NextResponse.json({
        success: true,
        token: newToken,
        user: {
          id: 999,
          name: "管理者",
          username: "admin",
          image: null,
          role: "admin",
          organizationId: body.organizationId,
        },
        organization: {
          id: org.id,
          name: org.name,
          code: org.code,
        },
      });
    }

    // ユーザーの組織IDを更新
    await db
      .update(users)
      .set({ organizationId: body.organizationId })
      .where(eq(users.id, auth.userId));

    // 更新されたユーザー情報を取得
    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, auth.userId));

    // 新しいJWTを発行（organizationIdを含む）
    const newToken = await signMobileToken({
      userId: updatedUser.id,
      username: updatedUser.username,
      organizationId: updatedUser.organizationId,
      role: updatedUser.role,
    });

    console.log(`[User Organization] User ${auth.userId} set organization to ${body.organizationId}`);

    return NextResponse.json({
      success: true,
      token: newToken,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        username: updatedUser.username,
        image: updatedUser.image,
        role: updatedUser.role,
        organizationId: updatedUser.organizationId,
      },
      organization: {
        id: org.id,
        name: org.name,
        code: org.code,
      },
    });
  } catch (error) {
    console.error("[User Organization API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
