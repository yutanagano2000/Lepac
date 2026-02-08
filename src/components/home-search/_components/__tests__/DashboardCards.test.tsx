import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardCards } from "../DashboardCards";
import type { DashboardData } from "../../_types";

// Next.js Link モック
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockDashboard: DashboardData = {
  overdueTodos: {
    count: 3,
    items: [
      { id: 1, content: "期限切れタスク1", dueDate: "2024-12-01", projectId: 1, managementNumber: "P001" },
      { id: 2, content: "期限切れタスク2", dueDate: "2024-12-02", projectId: 2, managementNumber: "P002" },
    ],
  },
  todayTodos: {
    count: 2,
    items: [
      { id: 3, content: "今日のタスク1", dueDate: "2024-12-15", projectId: 1, managementNumber: "P001" },
    ],
  },
  thisWeekTodos: {
    count: 5,
    items: [
      { id: 4, content: "今週のタスク1", dueDate: "2024-12-20", projectId: 1, managementNumber: "P001" },
      { id: 5, content: "今週のタスク2", dueDate: "2024-12-21", projectId: 2, managementNumber: "P002" },
    ],
  },
  projectAlerts: {
    count: 2,
    totalAlerts: 5,
    items: [
      { id: 1, managementNumber: "P001", alertCount: 3 },
      { id: 2, managementNumber: "P002", alertCount: 2 },
    ],
  },
  activeProjects: {
    count: 10,
    items: [
      { id: 1, managementNumber: "P001", client: "クライアントA" },
      { id: 2, managementNumber: "P002", client: "クライアントB" },
    ],
  },
  recentProjects: {
    items: [
      { id: 1, managementNumber: "P001" },
      { id: 2, managementNumber: "P002" },
      { id: 3, managementNumber: "P003" },
    ],
  },
};

const emptyDashboard: DashboardData = {
  overdueTodos: { count: 0, items: [] },
  todayTodos: { count: 0, items: [] },
  thisWeekTodos: { count: 0, items: [] },
  projectAlerts: { count: 0, totalAlerts: 0, items: [] },
  activeProjects: { count: 0, items: [] },
  recentProjects: { items: [] },
};

describe("DashboardCards", () => {
  describe("カード表示", () => {
    it("全てのカードタイトルが表示される", () => {
      render(<DashboardCards dashboard={mockDashboard} />);

      expect(screen.getByText("期日超過TODO")).toBeInTheDocument();
      expect(screen.getByText("今日期日")).toBeInTheDocument();
      expect(screen.getByText("今週期日")).toBeInTheDocument();
      expect(screen.getByText("案件アラート")).toBeInTheDocument();
      expect(screen.getByText("進行中案件")).toBeInTheDocument();
      expect(screen.getByText("最近更新")).toBeInTheDocument();
    });

    it("各カードの件数が表示される", () => {
      render(<DashboardCards dashboard={mockDashboard} />);

      // 複数の同じ数字が表示される可能性があるのでgetAllByTextを使用
      expect(screen.getAllByText("3").length).toBeGreaterThan(0); // 期日超過
      expect(screen.getAllByText("2").length).toBeGreaterThan(0); // 今日期日
      expect(screen.getAllByText("5").length).toBeGreaterThan(0); // 今週期日/アラート
      expect(screen.getByText("10")).toBeInTheDocument(); // 進行中案件
    });
  });

  describe("TODOアイテム表示", () => {
    it("期日超過TODOのアイテムが表示される", () => {
      render(<DashboardCards dashboard={mockDashboard} />);

      expect(screen.getByText(/期限切れタスク1/)).toBeInTheDocument();
    });

    it("今日期日TODOのアイテムが表示される", () => {
      render(<DashboardCards dashboard={mockDashboard} />);

      expect(screen.getByText(/今日のタスク1/)).toBeInTheDocument();
    });

    it("今週期日TODOのアイテムが表示される", () => {
      render(<DashboardCards dashboard={mockDashboard} />);

      expect(screen.getByText(/今週のタスク1/)).toBeInTheDocument();
    });
  });

  describe("案件アラート", () => {
    it("アラート総数が表示される", () => {
      render(<DashboardCards dashboard={mockDashboard} />);

      // totalAlertsが表示される（複数箇所に同じ数字が出る可能性あり）
      expect(screen.getAllByText("5").length).toBeGreaterThan(0);
    });

    it("案件数が表示される", () => {
      render(<DashboardCards dashboard={mockDashboard} />);

      expect(screen.getByText("2件の案件")).toBeInTheDocument();
    });
  });

  describe("進行中案件", () => {
    it("管理番号が表示される", () => {
      render(<DashboardCards dashboard={mockDashboard} />);

      expect(screen.getAllByText("P001").length).toBeGreaterThan(0);
    });

    it("クライアント名が表示される", () => {
      render(<DashboardCards dashboard={mockDashboard} />);

      expect(screen.getByText("(クライアントA)")).toBeInTheDocument();
    });
  });

  describe("最近更新", () => {
    it("最近更新された案件が表示される", () => {
      render(<DashboardCards dashboard={mockDashboard} />);

      expect(screen.getByText("P003")).toBeInTheDocument();
    });
  });

  describe("「他N件」表示", () => {
    it("期日超過TODOで他N件が表示される", () => {
      render(<DashboardCards dashboard={mockDashboard} />);

      // count: 3, displayed: 2 なので「他1件」が表示される
      expect(screen.getByText("他1件")).toBeInTheDocument();
    });
  });

  describe("空の状態", () => {
    it("空のダッシュボードでクラッシュしない", () => {
      render(<DashboardCards dashboard={emptyDashboard} />);

      expect(screen.getByText("期日超過TODO")).toBeInTheDocument();
      // 0が複数箇所に表示される
      expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    });

    it("アイテムがない場合は「他N件」が表示されない", () => {
      render(<DashboardCards dashboard={emptyDashboard} />);

      expect(screen.queryByText(/他\d+件/)).not.toBeInTheDocument();
    });
  });

  describe("リンク", () => {
    it("進行中案件カードは/projectsへリンク", () => {
      render(<DashboardCards dashboard={mockDashboard} />);

      const link = screen.getByRole("link", { name: /進行中案件/ });
      expect(link).toHaveAttribute("href", "/projects");
    });

    it("案件アラートカードは/todosへリンク", () => {
      render(<DashboardCards dashboard={mockDashboard} />);

      const link = screen.getByRole("link", { name: /案件アラート/ });
      expect(link).toHaveAttribute("href", "/todos");
    });

    it("最近更新の案件は詳細ページへリンク", () => {
      render(<DashboardCards dashboard={mockDashboard} />);

      const links = screen.getAllByRole("link");
      const projectDetailLink = links.find((link) =>
        link.getAttribute("href")?.match(/\/projects\/\d+/)
      );
      expect(projectDetailLink).toBeDefined();
    });
  });
});
