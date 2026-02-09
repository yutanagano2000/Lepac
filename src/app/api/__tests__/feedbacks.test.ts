import { describe, it, expect } from "vitest";

describe("Feedbacks API", () => {
  describe("GET /api/feedbacks", () => {
    it("フィードバック一覧を取得", async () => {
      const response = await fetch("/api/feedbacks");

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it("フィードバックに必須フィールドが含まれる", async () => {
      const response = await fetch("/api/feedbacks");
      const data = await response.json();

      if (data.length > 0) {
        expect(data[0]).toHaveProperty("id");
        expect(data[0]).toHaveProperty("content");
        expect(data[0]).toHaveProperty("status");
        expect(data[0]).toHaveProperty("likes");
      }
    });
  });

  describe("GET /api/feedbacks/:id", () => {
    it("有効なIDでフィードバック取得", async () => {
      // まず一覧を取得して有効なIDを得る
      const listResponse = await fetch("/api/feedbacks");
      const list = await listResponse.json();

      if (list.length > 0) {
        const id = list[0].id;
        const response = await fetch(`/api/feedbacks/${id}`);
        expect(response.ok).toBe(true);
        const data = await response.json();
        expect(data.id).toBe(id);
      }
    });

    it("無効なID形式で400エラー", async () => {
      const response = await fetch("/api/feedbacks/invalid");
      expect(response.status).toBe(400);
    });

    it("負のIDで400エラー", async () => {
      const response = await fetch("/api/feedbacks/-1");
      expect(response.status).toBe(400);
    });

    it("小数IDで400エラー", async () => {
      const response = await fetch("/api/feedbacks/1.5");
      expect(response.status).toBe(400);
    });

    it("SQLインジェクション試行で400エラー", async () => {
      const response = await fetch("/api/feedbacks/1;DROP%20TABLE");
      expect(response.status).toBe(400);
    });

    it("存在しないIDで404エラー", async () => {
      const response = await fetch("/api/feedbacks/999999999");
      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/feedbacks", () => {
    it("新規フィードバック作成成功", async () => {
      const newFeedback = {
        content: "テストフィードバック",
        pagePath: "/test",
        pageTitle: "テストページ",
      };

      const response = await fetch("/api/feedbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFeedback),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data).toHaveProperty("id");
      expect(data.content).toBe(newFeedback.content);
    });

    it("content欠落で400エラー", async () => {
      const invalidFeedback = {
        pagePath: "/test",
      };

      const response = await fetch("/api/feedbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidFeedback),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });

  describe("PUT /api/feedbacks/:id", () => {
    it("ステータス更新成功", async () => {
      // まず一覧を取得
      const listResponse = await fetch("/api/feedbacks");
      const list = await listResponse.json();

      if (list.length > 0) {
        const id = list[0].id;
        const response = await fetch(`/api/feedbacks/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "in_progress" }),
        });

        expect(response.ok).toBe(true);
        const data = await response.json();
        expect(data.status).toBe("in_progress");
      }
    });

    it("無効なステータス値で400エラー", async () => {
      const listResponse = await fetch("/api/feedbacks");
      const list = await listResponse.json();

      if (list.length > 0) {
        const id = list[0].id;
        const response = await fetch(`/api/feedbacks/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "invalid_status" }),
        });

        expect(response.status).toBe(400);
      }
    });

    it("repliesが10000文字超で400エラー", async () => {
      const listResponse = await fetch("/api/feedbacks");
      const list = await listResponse.json();

      if (list.length > 0) {
        const id = list[0].id;
        const longReplies = "a".repeat(10001);
        const response = await fetch(`/api/feedbacks/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ replies: longReplies }),
        });

        expect(response.status).toBe(400);
      }
    });

    it("無効なJSONで400エラー", async () => {
      const listResponse = await fetch("/api/feedbacks");
      const list = await listResponse.json();

      if (list.length > 0) {
        const id = list[0].id;
        const response = await fetch(`/api/feedbacks/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: "invalid json",
        });

        expect(response.status).toBe(400);
      }
    });
  });

  describe("POST /api/feedbacks/:id/like", () => {
    it("いいね追加成功", async () => {
      const listResponse = await fetch("/api/feedbacks");
      const list = await listResponse.json();

      if (list.length > 0) {
        const id = list[0].id;
        const beforeLikes = list[0].likes;

        const response = await fetch(`/api/feedbacks/${id}/like`, {
          method: "POST",
        });

        expect(response.ok).toBe(true);
        const data = await response.json();
        expect(data.likes).toBe(beforeLikes + 1);
      }
    });

    it("無効なIDで400エラー", async () => {
      const response = await fetch("/api/feedbacks/invalid/like", {
        method: "POST",
      });
      expect(response.status).toBe(400);
    });

    it("存在しないIDで404エラー", async () => {
      const response = await fetch("/api/feedbacks/999999999/like", {
        method: "POST",
      });
      expect(response.status).toBe(404);
    });
  });
});
