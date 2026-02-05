"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Shield } from "lucide-react";

interface Organization {
  id: number;
  name: string;
  code: string;
}

export default function SelectOrganizationPage() {
  const { data: session, update } = useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const isAdmin = session?.user?.role === "admin";
  const [isOther, setIsOther] = useState(false);
  const [customOrgName, setCustomOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState("");
  const [visibleItems, setVisibleItems] = useState<number[]>([]);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  // スタガーアニメーション
  useEffect(() => {
    if (!fetchLoading && organizations.length > 0) {
      organizations.forEach((_, index) => {
        setTimeout(() => {
          setVisibleItems((prev) => [...prev, index]);
        }, index * 80);
      });
      setTimeout(() => {
        setVisibleItems((prev) => [...prev, organizations.length]);
      }, organizations.length * 80);
    }
  }, [fetchLoading, organizations]);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch("/api/organizations");
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data);
      }
    } catch (err) {
      console.error("Failed to fetch organizations:", err);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSelectOrg = (orgId: number) => {
    setSelectedOrgId(orgId);
    setIsOther(false);
    setCustomOrgName("");
  };

  const handleSelectOther = () => {
    setSelectedOrgId(null);
    setIsOther(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let organizationId = selectedOrgId;

      if (isOther && customOrgName.trim()) {
        const createRes = await fetch("/api/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: customOrgName.trim() }),
        });

        if (!createRes.ok) {
          const errorData = await createRes.json().catch(() => ({}));
          throw new Error(errorData.error || "組織の作成に失敗しました");
        }

        const newOrg = await createRes.json();
        organizationId = newOrg.id;
      }

      if (!organizationId) {
        setError("組織を選択してください");
        setLoading(false);
        return;
      }

      // ユーザーの組織IDを更新
      const updateRes = await fetch("/api/user/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });

      if (!updateRes.ok) {
        const errorData = await updateRes.json().catch(() => ({}));
        throw new Error(errorData.error || "組織の設定に失敗しました");
      }

      // セッションを更新（エラーが出ても続行）
      try {
        await update();
      } catch (e) {
        console.warn("Session update warning:", e);
      }

      // 強制リロードでセッションを確実に反映
      window.location.href = "/";
    } catch (err: any) {
      console.error("Organization update error:", err);
      setError(err.message || "エラーが発生しました");
      setLoading(false);
    }
  };

  const isValid = selectedOrgId !== null || (isOther && customOrgName.trim().length > 0);

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-neutral-950 flex items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-sm">
        {/* ヘッダー */}
        <div className="mb-10">
          {isAdmin && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-4 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-full">
              <Shield className="w-3 h-3" />
              管理者モード
            </div>
          )}
          <h1 className="text-xl font-medium text-neutral-900 dark:text-neutral-100 tracking-tight">
            {isAdmin ? "操作する組織を選択" : "所属する組織を選択"}
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {isAdmin ? "マスターアカウントとして組織を選択してください" : "あなたの組織を選んでください"}
          </p>
        </div>

        {fetchLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-400 dark:text-neutral-500" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-2">
              {/* 組織リスト */}
              {organizations.map((org, index) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => handleSelectOrg(org.id)}
                  style={{
                    opacity: visibleItems.includes(index) ? 1 : 0,
                    transform: visibleItems.includes(index)
                      ? "translateX(0)"
                      : "translateX(24px)",
                    transition: "opacity 0.4s ease-out, transform 0.4s ease-out",
                  }}
                  className={`
                    w-full flex items-center justify-between px-4 py-3.5
                    border rounded-lg transition-colors duration-150
                    ${selectedOrgId === org.id
                      ? "border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-900"
                      : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    }
                  `}
                >
                  <span className={`
                    text-sm
                    ${selectedOrgId === org.id
                      ? "text-neutral-900 dark:text-neutral-100 font-medium"
                      : "text-neutral-700 dark:text-neutral-300"
                    }
                  `}>
                    {org.name}
                  </span>
                  {selectedOrgId === org.id && (
                    <Check className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
                  )}
                </button>
              ))}

              {/* その他 */}
              <button
                type="button"
                onClick={handleSelectOther}
                style={{
                  opacity: visibleItems.includes(organizations.length) ? 1 : 0,
                  transform: visibleItems.includes(organizations.length)
                    ? "translateX(0)"
                    : "translateX(24px)",
                  transition: "opacity 0.4s ease-out, transform 0.4s ease-out",
                }}
                className={`
                  w-full flex items-center justify-between px-4 py-3.5
                  border rounded-lg transition-colors duration-150
                  ${isOther
                    ? "border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-900"
                    : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  }
                `}
              >
                <span className={`
                  text-sm
                  ${isOther
                    ? "text-neutral-900 dark:text-neutral-100 font-medium"
                    : "text-neutral-700 dark:text-neutral-300"
                  }
                `}>
                  その他
                </span>
                {isOther && <Check className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />}
              </button>

              {/* その他入力 */}
              {isOther && (
                <div
                  className="pt-1"
                  style={{
                    animation: "slideIn 0.3s ease-out",
                  }}
                >
                  <Input
                    type="text"
                    placeholder="組織名を入力"
                    value={customOrgName}
                    onChange={(e) => setCustomOrgName(e.target.value)}
                    disabled={loading}
                    autoFocus
                    className="h-11 text-sm border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:border-neutral-900 dark:focus:border-neutral-100 focus:ring-0"
                  />
                </div>
              )}
            </div>

            {/* エラー */}
            {error && (
              <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            {/* 送信ボタン */}
            <div className="mt-8">
              <Button
                type="submit"
                disabled={loading || !isValid}
                className={`
                  w-full h-11 text-sm font-medium rounded-lg
                  transition-all duration-150
                  ${isValid
                    ? "bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900"
                    : "bg-neutral-100 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-600 cursor-not-allowed"
                  }
                `}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "続ける"
                )}
              </Button>
            </div>
          </form>
        )}

        {/* フッター */}
        <p className="mt-8 text-center text-xs text-neutral-400 dark:text-neutral-600">
          {isAdmin ? "管理者はいつでも組織を切り替えられます" : "設定は後から変更できます"}
        </p>
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(16px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
