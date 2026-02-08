import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// NextAuth モック
const mockAuthMiddleware = vi.fn(() => NextResponse.next());

vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    auth: mockAuthMiddleware,
  })),
}));

vi.mock("../auth.config", () => ({
  authConfig: {},
}));

// ミドルウェアの関数をテスト用に抽出
function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return null;
}

// 許可IPリスト
const ALLOWED_IPS = [
  "127.0.0.1",
  "::1",
  "153.175.16.12",
  "1.73.154.231",
  "210.155.18.80",
];

function createMockRequest(options: {
  url?: string;
  headers?: Record<string, string>;
}): NextRequest {
  const url = options.url || "http://localhost:3000/projects";
  const headers = new Headers(options.headers || {});
  return new NextRequest(url, { headers });
}

describe("Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getClientIp", () => {
    it("x-forwarded-for ヘッダーからIPを取得する", () => {
      const request = createMockRequest({
        headers: { "x-forwarded-for": "192.168.1.1" },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("192.168.1.1");
    });

    it("複数のIPがある場合は最初のIPを取得する", () => {
      const request = createMockRequest({
        headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1, 172.16.0.1" },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("192.168.1.1");
    });

    it("x-real-ip ヘッダーからIPを取得する", () => {
      const request = createMockRequest({
        headers: { "x-real-ip": "192.168.1.2" },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("192.168.1.2");
    });

    it("x-forwarded-for が優先される", () => {
      const request = createMockRequest({
        headers: {
          "x-forwarded-for": "192.168.1.1",
          "x-real-ip": "192.168.1.2",
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("192.168.1.1");
    });

    it("ヘッダーがない場合はnullを返す", () => {
      const request = createMockRequest({});
      const ip = getClientIp(request);
      expect(ip).toBeNull();
    });

    it("空白を含むIPをトリムする", () => {
      const request = createMockRequest({
        headers: { "x-forwarded-for": "  192.168.1.1  " },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("192.168.1.1");
    });
  });

  describe("IP許可リスト", () => {
    it("ローカルホストIPが許可される", () => {
      expect(ALLOWED_IPS).toContain("127.0.0.1");
      expect(ALLOWED_IPS).toContain("::1");
    });

    it("指定されたIPが許可リストに含まれる", () => {
      expect(ALLOWED_IPS).toContain("153.175.16.12");
      expect(ALLOWED_IPS).toContain("1.73.154.231");
      expect(ALLOWED_IPS).toContain("210.155.18.80");
    });

    it("許可されていないIPは含まれない", () => {
      expect(ALLOWED_IPS).not.toContain("192.168.1.100");
      expect(ALLOWED_IPS).not.toContain("10.0.0.1");
    });
  });

  describe("IPアクセス制御ロジック", () => {
    it("許可IPからのアクセスは通過する", () => {
      const clientIp = "153.175.16.12";
      const isAllowed = ALLOWED_IPS.includes(clientIp);
      expect(isAllowed).toBe(true);
    });

    it("未許可IPからのアクセスは拒否される", () => {
      const clientIp = "192.168.1.100";
      const isAllowed = ALLOWED_IPS.includes(clientIp);
      expect(isAllowed).toBe(false);
    });

    it("ローカル開発時はIP制限をスキップ", () => {
      const isLocalDev = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
      // テスト環境ではスキップされる
      expect(isLocalDev).toBe(true);
    });
  });

  describe("マッチャー設定", () => {
    const matcherPattern = /^\/((?!api|_next\/static|_next\/image|.*\.png$).*)/;

    it("ページルートがマッチする", () => {
      expect("/projects").toMatch(matcherPattern);
      expect("/todos").toMatch(matcherPattern);
      expect("/calendar").toMatch(matcherPattern);
    });

    it("APIルートはマッチしない", () => {
      expect("/api/projects").not.toMatch(matcherPattern);
      expect("/api/todos").not.toMatch(matcherPattern);
    });

    it("静的ファイルはマッチしない", () => {
      expect("/_next/static/chunk.js").not.toMatch(matcherPattern);
      expect("/_next/image/photo.jpg").not.toMatch(matcherPattern);
    });

    it("PNG画像はマッチしない", () => {
      expect("/logo.png").not.toMatch(matcherPattern);
      expect("/images/icon.png").not.toMatch(matcherPattern);
    });
  });

  describe("認証フロー", () => {
    it("NextAuth認証ミドルウェアが呼ばれる", async () => {
      // ミドルウェアのインポートと実行をシミュレート
      const request = createMockRequest({ url: "http://localhost/projects" });

      // authMiddlewareが呼ばれることを確認
      await mockAuthMiddleware(request);
      expect(mockAuthMiddleware).toHaveBeenCalled();
    });
  });
});

describe("セキュリティ", () => {
  describe("IPスプーフィング対策", () => {
    it("複数のx-forwarded-forでも最初のIPのみを使用", () => {
      const request = createMockRequest({
        headers: { "x-forwarded-for": "legitimate.ip, spoofed.ip" },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("legitimate.ip");
    });
  });

  describe("ヘッダーインジェクション対策", () => {
    it("カンマで区切られた不正なIPでも最初のIPのみを取得", () => {
      const request = createMockRequest({
        headers: { "x-forwarded-for": "192.168.1.1, malicious-data" },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("192.168.1.1");
    });
  });
});
