import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getJwtPayloadFromRequest } from "./jwt";

/**
 * 認証ガード - APIルートの保護
 *
 * Web（セッション認証）とモバイル（JWT認証）の両方に対応
 */

export interface AuthContext {
  userId: string;
  userName?: string;
  role?: string;
  provider?: "credentials" | "line" | "jwt";
}

/**
 * 認証を必須とするガード
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ authenticated: true; context: AuthContext } | { authenticated: false; response: NextResponse }> {
  // モバイルAPIの場合はJWT認証
  if (request.nextUrl.pathname.startsWith("/api/mobile")) {
    const jwtResult = await getJwtPayloadFromRequest(request);

    if (!jwtResult.authenticated || !jwtResult.payload) {
      return {
        authenticated: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }

    return {
      authenticated: true,
      context: {
        userId: jwtResult.payload.sub,
        userName: jwtResult.payload.name,
        role: jwtResult.payload.role,
        provider: "jwt",
      },
    };
  }

  // WebAPIの場合はセッション認証
  const session = await auth();

  if (!session?.user?.id) {
    return {
      authenticated: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return {
    authenticated: true,
    context: {
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      role: (session.user as any).role,
      provider: (session.user as any).provider === "line" ? "line" : "credentials",
    },
  };
}

/**
 * 管理者権限を必須とするガード
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ authenticated: true; context: AuthContext } | { authenticated: false; response: NextResponse }> {
  const result = await requireAuth(request);

  if (!result.authenticated) {
    return result;
  }

  if (result.context.role !== "admin") {
    return {
      authenticated: false,
      response: NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 }),
    };
  }

  return result;
}

/**
 * 特定のロールを必須とするガード
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<{ authenticated: true; context: AuthContext } | { authenticated: false; response: NextResponse }> {
  const result = await requireAuth(request);

  if (!result.authenticated) {
    return result;
  }

  if (!result.context.role || !allowedRoles.includes(result.context.role)) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: `Forbidden: Required role(s): ${allowedRoles.join(", ")}` },
        { status: 403 }
      ),
    };
  }

  return result;
}

/**
 * プロジェクトへのアクセス権をチェック
 *
 * TODO: 将来的に組織/プロジェクト単位のアクセス制御を実装
 */
export async function requireProjectAccess(
  request: NextRequest,
  projectId: string
): Promise<{ authenticated: true; context: AuthContext } | { authenticated: false; response: NextResponse }> {
  const result = await requireAuth(request);

  if (!result.authenticated) {
    return result;
  }

  // 現時点では認証されていれば全プロジェクトにアクセス可能
  // TODO: 組織IDやプロジェクトメンバーシップの検証を追加
  return result;
}

/**
 * 認証ガードをミドルウェアとして使用
 */
export function withAuth(
  handler: (request: NextRequest, context: AuthContext) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    const result = await requireAuth(request);

    if (!result.authenticated) {
      return result.response;
    }

    return handler(request, result.context);
  };
}

/**
 * 管理者認証ガードをミドルウェアとして使用
 */
export function withAdminAuth(
  handler: (request: NextRequest, context: AuthContext) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    const result = await requireAdmin(request);

    if (!result.authenticated) {
      return result.response;
    }

    return handler(request, result.context);
  };
}
