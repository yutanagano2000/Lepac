import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { signJwt } from "../security/jwt";
import { mockSession, mockAdminSession } from "@/__tests__/mocks/auth-session";

// モック用の変数
let mockAuthResult: any = null;

// @/auth のモック
vi.mock("@/auth", () => ({
  auth: vi.fn(() => Promise.resolve(mockAuthResult)),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {
    GET: vi.fn(),
    POST: vi.fn(),
  },
}));

// 認証ガードをインポート
import {
  requireAuth,
  requireAdmin,
  requireRole,
  requireProjectAccess,
  withAuth,
  withAdminAuth,
} from "../security/auth-guard";

describe("Auth Guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthResult = null;
  });

  describe("requireAuth", () => {
    describe("Web API（セッション認証）", () => {
      it("認証済みユーザーを許可する", async () => {
        mockAuthResult = mockSession;

        const request = new NextRequest("http://localhost:3000/api/projects");
        const result = await requireAuth(request);

        expect(result.authenticated).toBe(true);
        if (result.authenticated) {
          expect(result.context.userId).toBe("1");
          expect(result.context.userName).toBe("テストユーザー");
          expect(result.context.provider).toBe("credentials");
        }
      });

      it("未認証ユーザーを拒否する", async () => {
        mockAuthResult = null;

        const request = new NextRequest("http://localhost:3000/api/projects");
        const result = await requireAuth(request);

        expect(result.authenticated).toBe(false);
        if (!result.authenticated) {
          expect(result.response.status).toBe(401);
        }
      });

      it("セッションにユーザーIDがない場合は拒否する", async () => {
        mockAuthResult = { user: {}, expires: "" };

        const request = new NextRequest("http://localhost:3000/api/projects");
        const result = await requireAuth(request);

        expect(result.authenticated).toBe(false);
      });
    });

    describe("モバイル API（JWT認証）", () => {
      it("有効なJWTトークンを許可する", async () => {
        const token = await signJwt({
          sub: "mobile-user-1",
          name: "モバイルユーザー",
          role: "user",
        });

        const request = new NextRequest(
          "http://localhost:3000/api/mobile/projects",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const result = await requireAuth(request);

        expect(result.authenticated).toBe(true);
        if (result.authenticated) {
          expect(result.context.userId).toBe("mobile-user-1");
          expect(result.context.userName).toBe("モバイルユーザー");
          expect(result.context.provider).toBe("jwt");
        }
      });

      it("トークンがない場合は拒否する", async () => {
        const request = new NextRequest(
          "http://localhost:3000/api/mobile/projects"
        );

        const result = await requireAuth(request);

        expect(result.authenticated).toBe(false);
        if (!result.authenticated) {
          expect(result.response.status).toBe(401);
        }
      });

      it("無効なトークンを拒否する", async () => {
        const request = new NextRequest(
          "http://localhost:3000/api/mobile/projects",
          {
            headers: {
              Authorization: "Bearer invalid-token",
            },
          }
        );

        const result = await requireAuth(request);

        expect(result.authenticated).toBe(false);
      });
    });
  });

  describe("requireAdmin", () => {
    it("管理者を許可する", async () => {
      mockAuthResult = mockAdminSession;

      const request = new NextRequest("http://localhost:3000/api/admin/users");
      const result = await requireAdmin(request);

      expect(result.authenticated).toBe(true);
      if (result.authenticated) {
        expect(result.context.role).toBe("admin");
      }
    });

    it("一般ユーザーを拒否する", async () => {
      mockAuthResult = mockSession;

      const request = new NextRequest("http://localhost:3000/api/admin/users");
      const result = await requireAdmin(request);

      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.response.status).toBe(403);
        const body = await result.response.json();
        expect(body.error).toContain("Admin access required");
      }
    });

    it("未認証ユーザーを401で拒否する", async () => {
      mockAuthResult = null;

      const request = new NextRequest("http://localhost:3000/api/admin/users");
      const result = await requireAdmin(request);

      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.response.status).toBe(401);
      }
    });
  });

  describe("requireRole", () => {
    it("許可されたロールを持つユーザーを許可する", async () => {
      mockAuthResult = mockAdminSession;

      const request = new NextRequest("http://localhost:3000/api/settings");
      const result = await requireRole(request, ["admin", "manager"]);

      expect(result.authenticated).toBe(true);
    });

    it("許可されていないロールのユーザーを拒否する", async () => {
      mockAuthResult = mockSession;

      const request = new NextRequest("http://localhost:3000/api/settings");
      const result = await requireRole(request, ["admin", "manager"]);

      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.response.status).toBe(403);
        const body = await result.response.json();
        expect(body.error).toContain("Required role");
      }
    });

    it("複数のロールのいずれかを持っていれば許可する", async () => {
      const managerSession = {
        ...mockSession,
        user: { ...mockSession.user, role: "manager" },
      };
      mockAuthResult = managerSession;

      const request = new NextRequest("http://localhost:3000/api/settings");
      const result = await requireRole(request, ["admin", "manager", "editor"]);

      expect(result.authenticated).toBe(true);
    });
  });

  describe("requireProjectAccess", () => {
    it("認証済みユーザーはプロジェクトにアクセスできる", async () => {
      mockAuthResult = mockSession;

      const request = new NextRequest("http://localhost:3000/api/projects/123");
      const result = await requireProjectAccess(request, "123");

      expect(result.authenticated).toBe(true);
    });

    it("未認証ユーザーはプロジェクトにアクセスできない", async () => {
      mockAuthResult = null;

      const request = new NextRequest("http://localhost:3000/api/projects/123");
      const result = await requireProjectAccess(request, "123");

      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.response.status).toBe(401);
      }
    });
  });

  describe("withAuth ミドルウェア", () => {
    it("認証済みの場合はハンドラーを実行する", async () => {
      mockAuthResult = mockSession;

      const mockHandler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );

      const protectedHandler = withAuth(mockHandler);
      const request = new NextRequest("http://localhost:3000/api/projects");
      const response = await protectedHandler(request);

      expect(mockHandler).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          userId: "1",
          userName: "テストユーザー",
        })
      );
      expect(response.status).toBe(200);
    });

    it("未認証の場合は401を返す", async () => {
      mockAuthResult = null;

      const mockHandler = vi.fn();
      const protectedHandler = withAuth(mockHandler);
      const request = new NextRequest("http://localhost:3000/api/projects");
      const response = await protectedHandler(request);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });
  });

  describe("withAdminAuth ミドルウェア", () => {
    it("管理者の場合はハンドラーを実行する", async () => {
      mockAuthResult = mockAdminSession;

      const mockHandler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );

      const protectedHandler = withAdminAuth(mockHandler);
      const request = new NextRequest("http://localhost:3000/api/admin/users");
      const response = await protectedHandler(request);

      expect(mockHandler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it("一般ユーザーの場合は403を返す", async () => {
      mockAuthResult = mockSession;

      const mockHandler = vi.fn();
      const protectedHandler = withAdminAuth(mockHandler);
      const request = new NextRequest("http://localhost:3000/api/admin/users");
      const response = await protectedHandler(request);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });
  });
});
