import { describe, it, expect, beforeEach } from "vitest";
import {
  logAudit,
  getAuditLogs,
  clearAuditLogs,
  AuditAction,
} from "../security/audit-log";
import { createMockNextRequest } from "@/__tests__/mocks/next-request";

describe("Audit Log", () => {
  beforeEach(() => {
    clearAuditLogs();
  });

  describe("logAudit", () => {
    it("監査ログエントリを記録する", () => {
      const request = createMockNextRequest("http://localhost:3000/api/projects", {
        headers: {
          "x-forwarded-for": "192.168.1.1",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
      });

      const entry = logAudit(request, AuditAction.PROJECT_CREATE, {
        userId: "user-1",
        userName: "テストユーザー",
        resourceType: "project",
        resourceId: "project-123",
        details: { name: "新規案件" },
      });

      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeDefined();
      expect(entry.action).toBe(AuditAction.PROJECT_CREATE);
      expect(entry.userId).toBe("user-1");
      expect(entry.userName).toBe("テストユーザー");
      expect(entry.resourceType).toBe("project");
      expect(entry.resourceId).toBe("project-123");
      expect(entry.ipAddress).toBe("192.168.1.1");
      expect(entry.userAgent).toContain("Mozilla");
      expect(entry.details).toEqual({ name: "新規案件" });
      expect(entry.success).toBe(true);
    });

    it("IPアドレスをx-real-ipから取得する", () => {
      const request = createMockNextRequest("http://localhost:3000/api/projects", {
        headers: {
          "x-real-ip": "10.0.0.1",
        },
      });

      const entry = logAudit(request, AuditAction.PROJECT_VIEW, {
        resourceType: "project",
      });

      expect(entry.ipAddress).toBe("10.0.0.1");
    });

    it("失敗したアクションを記録する", () => {
      const request = createMockNextRequest("http://localhost:3000/api/projects", {
        headers: {
          "x-forwarded-for": "192.168.1.100",
        },
      });

      const entry = logAudit(request, AuditAction.LOGIN_FAILURE, {
        resourceType: "auth",
        success: false,
        errorMessage: "Invalid credentials",
        details: { username: "attacker" },
      });

      expect(entry.success).toBe(false);
      expect(entry.errorMessage).toBe("Invalid credentials");
      expect(entry.action).toBe(AuditAction.LOGIN_FAILURE);
    });

    it("セキュリティ違反を記録する", () => {
      const request = createMockNextRequest("http://localhost:3000/api/projects", {
        method: "POST",
        headers: {
          "x-forwarded-for": "1.2.3.4",
          Origin: "https://malicious-site.com",
        },
      });

      const entry = logAudit(request, AuditAction.CSRF_VIOLATION, {
        resourceType: "security",
        success: false,
        errorMessage: "CSRF validation failed",
        details: { origin: "https://malicious-site.com" },
      });

      expect(entry.action).toBe(AuditAction.CSRF_VIOLATION);
      expect(entry.success).toBe(false);
    });
  });

  describe("getAuditLogs", () => {
    beforeEach(() => {
      // テストデータを作成
      const request = createMockNextRequest("http://localhost:3000/api", {
        headers: { "x-forwarded-for": "192.168.1.1" },
      });

      logAudit(request, AuditAction.PROJECT_CREATE, {
        userId: "user-1",
        resourceType: "project",
        resourceId: "p-1",
      });

      logAudit(request, AuditAction.PROJECT_UPDATE, {
        userId: "user-1",
        resourceType: "project",
        resourceId: "p-2",
      });

      logAudit(request, AuditAction.TODO_CREATE, {
        userId: "user-2",
        resourceType: "todo",
        resourceId: "t-1",
      });

      logAudit(request, AuditAction.LOGIN_FAILURE, {
        userId: "unknown",
        resourceType: "auth",
        success: false,
      });
    });

    it("全ての監査ログを取得する", () => {
      const logs = getAuditLogs();

      expect(logs.length).toBe(4);
    });

    it("ユーザーIDでフィルタリングする", () => {
      const logs = getAuditLogs({ userId: "user-1" });

      expect(logs.length).toBe(2);
      expect(logs.every((log) => log.userId === "user-1")).toBe(true);
    });

    it("アクションでフィルタリングする", () => {
      const logs = getAuditLogs({ action: AuditAction.PROJECT_CREATE });

      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe(AuditAction.PROJECT_CREATE);
    });

    it("リソースタイプでフィルタリングする", () => {
      const logs = getAuditLogs({ resourceType: "project" });

      expect(logs.length).toBe(2);
      expect(logs.every((log) => log.resourceType === "project")).toBe(true);
    });

    it("件数を制限する", () => {
      const logs = getAuditLogs({ limit: 2 });

      expect(logs.length).toBe(2);
    });

    it("複数のフィルタを組み合わせる", () => {
      const logs = getAuditLogs({
        userId: "user-1",
        resourceType: "project",
      });

      expect(logs.length).toBe(2);
      expect(logs.every((log) => log.userId === "user-1")).toBe(true);
      expect(logs.every((log) => log.resourceType === "project")).toBe(true);
    });

    it("ログは新しい順にソートされる", () => {
      const logs = getAuditLogs();

      for (let i = 0; i < logs.length - 1; i++) {
        const current = new Date(logs[i].timestamp).getTime();
        const next = new Date(logs[i + 1].timestamp).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe("clearAuditLogs", () => {
    it("全ての監査ログをクリアする", () => {
      const request = createMockNextRequest("http://localhost:3000/api", {
        headers: { "x-forwarded-for": "192.168.1.1" },
      });

      logAudit(request, AuditAction.PROJECT_CREATE, {
        resourceType: "project",
      });

      expect(getAuditLogs().length).toBe(1);

      clearAuditLogs();

      expect(getAuditLogs().length).toBe(0);
    });
  });

  describe("AuditAction", () => {
    it("全てのアクション種別が定義されている", () => {
      expect(AuditAction.LOGIN_SUCCESS).toBeDefined();
      expect(AuditAction.LOGIN_FAILURE).toBeDefined();
      expect(AuditAction.LOGOUT).toBeDefined();
      expect(AuditAction.PROJECT_CREATE).toBeDefined();
      expect(AuditAction.PROJECT_UPDATE).toBeDefined();
      expect(AuditAction.PROJECT_DELETE).toBeDefined();
      expect(AuditAction.PROJECT_VIEW).toBeDefined();
      expect(AuditAction.TODO_CREATE).toBeDefined();
      expect(AuditAction.TODO_UPDATE).toBeDefined();
      expect(AuditAction.TODO_DELETE).toBeDefined();
      expect(AuditAction.TODO_COMPLETE).toBeDefined();
      expect(AuditAction.FILE_UPLOAD).toBeDefined();
      expect(AuditAction.FILE_DELETE).toBeDefined();
      expect(AuditAction.FILE_DOWNLOAD).toBeDefined();
      expect(AuditAction.CSRF_VIOLATION).toBeDefined();
      expect(AuditAction.RATE_LIMIT_EXCEEDED).toBeDefined();
      expect(AuditAction.UNAUTHORIZED_ACCESS).toBeDefined();
    });
  });
});
