"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseCoordinateString } from "@/lib/coordinates";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectFiles } from "@/components/ProjectFiles";
import type { Project, ProjectFile } from "../../_types";

// ========================================
// Props
// ========================================

interface DetailsTabProps {
  project: Project;
  files: ProjectFile[];
  onEditOpen: () => void;
  onLegalTabOpen: (params: { lat: string; lon: string; prefecture: string }) => void;
}

// ========================================
// Helper Functions
// ========================================

function calculateTotalArea(area1: string, area2: string, area3: string) {
  const num1 = parseFloat(area1) || 0;
  const num2 = parseFloat(area2) || 0;
  const num3 = parseFloat(area3) || 0;
  return num1 + num2 + num3;
}

function getMappleUrl(coords: string | null) {
  if (!coords) return null;
  const parsed = parseCoordinateString(coords);
  if (!parsed) return null;
  return `https://mapfan.com/map/spots/search?c=${parsed.lat},${parsed.lon},16&s=std,pc,ja`;
}

function getGoogleMapsUrl(coords: string | null) {
  if (!coords) return null;
  const parsed = parseCoordinateString(coords);
  if (!parsed) return null;
  return `https://www.google.com/maps?q=${parsed.lat},${parsed.lon}`;
}

function getHazardMapUrl(coords: string | null) {
  if (!coords) return null;
  const parsed = parseCoordinateString(coords);
  if (!parsed) return null;
  return `https://disaportal.gsi.go.jp/maps/?ll=${parsed.lat},${parsed.lon}&z=15`;
}

function getPrefectureFromAddress(address: string | null) {
  if (!address) return null;
  const prefectures = [
    "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
    "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
    "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
    "岐阜県", "静岡県", "愛知県", "三重県",
    "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
    "鳥取県", "島根県", "岡山県", "広島県", "山口県",
    "徳島県", "香川県", "愛媛県", "高知県",
    "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
  ];
  for (const pref of prefectures) {
    if (address.includes(pref)) return pref;
  }
  return null;
}

// ========================================
// DetailsTab Component
// ========================================

