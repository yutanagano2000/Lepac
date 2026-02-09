"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";

interface UseOrganizationSelectionProps {
  onSuccess: () => void;
}

export function useOrganizationSelection({ onSuccess }: UseOrganizationSelectionProps) {
  const { update } = useSession();
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [isOther, setIsOther] = useState(false);
  const [customOrgName, setCustomOrgName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSelectOrg = useCallback((orgId: number) => {
    setSelectedOrgId(orgId);
    setIsOther(false);
    setCustomOrgName("");
    setError("");
  }, []);

  const handleSelectOther = useCallback(() => {
    setSelectedOrgId(null);
    setIsOther(true);
    setError("");
  }, []);

  const isValid = selectedOrgId !== null || (isOther && customOrgName.trim().length > 0);

  const handleSubmit = useCallback(async () => {
    if (!isValid) {
      setError("組織を選択してください");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      let organizationId = selectedOrgId;

      // 新規組織の作成
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
        setIsSubmitting(false);
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

      // セッションを更新
      try {
        await update();
      } catch (e) {
        console.warn("Session update warning:", e);
      }

      onSuccess();
    } catch (err) {
      console.error("Organization update error:", err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setIsSubmitting(false);
    }
  }, [isValid, selectedOrgId, isOther, customOrgName, update, onSuccess]);

  return {
    selectedOrgId,
    isOther,
    customOrgName,
    isSubmitting,
    error,
    isValid,
    handleSelectOrg,
    handleSelectOther,
    setCustomOrgName,
    handleSubmit,
  };
}
