import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, progress } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { calculateTimeline } from "@/lib/timeline";
import { requireProjectAccess } from "@/lib/auth-guard";

/**
 * タイムラインのフェーズ予定日を進捗として自動生成
 * 既存の進捗と重複しないもののみ追加
 * 重複データがあれば自動的にクリーンアップ
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);

  // 認証・組織・プロジェクト所有権チェック
  const authResult = await requireProjectAccess(projectId);
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

  // 重複を削除
  if (idsToDelete.length > 0) {
    await db
      .delete(progress)
      .where(and(
        eq(progress.projectId, projectId),
        inArray(progress.id, idsToDelete)
      ));
    
    // 削除後の進捗を再取得
    existingProgress = await db
      .select()
      .from(progress)
      .where(eq(progress.projectId, projectId));
  }

  // タイムラインを計算
  const timeline = calculateTimeline(project.completionMonth, false);

  // 既存のタイトルをセットに変換（重複チェック用）
  const existingTitles = new Set(existingProgress.map((p) => p.title));

  // 古い名前から新しい名前へのマッピング（互換性のため）
  // 以前は「現地調査」「農転・地目申請」「連系（発電開始）」という名前で保存されていた
  const legacyTitleMapping: Record<string, string[]> = {
    "現調": ["現地調査"],
    "法令申請": ["農転・地目申請"],
    "連系": ["連系（発電開始）"],
  };

  // 新規追加する進捗
  const newProgress: { title: string; date: Date }[] = [];

  for (const phase of timeline) {
    // 新しいタイトルと、古い名前の両方をチェック
    const legacyTitles = legacyTitleMapping[phase.title] || [];
    const titlesToCheck = [phase.title, ...legacyTitles];

    // いずれかのタイトルが既に存在するかチェック
    const exists = titlesToCheck.some((t) => existingTitles.has(t));

    if (!exists) {
      newProgress.push({
        title: phase.title,
        date: phase.date,
      });
    }
  }

  // 新規進捗を挿入
  const insertedProgress = [];
  for (const item of newProgress) {
    const [result] = await db
      .insert(progress)
      .values({
        projectId,
        title: item.title,
        description: null,
        status: "planned",
        createdAt: item.date.toISOString(),
      })
      .returning();
    insertedProgress.push(result);
  }

  return NextResponse.json({
    generated: insertedProgress.length,
    items: insertedProgress,
    cleaned: idsToDelete.length,
  });
}
