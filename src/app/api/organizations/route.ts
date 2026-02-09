import { NextResponse } from "next/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// 組織一覧を取得（ユーザーが所属する組織のみ）
export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return authResult.response;
  }
  const { user } = authResult;

  // 管理者の場合は全組織を取得可能
  if (user.role === "admin") {
    const rows = await db.select().from(organizations);
    return NextResponse.json(rows);
  }

  // ユーザーが組織に所属している場合、その組織のみ返す
  if (user.organizationId) {
    const rows = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user.organizationId));
    return NextResponse.json(rows);
  }

  // 組織未所属のユーザー（オンボーディング中）には全組織を返す
  // これにより新規ユーザーが既存組織を選択可能になる
  const rows = await db.select().from(organizations);
  return NextResponse.json(rows);
}

// 新規組織を作成（「その他」で自由入力した場合）
export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return authResult.response;
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const name = body.name?.trim() ?? "";

  if (!name) {
    return NextResponse.json(
      { error: "Organization name is required" },
      { status: 400 }
    );
  }

  // 組織コードを生成（名前をケバブケースに変換）
  const code = name
    .toLowerCase()
    .replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || `org-${Date.now()}`;

  try {
    const [result] = await db
      .insert(organizations)
      .values({
        name,
        code,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(result);
  } catch (error) {
    // 重複エラーの場合
    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("UNIQUE constraint failed")) {
      // 既存の組織を返す（名前またはコードで検索）
      const existingByName = await db
        .select()
        .from(organizations)
        .where(eq(organizations.name, name));
      if (existingByName.length > 0) {
        return NextResponse.json(existingByName[0]);
      }
      const existingByCode = await db
        .select()
        .from(organizations)
        .where(eq(organizations.code, code));
      if (existingByCode.length > 0) {
        return NextResponse.json(existingByCode[0]);
      }
    }
    // エラー詳細をログに出力し、クライアントには一般的なメッセージを返す
    console.error("Failed to create organization:", error);
    return NextResponse.json(
      { error: "組織の作成に失敗しました" },
      { status: 500 }
    );
  }
}
