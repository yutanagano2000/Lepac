import { NextResponse } from "next/server";
import { db } from "@/db";
import { constructionPhotos, projects, CONSTRUCTION_PHOTO_CATEGORIES } from "@/db/schema";
import { eq, sql, and, inArray, desc } from "drizzle-orm";
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
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
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
      return NextResponse.json({ projects: [], photoMatrix: {} });
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
    const latestPhotos = await db
      .select({
        id: constructionPhotos.id,
        projectId: constructionPhotos.projectId,
        category: constructionPhotos.category,
        fileName: constructionPhotos.fileName,
        fileUrl: constructionPhotos.fileUrl,
        contractorName: constructionPhotos.contractorName,
        note: constructionPhotos.note,
        takenAt: constructionPhotos.takenAt,
        createdAt: constructionPhotos.createdAt,
      })
      .from(constructionPhotos)
      .where(inArray(constructionPhotos.projectId, projectIds))
      .orderBy(desc(constructionPhotos.createdAt));

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

    for (const row of photoCounts) {
      if (!photoMatrix[row.projectId]) {
        photoMatrix[row.projectId] = {};
      }
      photoMatrix[row.projectId][row.category] = {
        count: Number(row.count),
        latestAt: row.latestAt,
        latestPhotos: [],
      };
    }

    // 最新写真をマトリクスに追加（各セル最大2枚）
    for (const photo of latestPhotos) {
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
