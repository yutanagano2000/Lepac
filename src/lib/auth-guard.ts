import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { csrfGuard } from "./csrf-protection";
import { rateLimitGuard, RateLimitType } from "./rate-limit";

export interface AuthUser {
  id: string;
  username?: string;
  name?: string;
  organizationId: number | null;
  role: string;
}

export interface AuthResult {
  success: true;
  user: AuthUser;
  organizationId: number;
}

export interface AuthError {
  success: false;
  response: NextResponse;
}

/**
 * 認証チェック - ログインしているか確認
 * @returns ユーザー情報またはエラーレスポンス
 */
export async function requireAuth(): Promise<
  { success: true; user: AuthUser } | AuthError
> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      ),
    };
  }

  return {
    success: true,
    user: {
      id: session.user.id,
      username: session.user.username,
      name: session.user.name ?? undefined,
      organizationId: session.user.organizationId ?? null,
      role: session.user.role ?? "user",
    },
  };
}

/**
 * 認証 + 組織チェック - ログインしていて、組織に所属しているか確認
 * @returns ユーザー情報とorganizationId、またはエラーレスポンス
 */
export async function requireOrganization(): Promise<AuthResult | AuthError> {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return authResult;
  }

  const { user } = authResult;

  if (!user.organizationId) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "組織が選択されていません" },
        { status: 403 }
      ),
    };
  }

  return {
    success: true,
    user,
    organizationId: user.organizationId,
  };
}

/**
 * 管理者権限チェック
 * @returns ユーザー情報またはエラーレスポンス
 */
export async function requireAdmin(): Promise<AuthResult | AuthError> {
  const authResult = await requireOrganization();

  if (!authResult.success) {
    return authResult;
  }

  if (authResult.user.role !== "admin") {
    return {
      success: false,
      response: NextResponse.json(
        { error: "管理者権限が必要です" },
        { status: 403 }
      ),
    };
  }

  return authResult;
}

/**
 * ユーザーIDを数値として取得
 */
export function getUserId(user: AuthUser): number {
  return parseInt(user.id, 10);
}

/**
 * プロジェクト所有権チェック - プロジェクトが組織に属しているか確認
 * @param projectId プロジェクトID
 * @param organizationId 組織ID
 * @returns プロジェクトが見つかればtrue、なければfalse
 */
export async function verifyProjectOwnership(
  projectId: number,
  organizationId: number
): Promise<boolean> {
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.organizationId, organizationId)
      )
    )
    .limit(1);

  return !!project;
}

/**
 * 認証 + 組織 + プロジェクト所有権チェック
 * @param projectId プロジェクトID
 * @returns 認証結果またはエラーレスポンス
 */
export async function requireProjectAccess(
  projectId: number
): Promise<AuthResult | AuthError> {
  const authResult = await requireOrganization();

  if (!authResult.success) {
    return authResult;
  }

  const hasAccess = await verifyProjectOwnership(projectId, authResult.organizationId);

  if (!hasAccess) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "このプロジェクトへのアクセス権がありません" },
        { status: 403 }
      ),
    };
  }

  return authResult;
}

/**
 * CSRF保護付き認証チェック
 * 状態変更を伴うエンドポイント（POST, PUT, DELETE）で使用
 * @param request NextRequest
 * @returns ユーザー情報またはエラーレスポンス
 */
export async function requireAuthWithCsrf(
  request: NextRequest
): Promise<{ success: true; user: AuthUser } | AuthError> {
  // CSRF検証
  const csrfError = csrfGuard(request);
  if (csrfError) {
    return { success: false, response: csrfError };
  }

  return requireAuth();
}

/**
 * CSRF保護付き認証 + 組織チェック
 * @param request NextRequest
 * @returns ユーザー情報とorganizationId、またはエラーレスポンス
 */
export async function requireOrganizationWithCsrf(
  request: NextRequest
): Promise<AuthResult | AuthError> {
  // CSRF検証
  const csrfError = csrfGuard(request);
  if (csrfError) {
    return { success: false, response: csrfError };
  }

  return requireOrganization();
}

/**
 * CSRF保護付きプロジェクトアクセスチェック
 * @param request NextRequest
 * @param projectId プロジェクトID
 * @returns 認証結果またはエラーレスポンス
 */
export async function requireProjectAccessWithCsrf(
  request: NextRequest,
  projectId: number
): Promise<AuthResult | AuthError> {
  // CSRF検証
  const csrfError = csrfGuard(request);
  if (csrfError) {
    return { success: false, response: csrfError };
  }

  return requireProjectAccess(projectId);
}

/**
 * レート制限 + CSRF保護 + 認証チェック
 * @param request NextRequest
 * @param endpoint エンドポイント名
 * @param rateLimitType レート制限タイプ
 * @returns ユーザー情報またはエラーレスポンス
 */
export async function requireAuthWithRateLimit(
  request: NextRequest,
  endpoint: string,
  rateLimitType: RateLimitType = "api"
): Promise<{ success: true; user: AuthUser } | AuthError> {
  // レート制限チェック
  const rateLimitError = await rateLimitGuard(request, endpoint, rateLimitType);
  if (rateLimitError) {
    return { success: false, response: rateLimitError };
  }

  // CSRF検証（状態変更リクエストの場合）
  const csrfError = csrfGuard(request);
  if (csrfError) {
    return { success: false, response: csrfError };
  }

  return requireAuth();
}

/**
 * レート制限 + CSRF保護 + 認証 + 組織チェック
 * @param request NextRequest
 * @param endpoint エンドポイント名
 * @param rateLimitType レート制限タイプ
 * @returns ユーザー情報とorganizationId、またはエラーレスポンス
 */
export async function requireOrganizationWithRateLimit(
  request: NextRequest,
  endpoint: string,
  rateLimitType: RateLimitType = "api"
): Promise<AuthResult | AuthError> {
  // レート制限チェック
  const rateLimitError = await rateLimitGuard(request, endpoint, rateLimitType);
  if (rateLimitError) {
    return { success: false, response: rateLimitError };
  }

  // CSRF検証（状態変更リクエストの場合）
  const csrfError = csrfGuard(request);
  if (csrfError) {
    return { success: false, response: csrfError };
  }

  return requireOrganization();
}
