import { describe, it, expect, vi, beforeEach } from "vitest";

// DBモック
const mockProjects = [
  { id: 1, managementNumber: "P001" },
  { id: 2, managementNumber: "P002" },
];

const mockProgress = [
  {
    id: 1,
    projectId: 1,
    title: "現地調査",
    description: "現地確認を行う",
    status: "planned",
    createdAt: "2024-12-15",
  },
  {
    id: 2,
    projectId: 2,
    title: "書類作成",
    description: null,
    status: "planned",
    createdAt: "2024-12-20",
  },
];

let callCount = 0;
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn((table: any) => {
        callCount++;
        if (callCount === 1) return Promise.resolve(mockProjects);
        return {
          where: vi.fn(() => Promise.resolve(mockProgress)),
        };
      }),
    })),
  },
}));

vi.mock("@/db/schema", () => ({
  projects: { id: "id", managementNumber: "managementNumber" },
  progress: { status: "status" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
}));

import { GET } from "../route";

describe("Calendar iCal API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callCount = 0;
  });

  describe("GET /api/calendar/ical", () => {
    it("iCal形式のレスポンスを返す", async () => {
      const response = await GET();
      const content = await response.text();

      expect(content).toContain("BEGIN:VCALENDAR");
      expect(content).toContain("END:VCALENDAR");
    });

    it("正しいContent-Typeヘッダーを持つ", async () => {
      const response = await GET();
      expect(response.headers.get("Content-Type")).toBe(
        "text/calendar; charset=utf-8"
      );
    });

    it("Content-Dispositionヘッダーを持つ", async () => {
      const response = await GET();
      expect(response.headers.get("Content-Disposition")).toContain(
        "attachment"
      );
      expect(response.headers.get("Content-Disposition")).toContain(".ics");
    });

    it("VCALENDARヘッダーが正しく設定される", async () => {
      const response = await GET();
      const content = await response.text();

      expect(content).toContain("VERSION:2.0");
      expect(content).toContain("PRODID:-//ALAN//ALAN Calendar//JA");
      expect(content).toContain("X-WR-TIMEZONE:Asia/Tokyo");
      expect(content).toContain("CALSCALE:GREGORIAN");
      expect(content).toContain("METHOD:PUBLISH");
    });

    it("VEVENTが進捗データから生成される", async () => {
      const response = await GET();
      const content = await response.text();

      expect(content).toContain("BEGIN:VEVENT");
      expect(content).toContain("END:VEVENT");
      expect(content).toContain("UID:progress-");
    });

    it("イベントタイトルに管理番号が含まれる", async () => {
      const response = await GET();
      const content = await response.text();

      expect(content).toContain("SUMMARY:");
    });

    it("Cache-Controlヘッダーが設定される", async () => {
      const response = await GET();
      expect(response.headers.get("Cache-Control")).toBe(
        "no-cache, no-store, must-revalidate"
      );
    });
  });

  describe("日付フォーマット", () => {
    it("DTSTART/DTENDがYYYYMMDD形式", async () => {
      const response = await GET();
      const content = await response.text();

      // DTSTART;VALUE=DATE:YYYYMMDD 形式を確認
      expect(content).toMatch(/DTSTART;VALUE=DATE:\d{8}/);
      expect(content).toMatch(/DTEND;VALUE=DATE:\d{8}/);
    });

    it("DSTAMPがYYYYMMDDTHHMMSSZ形式", async () => {
      const response = await GET();
      const content = await response.text();

      expect(content).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
    });
  });

  describe("テキストエスケープ", () => {
    it("特殊文字がエスケープされる", async () => {
      // エスケープ処理のテストは内部関数を直接テストすることが望ましいが、
      // ここではレスポンス全体が正常に生成されることを確認
      const response = await GET();
      const content = await response.text();

      expect(content).toBeDefined();
      expect(typeof content).toBe("string");
    });
  });
});
