/**
 * モバイル 写真メタデータ登録 API
 * POST /api/mobile/photos/register
 *
 * Vantage (iOS) が Supabase Storage に直接アップロードした写真の
 * メタデータを Turso に登録する
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { constructionPhotos, projects, CONSTRUCTION_PHOTO_CATEGORIES } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getMobileAuthFromRequest } from "@/lib/jwt";

// リクエスト型
interface PhotoRegisterRequest {
  projectId: number;
  category: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  contractorName?: string;
  note?: string;
  latitude?: number;
  longitude?: number;
  takenAt: string; // ISO8601 format
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const auth = await getMobileAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: PhotoRegisterRequest = await request.json();

    // バリデーション
    if (!body.projectId || !body.category || !body.fileUrl || !body.fileName) {
      return NextResponse.json(
        { error: "Missing required fields: projectId, category, fileUrl, fileName" },
        { status: 400 }
      );
    }

    // カテゴリ検証
    if (!CONSTRUCTION_PHOTO_CATEGORIES.includes(body.category as typeof CONSTRUCTION_PHOTO_CATEGORIES[number])) {
      return NextResponse.json(
        {
          error: "Invalid category",
          validCategories: CONSTRUCTION_PHOTO_CATEGORIES,
        },
        { status: 400 }
      );
    }

    // 案件の存在確認と組織チェック
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, body.projectId));

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // 組織の一致確認（セキュリティ）
    if (project.organizationId !== auth.organizationId) {
      return NextResponse.json(
        { error: "Access denied to this project" },
        { status: 403 }
      );
    }

    // メタデータを登録
    const [newPhoto] = await db
      .insert(constructionPhotos)
      .values({
        projectId: body.projectId,
        category: body.category,
        fileName: body.fileName,
        fileUrl: body.fileUrl,
        fileType: body.fileType || "image/jpeg",
        fileSize: body.fileSize || 0,
        contractorName: body.contractorName,
        note: body.note,
        takenAt: body.takenAt,
        createdAt: new Date().toISOString(),
      })
      .returning();

    console.log(`[Mobile Photos] Registered photo ${newPhoto.id} for project ${body.projectId}`);

    return NextResponse.json({
      id: newPhoto.id,
      success: true,
      message: "Photo registered successfully",
    });
  } catch (error) {
    console.error("[Mobile Photos] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
