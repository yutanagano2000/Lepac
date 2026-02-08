"use client";

import { useState, useEffect } from "react";
import type { DashboardData } from "../_types";

export interface UseDashboardReturn {
  dashboard: DashboardData | null;
  isLoading: boolean;
}

export function useDashboard(): UseDashboardReturn {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const data = await res.json();
          setDashboard(data);
        }
      } catch (err) {
        console.error("ダッシュボード取得エラー:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  return { dashboard, isLoading };
}
