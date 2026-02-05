import { NextResponse } from "next/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// 組織一覧を取得
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db.select().from(organizations);
  return NextResponse.json(rows);
}

// 新規組織を作成（「その他」で自由入力した場合）
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
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
  } catch (error: any) {
    // 重複エラーの場合
    if (error.message?.includes("UNIQUE constraint failed")) {
      // 既存の組織を返す
      const existing = await db.select().from(organizations);
      const found = existing.find((org) => org.name === name || org.code === code);
      if (found) {
        return NextResponse.json(found);
      }
    }
    throw error;
  }
}
