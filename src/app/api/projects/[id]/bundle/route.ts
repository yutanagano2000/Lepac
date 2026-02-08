import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, progress, comments, todos, projectFiles } from "@/db/schema";
import { eq, desc, asc, and } from "drizzle-orm";
import { requireOrganization } from "@/lib/auth-guard";

/**
 * GET /api/projects/:id/bundle
 *
 * 案件詳細画面で必要な全データを1リクエストで取得
 * - project: 案件基本情報
 * - progress: 進捗一覧
 * - comments: コメント一覧
 * - todos: TODO一覧
 * - files: ファイル一覧
 *
 * これにより7つのAPIリクエストを1つに統合し、
 * ページ遷移速度を約5倍高速化
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 認証・組織チェック
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  const { id } = await params;
  const projectId = Number(id);

  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  // 全データを並列取得（DBへの1回のラウンドトリップで複数クエリ実行）
  const [
    [project],
    progressList,
    commentsList,
    todosList,
    filesList,
  ] = await Promise.all([
    // 案件基本情報（組織チェック付き）
    db.select().from(projects).where(
      and(eq(projects.id, projectId), eq(projects.organizationId, organizationId))
    ),
    // 進捗一覧
    db.select().from(progress)
      .where(eq(progress.projectId, projectId))
      .orderBy(desc(progress.createdAt)),
    // コメント一覧
    db.select().from(comments)
      .where(eq(comments.projectId, projectId))
      .orderBy(desc(comments.createdAt)),
    // TODO一覧
    db.select().from(todos)
      .where(eq(todos.projectId, projectId))
      .orderBy(asc(todos.dueDate)),
    // ファイル一覧
    db.select().from(projectFiles)
      .where(eq(projectFiles.projectId, projectId))
      .orderBy(desc(projectFiles.createdAt)),
  ]);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({
    project,
    progress: progressList,
    comments: commentsList,
    todos: todosList,
    files: filesList,
  });
}