export function DetailsTab({ project, files, onEditOpen, onLegalTabOpen }: DetailsTabProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAddress = () => copyToClipboard(project.address || "", "address");
  const copyCoordinates = () => copyToClipboard(project.coordinates || "", "coordinates");
  const copyLandowners = () => {
    const landowners = [project.landowner1, project.landowner2, project.landowner3]
      .filter(Boolean)
      .join("\n");
    copyToClipboard(landowners, "landowners");
  };
  const copyTotalArea = () => {
    const total = calculateTotalArea(
      project.landArea1 ?? "",
      project.landArea2 ?? "",
      project.landArea3 ?? ""
    );
    copyToClipboard(total.toString(), "totalArea");
  };

  const handleLegalLinkClick = () => {
    if (!project.coordinates) return;
    const parsed = parseCoordinateString(project.coordinates);
    if (!parsed) return;
    const prefecture = getPrefectureFromAddress(project.address);
    if (prefecture) {
      onLegalTabOpen({
        lat: parsed.lat.toString(),
        lon: parsed.lon.toString(),
        prefecture,
      });
    }
  };

  const hasLegalSearchParams = project.coordinates && getPrefectureFromAddress(project.address);

  return (
    <>
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* 現地住所 */}
          <DetailRow label="現地住所">
            <div className="flex items-center gap-2">
              <span className="text-sm">{project.address || "未登録"}</span>
              {project.address && (
                <CopyButton copied={copiedField === "address"} onClick={copyAddress} />
              )}
            </div>
          </DetailRow>

          {/* 座標 */}
          <DetailRow label="座標">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">{project.coordinates || "未登録"}</span>
                {project.coordinates && (
                  <CopyButton copied={copiedField === "coordinates"} onClick={copyCoordinates} />
                )}
              </div>
              {project.coordinates && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <MapLinkButton href={getMappleUrl(project.coordinates)} label="MAPPLE" />
                  <MapLinkButton href={getGoogleMapsUrl(project.coordinates)} label="Google Map" />
                  <MapLinkButton href={getHazardMapUrl(project.coordinates)} label="ハザード" />
                </div>
              )}
            </div>
          </DetailRow>

          {/* 法令 */}
          <DetailRow label="法令">
            <LegalStatusSummary
              legalStatuses={project.legalStatuses}
              hasSearchParams={!!hasLegalSearchParams}
              onLegalTabClick={handleLegalLinkClick}
            />
          </DetailRow>

          {/* 地権者 */}
          <DetailRow label="地権者">
            <div className="flex items-start gap-2">
              <div className="space-y-3 text-sm flex-1">
                <LandownerCard
                  name={project.landowner1}
                  address={project.landownerAddress1}
                  inheritance={project.inheritanceStatus1}
                  correction={project.correctionRegistration1}
                  mortgage={project.mortgageStatus1}
                />
                <LandownerCard
                  name={project.landowner2}
                  address={project.landownerAddress2}
                  inheritance={project.inheritanceStatus2}
                  correction={project.correctionRegistration2}
                  mortgage={project.mortgageStatus2}
                />
                <LandownerCard
                  name={project.landowner3}
                  address={project.landownerAddress3}
                  inheritance={project.inheritanceStatus3}
                  correction={project.correctionRegistration3}
                  mortgage={project.mortgageStatus3}
                />
                {!project.landowner1 && !project.landowner2 && !project.landowner3 && (
                  <span>未登録</span>
                )}
              </div>
              {(project.landowner1 || project.landowner2 || project.landowner3) && (
                <CopyButton copied={copiedField === "landowners"} onClick={copyLandowners} />
              )}
            </div>
          </DetailRow>

          {/* 地目・面積 */}
          <DetailRow label="地目・面積">
            <div className="space-y-1 text-sm">
              <LandCategoryRow category={project.landCategory1} area={project.landArea1} />
              <LandCategoryRow category={project.landCategory2} area={project.landArea2} />
              <LandCategoryRow category={project.landCategory3} area={project.landArea3} />
              {!project.landCategory1 && !project.landArea1 &&
               !project.landCategory2 && !project.landArea2 &&
               !project.landCategory3 && !project.landArea3 && (
                <span>未登録</span>
              )}
              <div className="flex items-center gap-2 pt-1 border-t mt-1">
                <span className="font-medium">合計:</span>
                <span className="font-medium">
                  {calculateTotalArea(
                    project.landArea1 ?? "",
                    project.landArea2 ?? "",
                    project.landArea3 ?? ""
                  )} ㎡
                </span>
                <CopyButton copied={copiedField === "totalArea"} onClick={copyTotalArea} />
              </div>
            </div>
          </DetailRow>

          {/* 環境データ */}
          <DetailRow label="環境データ">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">垂直積雪量:</span>
                <span className="font-medium">{project.verticalSnowLoad || "未登録"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">風速:</span>
                <span className="font-medium">{project.windSpeed || "未登録"}</span>
              </div>
            </div>
          </DetailRow>

          {/* どこキャビ */}
          <DetailRow label="どこキャビ">
            {project.dococabiLink ? (
              <Button variant="outline" size="sm" asChild className="h-8">
                <a href={project.dococabiLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-2" />
                  どこキャビを開く
                </a>
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">未登録</span>
            )}
          </DetailRow>

          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={onEditOpen}>
              <Pencil className="h-4 w-4 mr-2" />
              詳細情報を編集
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ファイル */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">ファイル</h3>
          <ProjectFiles projectId={project.id} initialFiles={files} />
        </CardContent>
      </Card>
    </>
  );
}

// ========================================
// Sub-components
// ========================================

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 items-start border-b pb-3">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="col-span-2">{children}</div>
    </div>
  );
}

