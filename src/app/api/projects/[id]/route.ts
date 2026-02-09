import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, progress, comments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { updateProjectSchema, validateBody } from "@/lib/validations";
import { ApiError, createErrorResponse } from "@/lib/api-error";
import { requireOrganization, requireOrganizationWithCsrf } from "@/lib/auth-guard";
import { logProjectUpdate, logProjectDelete } from "@/lib/audit-log";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 認証・組織チェック
    const authResult = await requireOrganization();
    if (!authResult.success) {
      return authResult.response;
    }
    const { organizationId } = authResult;

    const { id } = await params;
    const projectId = Number(id);

    // NaNチェック
    if (Number.isNaN(projectId) || projectId <= 0) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const [project] = await db.select().from(projects).where(
      and(eq(projects.id, projectId), eq(projects.organizationId, organizationId))
    );
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (error) {
    return createErrorResponse(error, "プロジェクトの取得に失敗しました");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 認証・組織チェック（CSRF保護付き）
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) {
    return authResult.response;
  }
  const { user, organizationId } = authResult;

  try {
    const { id } = await params;
    const projectId = Number(id);

    // NaNチェック
    if (Number.isNaN(projectId) || projectId <= 0) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const validation = await validateBody(request, updateProjectSchema);
    if (!validation.success) {
      return NextResponse.json(validation.error, { status: 400 });
    }

    // 組織に属するプロジェクトのみ更新可能
    const [result] = await db
      .update(projects)
      .set(validation.data)
      .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId)))
      .returning();

    if (!result) {
      throw ApiError.notFound("プロジェクトが見つかりません");
    }

    // 監査ログ記録
    await logProjectUpdate(user, result.id, result.managementNumber, validation.data, request);

    return NextResponse.json(result);
  } catch (error) {
    return createErrorResponse(error, "プロジェクトの更新に失敗しました");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 認証・組織チェック（CSRF保護付き）
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) {
    return authResult.response;
  }
  const { user, organizationId } = authResult;

  try {
    const { id } = await params;
    const projectId = Number(id);

    // NaNチェック
    if (Number.isNaN(projectId) || projectId <= 0) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    // 組織に属するプロジェクトか確認
    const [project] = await db.select().from(projects).where(
      and(eq(projects.id, projectId), eq(projects.organizationId, organizationId))
    );
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // 関連するコメントを先に削除
    await db.delete(comments).where(eq(comments.projectId, projectId));

    // 関連する進捗を削除
    await db.delete(progress).where(eq(progress.projectId, projectId));

    // 案件を削除
    await db.delete(projects).where(eq(projects.id, projectId));

    // 監査ログ記録
    await logProjectDelete(user, projectId, project.managementNumber, request);

    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error, "プロジェクトの削除に失敗しました");
  }
}
