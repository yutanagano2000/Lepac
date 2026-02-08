import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkRateLimit,
  rateLimitMiddleware,
  clearRateLimitStore,
  getRateLimitEntry,
} from "../security/rate-limit";
import { createMockNextRequest } from "@/__tests__/mocks/next-request";

describe("Rate Limit", () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  describe("checkRateLimit", () => {
    it("最初のリクエストは許可される", () => {
      const request = createMockNextRequest("http://localhost:3000/api/projects", {
        headers: {
          "x-forwarded-for": "192.168.1.1",
        },
      });

      const result = checkRateLimit(request, { maxRequests: 10 });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it("制限内のリクエストは許可される", () => {
      const request = createMockNextRequest("http://localhost:3000/api/projects", {
        headers: {
          "x-forwarded-for": "192.168.1.2",
        },
      });

      // 5回リクエストを実行
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(request, { maxRequests: 10 });
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(10 - i - 1);
      }
    });

    it("制限を超えたリクエストは拒否される", () => {
      const request = createMockNextRequest("http://localhost:3000/api/projects", {
        headers: {
          "x-forwarded-for": "192.168.1.3",
        },
      });

      // 10回リクエストを実行（制限: 10）
      for (let i = 0; i < 10; i++) {
        checkRateLimit(request, { maxRequests: 10 });
      }

      // 11回目は拒否される
      const result = checkRateLimit(request, { maxRequests: 10 });
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("異なるIPは別々にカウントされる", () => {
      const request1 = createMockNextRequest("http://localhost:3000/api/projects", {
        headers: { "x-forwarded-for": "192.168.1.10" },
      });
      const request2 = createMockNextRequest("http://localhost:3000/api/projects", {
        headers: { "x-forwarded-for": "192.168.1.11" },
      });

      // IP1から5回リクエスト
      for (let i = 0; i < 5; i++) {
        checkRateLimit(request1, { maxRequests: 10 });
      }

      // IP2からの最初のリクエストは許可される
      const result = checkRateLimit(request2, { maxRequests: 10 });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it("ウィンドウがリセットされると制限がリセットされる", async () => {
      const request = createMockNextRequest("http://localhost:3000/api/projects", {
        headers: { "x-forwarded-for": "192.168.1.20" },
      });

      // 10回リクエスト（制限に達する）
      for (let i = 0; i < 10; i++) {
        checkRateLimit(request, { maxRequests: 10, windowMs: 100 });
      }

      // 制限に達している
      let result = checkRateLimit(request, { maxRequests: 10, windowMs: 100 });
      expect(result.allowed).toBe(false);

      // ウィンドウがリセットされるまで待つ
      await new Promise((resolve) => setTimeout(resolve, 150));

      // リセット後は許可される
      result = checkRateLimit(request, { maxRequests: 10, windowMs: 100 });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it("カスタムキー生成関数を使用できる", () => {
      const request = createMockNextRequest("http://localhost:3000/api/projects", {
        headers: {
          "x-user-id": "user-123",
        },
      });

      const customKeyGenerator = (req: any) => {
        return req.headers.get("x-user-id") || "anonymous";
      };

      const result = checkRateLimit(request, {
        maxRequests: 5,
        keyGenerator: customKeyGenerator,
      });

      expect(result.allowed).toBe(true);

      // エントリがカスタムキーで保存されていることを確認
      const entry = getRateLimitEntry("user-123");
      expect(entry).toBeDefined();
      expect(entry?.count).toBe(1);
    });

    it("x-real-ipヘッダーも認識する", () => {
      const request = createMockNextRequest("http://localhost:3000/api/projects", {
        headers: {
          "x-real-ip": "10.0.0.1",
        },
      });

      const result = checkRateLimit(request, { maxRequests: 10 });
      expect(result.allowed).toBe(true);

      const entry = getRateLimitEntry("10.0.0.1");
      expect(entry).toBeDefined();
    });
  });

  describe("rateLimitMiddleware", () => {
    it("制限内のリクエストはハンドラーを実行する", async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: "test" }), { status: 200 })
      );

      const middleware = rateLimitMiddleware(mockHandler, { maxRequests: 10 });
      const request = createMockNextRequest("http://localhost:3000/api/projects", {
        headers: { "x-forwarded-for": "192.168.2.1" },
      });

      const response = await middleware(request);

      expect(mockHandler).toHaveBeenCalledWith(request);
      expect(response.status).toBe(200);

      // レート制限ヘッダーが追加されている
      expect(response.headers.get("X-RateLimit-Remaining")).toBeDefined();
      expect(response.headers.get("X-RateLimit-Reset")).toBeDefined();
    });

    it("制限を超えたリクエストは429を返す", async () => {
      const mockHandler = vi.fn();

      const middleware = rateLimitMiddleware(mockHandler, { maxRequests: 2 });
      const request = createMockNextRequest("http://localhost:3000/api/projects", {
        headers: { "x-forwarded-for": "192.168.2.2" },
      });

      // 2回許可される
      await middleware(request);
      await middleware(request);

      // 3回目は拒否
      const response = await middleware(request);

      expect(response.status).toBe(429);

      const body = await response.json();
      expect(body.error).toBe("Too many requests");
      expect(body.retryAfter).toBeDefined();

      expect(response.headers.get("Retry-After")).toBeDefined();
    });

    it("制限超過後はハンドラーが呼ばれない", async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: "test" }), { status: 200 })
      );

      const middleware = rateLimitMiddleware(mockHandler, { maxRequests: 1 });
      const request = createMockNextRequest("http://localhost:3000/api/projects", {
        headers: { "x-forwarded-for": "192.168.2.3" },
      });

      await middleware(request); // 1回目: OK
      expect(mockHandler).toHaveBeenCalledTimes(1);

      await middleware(request); // 2回目: 制限超過
      expect(mockHandler).toHaveBeenCalledTimes(1); // ハンドラーは呼ばれない
    });
  });

  describe("clearRateLimitStore", () => {
    it("ストアをクリアする", () => {
      const request = createMockNextRequest("http://localhost:3000/api/projects", {
        headers: { "x-forwarded-for": "192.168.3.1" },
      });

      checkRateLimit(request, { maxRequests: 10 });

      let entry = getRateLimitEntry("192.168.3.1");
      expect(entry).toBeDefined();

      clearRateLimitStore();

      entry = getRateLimitEntry("192.168.3.1");
      expect(entry).toBeUndefined();
    });
  });
});
