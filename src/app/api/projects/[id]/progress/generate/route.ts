import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, progress } from "@/db/schema";
import { eq } from "drizzle-orm";
import { calculateTimeline } from "@/lib/timeline";

/**
 * タイムラインのフェーズ予定日を進捗として自動生成
 * 既存の進捗と重複しないもののみ追加
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);

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

  // タイムラインを計算
  const timeline = calculateTimeline(project.completionMonth, false);

  // 既存の進捗を取得
  const existingProgress = await db
    .select()
    .from(progress)
    .where(eq(progress.projectId, projectId));

  // 既存のタイトルをセットに変換（重複チェック用）
  const existingTitles = new Set(existingProgress.map((p) => p.title));

  // タイトルのマッピング（フェーズタイトル → 進捗タイトル）
  const titleMapping: Record<string, string> = {
    "現地調査": "現調",
    "連系（発電開始）": "連系",
  };

  // 新規追加する進捗
  const newProgress: { title: string; date: Date }[] = [];

  for (const phase of timeline) {
    // マッピングされたタイトルを確認
    const mappedTitle = titleMapping[phase.title];
    const titlesToCheck = mappedTitle ? [phase.title, mappedTitle] : [phase.title];

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
  });
}
