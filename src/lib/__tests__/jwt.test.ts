import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  signJwt,
  verifyJwt,
  extractToken,
  getJwtPayloadFromRequest,
} from "../security/jwt";

describe("JWT", () => {
  describe("signJwt", () => {
    it("JWTトークンを生成する", async () => {
      const token = await signJwt({
        sub: "user-123",
        lineUserId: "U1234567890",
        name: "テストユーザー",
        role: "user",
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      // JWTフォーマット（header.payload.signature）
      const parts = token.split(".");
      expect(parts.length).toBe(3);
    });

    it("生成されたトークンは検証可能", async () => {
      const token = await signJwt({
        sub: "user-123",
        name: "テストユーザー",
      });

      const result = await verifyJwt(token);

      expect(result.valid).toBe(true);
      expect(result.payload?.sub).toBe("user-123");
      expect(result.payload?.name).toBe("テストユーザー");
    });

    it("iat（発行時刻）とexp（有効期限）が設定される", async () => {
      const before = Math.floor(Date.now() / 1000);

      const token = await signJwt({
        sub: "user-123",
      });

      const after = Math.floor(Date.now() / 1000);

      const result = await verifyJwt(token);

      expect(result.payload?.iat).toBeGreaterThanOrEqual(before);
      expect(result.payload?.iat).toBeLessThanOrEqual(after);
      expect(result.payload?.exp).toBeGreaterThan(result.payload?.iat!);
    });
  });

  describe("verifyJwt", () => {
    it("有効なトークンを検証する", async () => {
      const token = await signJwt({
        sub: "user-123",
        role: "admin",
      });

      const result = await verifyJwt(token);

      expect(result.valid).toBe(true);
      expect(result.payload?.sub).toBe("user-123");
      expect(result.payload?.role).toBe("admin");
    });

    it("不正なフォーマットのトークンを拒否する", async () => {
      const result = await verifyJwt("invalid-token");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid token format");
    });

    it("改ざんされたトークンを拒否する", async () => {
      const token = await signJwt({
        sub: "user-123",
      });

      // ペイロードを改ざん
      const parts = token.split(".");
      const tamperedPayload = Buffer.from(
        JSON.stringify({ sub: "hacked-user", iat: 0, exp: 9999999999 })
      )
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      const result = await verifyJwt(tamperedToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid signature");
    });

    it("期限切れのトークンを拒否する", async () => {
      // モックで時間を進める
      const originalNow = Date.now;
      const futureTime = Date.now() + 25 * 60 * 60 * 1000; // 25時間後

      const token = await signJwt({ sub: "user-123" });

      // 時間を進める
      vi.spyOn(Date, "now").mockReturnValue(futureTime);

      const result = await verifyJwt(token);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Token expired");

      // 元に戻す
      vi.spyOn(Date, "now").mockRestore();
    });
  });

  describe("extractToken", () => {
    it("Bearerトークンを抽出する", () => {
      const token = extractToken("Bearer abc123xyz");

      expect(token).toBe("abc123xyz");
    });

    it("Bearerプレフィックスがない場合はnullを返す", () => {
      const token = extractToken("abc123xyz");

      expect(token).toBeNull();
    });

    it("nullヘッダーの場合はnullを返す", () => {
      const token = extractToken(null);

      expect(token).toBeNull();
    });

    it("空文字列の場合はnullを返す", () => {
      const token = extractToken("");

      expect(token).toBeNull();
    });

    it("Bearer のみの場合は空文字列を返す", () => {
      const token = extractToken("Bearer ");

      expect(token).toBe("");
    });
  });

  describe("getJwtPayloadFromRequest", () => {
    it("有効なトークンからペイロードを取得する", async () => {
      const token = await signJwt({
        sub: "user-123",
        name: "テストユーザー",
        role: "user",
      });

      const request = new Request("http://localhost:3000/api/mobile/projects", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await getJwtPayloadFromRequest(request);

      expect(result.authenticated).toBe(true);
      expect(result.payload?.sub).toBe("user-123");
      expect(result.payload?.name).toBe("テストユーザー");
      expect(result.payload?.role).toBe("user");
    });

    it("トークンがない場合はエラーを返す", async () => {
      const request = new Request("http://localhost:3000/api/mobile/projects");

      const result = await getJwtPayloadFromRequest(request);

      expect(result.authenticated).toBe(false);
      expect(result.error).toBe("No token provided");
    });

    it("無効なトークンの場合はエラーを返す", async () => {
      const request = new Request("http://localhost:3000/api/mobile/projects", {
        headers: {
          Authorization: "Bearer invalid-token",
        },
      });

      const result = await getJwtPayloadFromRequest(request);

      expect(result.authenticated).toBe(false);
      expect(result.error).toBe("Invalid token format");
    });

    it("期限切れトークンの場合はエラーを返す", async () => {
      const token = await signJwt({ sub: "user-123" });

      // 時間を進める
      vi.spyOn(Date, "now").mockReturnValue(Date.now() + 25 * 60 * 60 * 1000);

      const request = new Request("http://localhost:3000/api/mobile/projects", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await getJwtPayloadFromRequest(request);

      expect(result.authenticated).toBe(false);
      expect(result.error).toBe("Token expired");

      vi.spyOn(Date, "now").mockRestore();
    });
  });
});
