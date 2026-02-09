import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { progress } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireProjectAccess, requireProjectAccessWithCsrf } from "@/lib/auth-guard";
import { validateBody, createProgressSchema, updateProgressSchema } from "@/lib/validations";
import { createErrorResponse } from "@/lib/api-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = Number(id);

    // NaNチェック
    if (Number.isNaN(projectId) || projectId <= 0) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    // 認証・組織・プロジェクト所有権チェック
    const authResult = await requireProjectAccess(projectId);
    if (!authResult.success) {
      return authResult.response;
    }

    const allProgress = await db
      .select()
      .from(progress)
      .where(eq(progress.projectId, projectId))
      .orderBy(desc(progress.createdAt));
    return NextResponse.json(allProgress);
  } catch (error) {
    return createErrorResponse(error, "進捗の取得に失敗しました");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = Number(id);

    // NaNチェック
    if (Number.isNaN(projectId) || projectId <= 0) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    // 認証・組織・プロジェクト所有権チェック（CSRF保護付き）
    const authResult = await requireProjectAccessWithCsrf(request, projectId);
    if (!authResult.success) {
      return authResult.response;
    }

    // 入力バリデーション
    const validation = await validateBody(request, createProgressSchema);
    if (!validation.success) {
      return NextResponse.json(validation.error, { status: 400 });
    }

    const { title, description, status, createdAt } = validation.data;

    const [result] = await db
      .insert(progress)
      .values({
        projectId,
        title,
        description: description || null,
        status: status || "planned",
        createdAt: createdAt || new Date().toISOString(),
      })
      .returning();
    return NextResponse.json(result);
  } catch (error) {
    return createErrorResponse(error, "進捗の作成に失敗しました");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = Number(id);

    // NaNチェック
    if (Number.isNaN(projectId) || projectId <= 0) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    // 認証・組織・プロジェクト所有権チェック（CSRF保護付き）
    const authResult = await requireProjectAccessWithCsrf(request, projectId);
    if (!authResult.success) {
      return authResult.response;
    }

    // 入力バリデーション
    const validation = await validateBody(request, updateProgressSchema);
    if (!validation.success) {
      return NextResponse.json(validation.error, { status: 400 });
    }

    const { progressId, title, description, status, createdAt, completedAt } = validation.data;

    // 進捗がこのプロジェクトに属するか確認（所有権チェック）
    const [existingProgress] = await db
      .select()
      .from(progress)
      .where(and(eq(progress.id, progressId), eq(progress.projectId, projectId)));

    if (!existingProgress) {
      return NextResponse.json({ error: "Progress not found" }, { status: 404 });
    }

    // 更新するフィールドを構築
    const updateFields: Record<string, unknown> = {};
    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (status !== undefined) updateFields.status = status;
    if (createdAt !== undefined) updateFields.createdAt = createdAt;
    if (completedAt !== undefined) updateFields.completedAt = completedAt;

    const [result] = await db
      .update(progress)
      .set(updateFields)
      .where(eq(progress.id, progressId))
      .returning();
    return NextResponse.json(result);
  } catch (error) {
    return createErrorResponse(error, "進捗の更新に失敗しました");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = Number(id);

    // NaNチェック
    if (Number.isNaN(projectId) || projectId <= 0) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    // 認証・組織・プロジェクト所有権チェック（CSRF保護付き）
    const authResult = await requireProjectAccessWithCsrf(request, projectId);
    if (!authResult.success) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const progressIdParam = searchParams.get("progressId");
    if (!progressIdParam) {
      return NextResponse.json({ error: "progressId is required" }, { status: 400 });
    }

    const progressId = Number(progressIdParam);
    if (Number.isNaN(progressId) || progressId <= 0) {
      return NextResponse.json({ error: "Invalid progressId" }, { status: 400 });
    }

    // 進捗がこのプロジェクトに属するか確認（所有権チェック）
    const [existingProgress] = await db
      .select()
      .from(progress)
      .where(and(eq(progress.id, progressId), eq(progress.projectId, projectId)));

    if (!existingProgress) {
      return NextResponse.json({ error: "Progress not found" }, { status: 404 });
    }

    await db.delete(progress).where(eq(progress.id, progressId));
    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error, "進捗の削除に失敗しました");
  }
}
