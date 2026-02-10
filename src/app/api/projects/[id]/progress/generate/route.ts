import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, progress } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { calculateWorkflowTimelineFromCompletion } from "@/lib/timeline";
import { requireProjectAccessWithCsrf } from "@/lib/auth-guard";
import { createErrorResponse } from "@/lib/api-error";

/**
 * タイムラインのフェーズ予定日を進捗として自動生成
 * 既存の進捗と重複しないもののみ追加
 * 重複データがあれば自動的にクリーンアップ
 */
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

    // 案件を取得
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!project.completionMonth) {
      return NextResponse.json({ error: "Completion month not set" }, { status: 400 });
    }

    // 既存の進捗を取得
    let existingProgress = await db
      .select()
      .from(progress)
      .where(eq(progress.projectId, projectId));

    // === 重複データのクリーンアップ ===
    // 同じタイトルの重複レコードを削除（最も古いIDを残す）
    const titleGroups = new Map<string, typeof existingProgress>();
    for (const p of existingProgress) {
      const group = titleGroups.get(p.title) || [];
      group.push(p);
      titleGroups.set(p.title, group);
    }

    const idsToDelete: number[] = [];
    for (const [, group] of titleGroups) {
      if (group.length > 1) {
        // IDでソートして最小のID以外を削除対象に
        group.sort((a, b) => a.id - b.id);
        for (let i = 1; i < group.length; i++) {
          idsToDelete.push(group[i].id);
        }
      }
    }

    // 重複を削除（一度に削除するIDの上限を設定してバッチ処理）
    if (idsToDelete.length > 0) {
      const BATCH_SIZE = 100;
      for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
        const batch = idsToDelete.slice(i, i + BATCH_SIZE);
        await db
          .delete(progress)
          .where(and(
            eq(progress.projectId, projectId),
            inArray(progress.id, batch)
          ));
      }

      // 削除後の進捗を再取得
      existingProgress = await db
        .select()
        .from(progress)
        .where(eq(progress.projectId, projectId));
    }

    // WORKFLOW_PHASESベースで完工月から逆算
    const timeline = calculateWorkflowTimelineFromCompletion(project.completionMonth);

    // 既存のタイトルをセットに変換（重複チェック用）
    const existingTitles = new Set(existingProgress.map((p) => p.title));

    // 新規追加する進捗（親フェーズ + サブフェーズ両方を生成）
    const newProgress: { title: string; date: Date }[] = [];

    for (const phase of timeline) {
      // サブフェーズがある場合はサブフェーズ単位で進捗を生成
      if (phase.subPhases && phase.subPhases.length > 0) {
        for (const sub of phase.subPhases) {
          if (!existingTitles.has(sub.title) && sub.date) {
            newProgress.push({
              title: sub.title,
              date: sub.date,
            });
          }
        }
      } else {
        // サブフェーズがない場合は親フェーズで生成
        const phaseDate = phase.startDate || phase.endDate;
        if (phaseDate && !existingTitles.has(phase.title)) {
          newProgress.push({
            title: phase.title,
            date: phaseDate,
          });
        }
      }
    }

    // 新規進捗を挿入（バッチ挿入で効率化）
    let insertedProgress: typeof existingProgress = [];
    if (newProgress.length > 0) {
      const valuesToInsert = newProgress.map((item) => ({
        projectId,
        title: item.title,
        description: null,
        status: "planned" as const,
        createdAt: item.date.toISOString(),
      }));

      insertedProgress = await db
        .insert(progress)
        .values(valuesToInsert)
        .returning();
    }

    return NextResponse.json({
      generated: insertedProgress.length,
      items: insertedProgress,
      cleaned: idsToDelete.length,
    });
  } catch (error) {
    return createErrorResponse(error, "進捗の自動生成に失敗しました");
  }
}
