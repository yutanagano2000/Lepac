import { NextResponse } from "next/server";
import { db } from "@/db";
import { constructionProgress, CONSTRUCTION_PROGRESS_CATEGORIES } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// 工事進捗一覧取得
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);

  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const progressList = await db
    .select()
    .from(constructionProgress)
    .where(eq(constructionProgress.projectId, projectId))
    .orderBy(desc(constructionProgress.createdAt));

  return NextResponse.json(progressList);
}

// 工事進捗作成・更新
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);

  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { category, status, note } = body;

    // カテゴリのバリデーション
    if (!CONSTRUCTION_PROGRESS_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Allowed: ${CONSTRUCTION_PROGRESS_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    // ステータスのバリデーション
    const allowedStatuses = ["pending", "in_progress", "completed"];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Allowed: pending, in_progress, completed" },
        { status: 400 }
      );
    }

    // 同じカテゴリが既に存在するか確認
    const existing = await db
      .select()
      .from(constructionProgress)
      .where(
        and(
          eq(constructionProgress.projectId, projectId),
          eq(constructionProgress.category, category)
        )
      )
      .limit(1);

    const now = new Date().toISOString();

    if (existing.length > 0) {
      // 更新
      const [result] = await db
        .update(constructionProgress)
        .set({
          status,
          note: note || null,
          completedAt: status === "completed" ? now : null,
          updatedAt: now,
        })
        .where(eq(constructionProgress.id, existing[0].id))
        .returning();

      return NextResponse.json(result);
    } else {
      // 新規作成
      const [result] = await db
        .insert(constructionProgress)
        .values({
          projectId,
          category,
          status,
          note: note || null,
          completedAt: status === "completed" ? now : null,
          createdAt: now,
        })
        .returning();

      return NextResponse.json(result);
    }
  } catch (error) {
    console.error("Construction progress error:", error);
    return NextResponse.json(
      { error: "Failed to save construction progress" },
      { status: 500 }
    );
  }
}
