"use client";

import { LawAlertCard } from "@/components/LawAlertCard";
import { ContactDeptAlertCard } from "@/components/ContactDeptAlertCard";
import { LawSearchCard } from "./LawSearchCard";
import {
  LAWS,
  CONTACT_DEPT_LAW_IDS,
  CONTACT_DEPT_MESSAGE,
  FUKUYAMA_SOIL_DETAIL_URL,
  HIROSHIMA_BIRD_PROTECTION_URL,
  isFukuyamaSoilTargetArea,
  isHiroshimaBirdProtectionArea,
} from "../../_constants";
import type { LegalStatuses } from "../../_types";

interface LawCardListProps {
  laws: typeof LAWS;
  projectAddress: string | null;
  projectLandCategories?: {
    landCategory1: string | null;
    landCategory2: string | null;
    landCategory3: string | null;
  } | null;
  currentPrefecture: string;
  isOkayama: boolean;
  isHiroshima: boolean;
  copiedText: string | null;
  onCopy: (text: string) => void;
  onSearch: (lawName: string, lawId?: number) => void;
  legalStatuses: LegalStatuses;
  onStatusChange: (lawName: string, status: "該当" | "非該当" | "要確認") => void;
  onStatusRemove: (lawName: string) => void;
}

export function LawCardList({
  laws,
  projectAddress,
  projectLandCategories,
  currentPrefecture,
  isOkayama,
  isHiroshima,
  copiedText,
  onCopy,
  onSearch,
  legalStatuses,
  onStatusChange,
  onStatusRemove,
}: LawCardListProps) {
  return (
    <div className="space-y-4">
      {laws.map((law) => {
        // 特殊な法令の処理
        if (CONTACT_DEPT_LAW_IDS.includes(law.id as (typeof CONTACT_DEPT_LAW_IDS)[number])) {
          return (
            <ContactDeptAlertCard
              key={law.id}
              title={law.name}
              message={CONTACT_DEPT_MESSAGE}
              onSearch={onSearch}
              lawName={law.name}
              lawId={law.id}
            />
          );
        }

        if (law.id === 14 && projectAddress && isFukuyamaSoilTargetArea(projectAddress)) {
          return (
            <LawAlertCard
              key={law.id}
              title="土壌汚染対策法"
              message="土壌汚染対策法の対象区域の可能性があります。"
              detailUrl={FUKUYAMA_SOIL_DETAIL_URL}
            />
          );
        }

        if (law.id === 18 && projectAddress && isHiroshimaBirdProtectionArea(projectAddress)) {
          return (
            <LawAlertCard
              key={law.id}
              title={law.name}
              message="鳥獣保護区に該当する可能性があります"
              detailUrl={HIROSHIMA_BIRD_PROTECTION_URL}
              variant="red"
            />
          );
        }

        // 通常の法令カード
        return (
          <LawSearchCard
            key={law.id}
            lawName={law.name}
            lawId={law.id}
            onSearch={onSearch}
            fixedText={law.fixedText}
            copiedText={copiedText}
            onCopy={onCopy}
            currentStatus={legalStatuses[law.name]?.status}
            onStatusChange={(status) => onStatusChange(law.name, status)}
            onStatusRemove={() => onStatusRemove(law.name)}
          />
        );
      })}
    </div>
  );
}
