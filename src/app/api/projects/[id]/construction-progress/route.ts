import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { constructionProgress, CONSTRUCTION_PROGRESS_CATEGORIES } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireProjectAccess, requireProjectAccessWithCsrf } from "@/lib/auth-guard";

// 文字列サニタイズ（XSS対策）
function sanitizeString(str: string | null | undefined, maxLength: number = 500): string | null {
  if (!str) return null;
  return str
    .slice(0, maxLength)
    .replace(/[<>]/g, "")  // HTMLタグ除去
    .trim();
}

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

  // 認証・組織・プロジェクト所有権チェック
  const authResult = await requireProjectAccess(projectId);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const progressList = await db
      .select()
      .from(constructionProgress)
      .where(eq(constructionProgress.projectId, projectId))
      .orderBy(desc(constructionProgress.createdAt));

    return NextResponse.json(progressList);
  } catch (error) {
    console.error("Get construction progress error:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}

// 工事進捗作成・更新
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);

  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  // 認証・組織・プロジェクト所有権チェック
  const authResult = await requireProjectAccessWithCsrf(request, projectId);
  if (!authResult.success) {
    return authResult.response;
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

    // 入力値サニタイズ
    const sanitizedNote = sanitizeString(note, 1000);

    if (existing.length > 0) {
      // 更新
      const [result] = await db
        .update(constructionProgress)
        .set({
          status,
          note: sanitizedNote,
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
          note: sanitizedNote,
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