function CopyButton({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClick}>
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

function MapLinkButton({ href, label }: { href: string | null; label: string }) {
  if (!href) return null;
  return (
    <Button variant="outline" size="sm" asChild className="h-8">
      <a href={href} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="h-3 w-3 mr-2" />
        {label}
      </a>
    </Button>
  );
}

function LandownerCard({
  name,
  address,
  inheritance,
  correction,
  mortgage,
}: {
  name: string | null;
  address: string | null;
  inheritance: string | null;
  correction: string | null;
  mortgage: string | null;
}) {
  if (!name) return null;
  return (
    <div className="p-2 rounded-lg bg-muted/30 space-y-1">
      <div className="font-medium">{name}</div>
      {address && <div className="text-xs text-muted-foreground">住所: {address}</div>}
      <div className="flex flex-wrap gap-2 text-xs">
        <StatusBadge label="相続" status={inheritance} warningValue="有" />
        <StatusBadge label="更正登記" status={correction} warningValue="有" />
        <StatusBadge label="抵当権" status={mortgage} warningValue="有" dangerValue="有" />
      </div>
    </div>
  );
}

function StatusBadge({
  label,
  status,
  warningValue,
  dangerValue,
}: {
  label: string;
  status: string | null;
  warningValue?: string;
  dangerValue?: string;
}) {
  const bgClass =
    status === dangerValue
      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      : status === warningValue
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
      : status === "無"
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";

  return (
    <span className={cn("px-2 py-0.5 rounded-full", bgClass)}>
      {label}: {status || "未確認"}
    </span>
  );
}

function LandCategoryRow({ category, area }: { category: string | null; area: string | null }) {
  if (!category && !area) return null;
  return (
    <div className="flex items-center gap-2">
      <span>{category || "-"}</span>
      <span className="text-muted-foreground">:</span>
      <span>{area || "-"} ㎡</span>
    </div>
  );
}

function LegalStatusSummary({
  legalStatuses,
  hasSearchParams,
  onLegalTabClick,
}: {
  legalStatuses: string | null;
  hasSearchParams: boolean;
  onLegalTabClick: () => void;
}) {
  const parsed = legalStatuses
    ? (() => {
        try {
          return JSON.parse(legalStatuses) as Record<string, { status: string; note?: string }>;
        } catch {
          return null;
        }
      })()
    : null;

  if (parsed && Object.keys(parsed).length > 0) {
    const applicable = Object.entries(parsed).filter(([, v]) => v.status === "該当");
    const needsCheck = Object.entries(parsed).filter(([, v]) => v.status === "要確認");
    const notApplicable = Object.entries(parsed).filter(([, v]) => v.status === "非該当");

    return (
      <div className="space-y-2">
        {applicable.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-xs font-medium text-red-600 dark:text-red-400 mr-1">該当:</span>
            {applicable.map(([name]) => (
              <span key={name} className="text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                {name}
              </span>
            ))}
          </div>
        )}
        {needsCheck.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 mr-1">要確認:</span>
            {needsCheck.map(([name]) => (
              <span key={name} className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                {name}
              </span>
            ))}
          </div>
        )}
        {notApplicable.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-xs font-medium text-green-600 dark:text-green-400 mr-1">非該当:</span>
            {notApplicable.map(([name]) => (
              <span key={name} className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                {name}
              </span>
            ))}
          </div>
        )}
        {hasSearchParams && (
          <button
            className="block text-xs text-primary hover:underline"
            onClick={onLegalTabClick}
          >
            法令タブで詳細を確認・編集
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <span className="text-sm text-muted-foreground">法令情報は登録されていません</span>
      {hasSearchParams && (
        <button
          className="block text-xs text-primary hover:underline"
          onClick={onLegalTabClick}
        >
          法令タブで確認・登録
        </button>
      )}
    </div>
  );
}
