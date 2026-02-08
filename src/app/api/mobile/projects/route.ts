/**
 * モバイル 案件一覧 API
 * GET /api/mobile/projects
 *
 * 認証済みユーザーの所属組織に紐づく案件一覧を返す
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, constructionPhotos } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { getMobileAuthFromRequest } from "@/lib/jwt";

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const auth = await getMobileAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 組織IDが必須
    if (!auth.organizationId) {
      return NextResponse.json(
        { error: "Organization not selected" },
        { status: 403 }
      );
    }

    // 案件一覧を取得（写真数付き）
    const projectList = await db
      .select({
        id: projects.id,
        managementNumber: projects.managementNumber,
        client: projects.client,
        address: projects.address,
        siteName: projects.siteName,
        cityName: projects.cityName,
        manager: projects.manager,
        panelCount: projects.panelCount,
        constructionStartScheduled: projects.constructionStartScheduled,
        constructionStartDate: projects.constructionStartDate,
        constructionEndScheduled: projects.constructionEndScheduled,
        constructionEndDate: projects.constructionEndDate,
        coordinates: projects.coordinates,
      })
      .from(projects)
      .where(eq(projects.organizationId, auth.organizationId))
      .orderBy(desc(projects.id))
      .limit(100);

    // 各案件の写真数を取得
    const projectsWithPhotoCount = await Promise.all(
      projectList.map(async (project) => {
        const [photoCountResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(constructionPhotos)
          .where(eq(constructionPhotos.projectId, project.id));

        return {
          ...project,
          photoCount: photoCountResult?.count || 0,
        };
      })
    );

    return NextResponse.json({
      projects: projectsWithPhotoCount,
    });
  } catch (error) {
    console.error("[Mobile Projects] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
