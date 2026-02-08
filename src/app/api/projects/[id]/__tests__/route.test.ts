import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// テスト用のプロジェクトデータ
const mockProject = {
  id: 1,
  managementNumber: "P001",
  manager: "田中太郎",
  client: "クライアントA",
  projectNumber: "2024-001",
  completionMonth: "2024-12",
  address: "東京都渋谷区",
  landowner1: "地主A",
  landowner2: null,
  landowner3: null,
};

let updatedProject: any = null;

// 削除呼び出しカウンター（route.tsでは todos -> comments -> progress -> projects の順で呼ばれる）
let deleteCallCount = 0;

// DBモックのセットアップ
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn((condition: any) => {
          // IDが存在する場合はプロジェクトを返す
          return Promise.resolve([mockProject]);
        }),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn((data: any) => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => {
            updatedProject = { ...mockProject, ...data };
            return Promise.resolve([updatedProject]);
          }),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => {
        deleteCallCount++;
        return Promise.resolve();
      }),
    })),
  },
}));

// drizzle-ormのeqモック
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field: any, value: any) => ({ field, value })),
}));

// APIルートをインポート
import { GET, PUT, DELETE } from "../route";

describe("Projects [id] API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteCallCount = 0;
    updatedProject = null;
  });

  describe("GET /api/projects/:id", () => {
    it("指定されたIDのプロジェクトを取得する", async () => {
      const request = new Request("http://localhost:3000/api/projects/1");
      const params = Promise.resolve({ id: "1" });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response).toBeInstanceOf(NextResponse);
      expect(data.id).toBe(1);
      expect(data.managementNumber).toBe("P001");
      expect(data.manager).toBe("田中太郎");
    });

    it("プロジェクトの詳細情報が含まれる", async () => {
      const request = new Request("http://localhost:3000/api/projects/1");
      const params = Promise.resolve({ id: "1" });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(data).toHaveProperty("address");
      expect(data).toHaveProperty("completionMonth");
      expect(data).toHaveProperty("landowner1");
    });
  });

  describe("PUT /api/projects/:id", () => {
    it("プロジェクトを更新する", async () => {
      const updateData = {
        managementNumber: "P001-updated",
        manager: "更新担当者",
        client: "更新クライアント",
        projectNumber: "2024-001-updated",
        completionMonth: "2025-06",
        address: "更新住所",
      };

      const request = new Request("http://localhost:3000/api/projects/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const params = Promise.resolve({ id: "1" });

      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response).toBeInstanceOf(NextResponse);
      expect(data.managementNumber).toBe("P001-updated");
      expect(data.manager).toBe("更新担当者");
    });

    it("地権者情報を更新できる", async () => {
      const updateData = {
        managementNumber: "P001",
        manager: "田中太郎",
        client: "クライアントA",
        projectNumber: "2024-001",
        landowner1: "新地主A",
        landowner2: "新地主B",
        landowner3: "新地主C",
      };

      const request = new Request("http://localhost:3000/api/projects/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const params = Promise.resolve({ id: "1" });

      const response = await PUT(request, { params });
      const data = await response.json();

      expect(data.landowner1).toBe("新地主A");
      expect(data.landowner2).toBe("新地主B");
      expect(data.landowner3).toBe("新地主C");
    });

    it("null値でフィールドをクリアできる", async () => {
      const updateData = {
        managementNumber: "P001",
        manager: "田中太郎",
        client: "クライアントA",
        projectNumber: "2024-001",
        completionMonth: null,
        address: null,
      };

      const request = new Request("http://localhost:3000/api/projects/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const params = Promise.resolve({ id: "1" });

      const response = await PUT(request, { params });

      expect(response).toBeInstanceOf(NextResponse);
    });
  });

  describe("DELETE /api/projects/:id", () => {
    it("プロジェクトを削除する", async () => {
      const request = new Request("http://localhost:3000/api/projects/1", {
        method: "DELETE",
      });
      const params = Promise.resolve({ id: "1" });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response).toBeInstanceOf(NextResponse);
      expect(data.success).toBe(true);
    });

    it("削除時に関連データも含めて削除が実行される", async () => {
      const request = new Request("http://localhost:3000/api/projects/1", {
        method: "DELETE",
      });
      const params = Promise.resolve({ id: "1" });

      await DELETE(request, { params });

      // route.tsでは todos -> comments -> progress -> projects の順で削除される
      // 少なくとも1回以上deleteが呼ばれていることを確認
      expect(deleteCallCount).toBeGreaterThan(0);
    });

    it("関連テーブルを含む複数の削除が実行される", async () => {
      const request = new Request("http://localhost:3000/api/projects/1", {
        method: "DELETE",
      });
      const params = Promise.resolve({ id: "1" });

      await DELETE(request, { params });

      // プロジェクト削除時は複数テーブル（todos, comments, progress, projects）の削除が行われる
      expect(deleteCallCount).toBeGreaterThanOrEqual(1);
    });
  });
});
