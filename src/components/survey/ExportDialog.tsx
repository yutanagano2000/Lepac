"use client";

import { useState, useRef, useEffect } from "react";
import { Download, FileImage, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import type { SlopeStats, CrossSectionPoint } from "@/lib/slope-analysis";

interface ExportDialogProps {
  stats: SlopeStats;
  totalPoints: number;
  crossSection: CrossSectionPoint[] | null;
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  surfaceContainerRef: React.RefObject<HTMLDivElement | null>;
  projectName?: string;
}

export function ExportDialog({
  stats,
  totalPoints,
  crossSection,
  mapContainerRef,
  surfaceContainerRef,
  projectName,
}: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);

  const handleExportPng = async () => {
    if (!mapContainerRef.current) return;

    setExporting("png");
    try {
      const dataUrl = await toPng(mapContainerRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });

      const link = document.createElement("a");
      link.download = `slope-analysis-${projectName || "export"}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      setOpen(false);
    } catch (error) {
      console.error("PNG export failed:", error);
      alert("画像のエクスポートに失敗しました");
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    setExporting("pdf");

    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      let yPosition = 20;

      // タイトル
      pdf.setFontSize(18);
      pdf.text("傾斜解析レポート", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 10;

      // 日時
      pdf.setFontSize(10);
      pdf.text(`作成日時: ${new Date().toLocaleString("ja-JP")}`, margin, yPosition);
      if (projectName) {
        yPosition += 6;
        pdf.text(`案件: ${projectName}`, margin, yPosition);
      }
      yPosition += 12;

      // 解析概要
      pdf.setFontSize(14);
      pdf.text("解析概要", margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      const summaryData = [
        ["グリッド間隔", "2m"],
        ["解析ポイント数", `${totalPoints.toLocaleString()}点`],
        ["平均傾斜", `${stats.avgSlope?.toFixed(1) ?? "-"}°`],
        ["最大傾斜", `${stats.maxSlope?.toFixed(1) ?? "-"}°`],
        ["最小傾斜", `${stats.minSlope?.toFixed(1) ?? "-"}°`],
        ["平坦エリア (<3°)", `${stats.flatPercent?.toFixed(1) ?? "-"}%`],
        ["急傾斜エリア (>15°)", `${stats.steepPercent?.toFixed(1) ?? "-"}%`],
      ];

      summaryData.forEach(([label, value]) => {
        pdf.text(`${label}: ${value}`, margin + 5, yPosition);
        yPosition += 6;
      });

      yPosition += 8;

      // 標高統計
      pdf.setFontSize(14);
      pdf.text("標高統計", margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      const elevationData = [
        ["平均標高", `${stats.avgElevation?.toFixed(1) ?? "-"}m`],
        ["最高標高", `${stats.maxElevation?.toFixed(1) ?? "-"}m`],
        ["最低標高", `${stats.minElevation?.toFixed(1) ?? "-"}m`],
        ["高低差", `${((stats.maxElevation ?? 0) - (stats.minElevation ?? 0)).toFixed(1)}m`],
      ];

      elevationData.forEach(([label, value]) => {
        pdf.text(`${label}: ${value}`, margin + 5, yPosition);
        yPosition += 6;
      });

      yPosition += 8;

      // 傾斜凡例
      pdf.setFontSize(14);
      pdf.text("傾斜分類", margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      const slopeLevels = [
        { label: "平坦", range: "< 3°", color: [34, 197, 94] },
        { label: "緩やか", range: "3-8°", color: [234, 179, 8] },
        { label: "やや急", range: "8-15°", color: [249, 115, 22] },
        { label: "急", range: "15-30°", color: [239, 68, 68] },
        { label: "非常に急", range: "> 30°", color: [127, 29, 29] },
      ];

      slopeLevels.forEach(({ label, range, color }) => {
        pdf.setFillColor(color[0], color[1], color[2]);
        pdf.rect(margin + 5, yPosition - 4, 6, 6, "F");
        pdf.text(`${label} (${range})`, margin + 15, yPosition);
        yPosition += 8;
      });

      yPosition += 8;

      // 地図画像を追加
      if (mapContainerRef.current) {
        try {
          const mapDataUrl = await toPng(mapContainerRef.current, {
            backgroundColor: "#ffffff",
            pixelRatio: 2,
          });

          const imgWidth = pageWidth - margin * 2;
          const imgHeight = 80;

          if (yPosition + imgHeight > 280) {
            pdf.addPage();
            yPosition = 20;
          }

          pdf.setFontSize(14);
          pdf.text("解析マップ", margin, yPosition);
          yPosition += 8;

          pdf.addImage(mapDataUrl, "PNG", margin, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 10;
        } catch {
          // マップ画像の追加に失敗しても続行
        }
      }

      // 3D画像を追加
      if (surfaceContainerRef.current) {
        try {
          const surfaceDataUrl = await toPng(surfaceContainerRef.current, {
            backgroundColor: "#ffffff",
            pixelRatio: 2,
          });

          const imgWidth = pageWidth - margin * 2;
          const imgHeight = 60;

          if (yPosition + imgHeight > 280) {
            pdf.addPage();
            yPosition = 20;
          }

          pdf.setFontSize(14);
          pdf.text("3D地形ビュー", margin, yPosition);
          yPosition += 8;

          pdf.addImage(surfaceDataUrl, "PNG", margin, yPosition, imgWidth, imgHeight);
        } catch {
          // 3D画像の追加に失敗しても続行
        }
      }

      pdf.save(`slope-report-${projectName || "export"}-${Date.now()}.pdf`);
      setOpen(false);
    } catch (error) {
      console.error("PDF export failed:", error);
      alert("PDFのエクスポートに失敗しました");
    } finally {
      setExporting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" />
          エクスポート
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>解析結果をエクスポート</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          <Button
            variant="outline"
            className="justify-start h-14"
            onClick={handleExportPng}
            disabled={exporting !== null}
          >
            {exporting === "png" ? (
              <Loader2 className="h-5 w-5 mr-3 animate-spin" />
            ) : (
              <FileImage className="h-5 w-5 mr-3 text-blue-500" />
            )}
            <div className="text-left">
              <div className="font-medium">画像としてエクスポート</div>
              <div className="text-xs text-muted-foreground">PNG形式でマップを保存</div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="justify-start h-14"
            onClick={handleExportPdf}
            disabled={exporting !== null}
          >
            {exporting === "pdf" ? (
              <Loader2 className="h-5 w-5 mr-3 animate-spin" />
            ) : (
              <FileText className="h-5 w-5 mr-3 text-red-500" />
            )}
            <div className="text-left">
              <div className="font-medium">PDFレポートを作成</div>
              <div className="text-xs text-muted-foreground">統計情報を含む詳細レポート</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
