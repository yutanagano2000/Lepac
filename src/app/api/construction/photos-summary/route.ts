import { NextResponse } from "next/server";
import { db } from "@/db";
import { constructionPhotos, projects, CONSTRUCTION_PHOTO_CATEGORIES } from "@/db/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { requireOrganization } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// 工事写真サマリー（プロジェクト×カテゴリのマトリクス用）
export async function GET(request: Request) {
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  try {
    // 組織のプロジェクト取得
    let orgProjects = await db
      .select({
        id: projects.id,
        managementNumber: projects.managementNumber,
        siteName: projects.siteName,
        cityName: projects.cityName,
        prefecture: projects.prefecture,
        completionMonth: projects.completionMonth,
        client: projects.client,
      })
      .from(projects)
      .where(eq(projects.organizationId, organizationId));

    // 月でフィルタリング
    if (year && month) {
      const yearNum = parseInt(year, 10);
      const monthNum = parseInt(month, 10);

      // バリデーション: 無効な値は空配列を返す（レスポンス形状は維持）
      if (isNaN(yearNum) || isNaN(monthNum) || yearNum < 2000 || yearNum > 2100 || monthNum < 1 || monthNum > 12) {
        return NextResponse.json({ projects: [], photoMatrix: {}, categories: CONSTRUCTION_PHOTO_CATEGORIES });
      }
      orgProjects = orgProjects.filter((p) => {
        if (!p.completionMonth) return false;
        const monthMatch = p.completionMonth.match(/(\d{4})[-/年]?(\d{1,2})/);
        if (monthMatch) {
          const pYear = parseInt(monthMatch[1]);
          const pMonth = parseInt(monthMatch[2]);
          return pYear === yearNum && pMonth === monthNum;
        }
        return false;
      });
    }

    if (orgProjects.length === 0) {
      return NextResponse.json({ projects: [], photoMatrix: {}, categories: CONSTRUCTION_PHOTO_CATEGORIES });
    }

    const projectIds = orgProjects.map((p) => p.id);

    // プロジェクト×カテゴリごとの写真数を集計
    const photoCounts = await db
      .select({
        projectId: constructionPhotos.projectId,
        category: constructionPhotos.category,
        count: sql<number>`count(*)`.as("count"),
        latestAt: sql<string>`max(${constructionPhotos.createdAt})`.as("latest_at"),
      })
      .from(constructionPhotos)
      .where(inArray(constructionPhotos.projectId, projectIds))
      .groupBy(constructionPhotos.projectId, constructionPhotos.category);

    // 各プロジェクト×カテゴリの最新写真2枚を取得（ホバープレビュー用）
    // ROW_NUMBER ウィンドウ関数で各グループ上位2件に制限（全件取得を回避）
    const latestPhotosQuery = sql`
      SELECT * FROM (
        SELECT
          id,
          project_id as "projectId",
          category,
          file_name as "fileName",
          file_url as "fileUrl",
          contractor_name as "contractorName",
          note,
          taken_at as "takenAt",
          created_at as "createdAt",
          ROW_NUMBER() OVER (
            PARTITION BY project_id, category
            ORDER BY created_at DESC
          ) as rn
        FROM construction_photos
        WHERE project_id IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})
      ) ranked
      WHERE rn <= 2
    `;
    const latestPhotosResult = await db.run(latestPhotosQuery);
    const latestPhotos = (latestPhotosResult.rows || []) as unknown as Array<{
      id: number;
      projectId: number;
      category: string;
      fileName: string;
      fileUrl: string;
      contractorName: string | null;
      note: string | null;
      takenAt: string | null;
      createdAt: string;
    }>;

    // マトリクス形式に変換
    // { projectId: { category: { count, latestAt, latestPhotos } } }
    type PhotoDetail = {
      id: number;
      fileName: string;
      fileUrl: string;
      contractorName: string | null;
      note: string | null;
      takenAt: string | null;
      createdAt: string;
    };
    type CellInfo = {
      count: number;
      latestAt: string | null;
      latestPhotos: PhotoDetail[];
    };
    const photoMatrix: Record<number, Record<string, CellInfo>> = {};

    // 全プロジェクト×全カテゴリを0件で初期化（欠落防止）
    for (const proj of orgProjects) {
      photoMatrix[proj.id] = {};
      for (const category of CONSTRUCTION_PHOTO_CATEGORIES) {
        photoMatrix[proj.id][category] = {
          count: 0,
          latestAt: null,
          latestPhotos: [],
        };
      }
    }

    // 実際のカウントで上書き（未知カテゴリはスキップ）
    const validCategories = new Set<string>(CONSTRUCTION_PHOTO_CATEGORIES);
    for (const row of photoCounts) {
      if (photoMatrix[row.projectId] && validCategories.has(row.category)) {
        photoMatrix[row.projectId][row.category] = {
          count: Number(row.count),
          latestAt: row.latestAt,
          latestPhotos: [],
        };
      }
    }

    // 最新写真をマトリクスに追加（各セル最大2枚、未知カテゴリはスキップ）
    for (const photo of latestPhotos) {
      if (!validCategories.has(photo.category)) continue;
      const cell = photoMatrix[photo.projectId]?.[photo.category];
      if (cell && cell.latestPhotos.length < 2) {
        cell.latestPhotos.push({
          id: photo.id,
          fileName: photo.fileName,
          fileUrl: photo.fileUrl,
          contractorName: photo.contractorName,
          note: photo.note,
          takenAt: photo.takenAt,
          createdAt: photo.createdAt,
        });
      }
    }

    return NextResponse.json({
      projects: orgProjects,
      photoMatrix,
      categories: CONSTRUCTION_PHOTO_CATEGORIES,
    });
  } catch (error) {
    console.error("Photos summary error:", error);
    return NextResponse.json({ error: "Failed to fetch photos summary" }, { status: 500 });
  }
}
