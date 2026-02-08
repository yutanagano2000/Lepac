"use client";

import { useState, useEffect } from "react";
import { normalizeCoordinateString } from "@/lib/coordinates";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Project } from "../../_types";

// ========================================
// Types
// ========================================

interface DetailFormData {
  address: string;
  coordinates: string;
  landowner1: string;
  landowner2: string;
  landowner3: string;
  landownerAddress1: string;
  landownerAddress2: string;
  landownerAddress3: string;
  inheritanceStatus1: string;
  inheritanceStatus2: string;
  inheritanceStatus3: string;
  correctionRegistration1: string;
  correctionRegistration2: string;
  correctionRegistration3: string;
  mortgageStatus1: string;
  mortgageStatus2: string;
  mortgageStatus3: string;
  landCategory1: string;
  landCategory2: string;
  landCategory3: string;
  landArea1: string;
  landArea2: string;
  landArea3: string;
  verticalSnowLoad: string;
  windSpeed: string;
  dococabiLink: string;
}

interface DetailEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onSave: (formData: DetailFormData) => Promise<void>;
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

function getInitialFormData(project: Project | null): DetailFormData {
  if (!project) {
    return {
      address: "",
      coordinates: "",
      landowner1: "",
      landowner2: "",
      landowner3: "",
      landownerAddress1: "",
      landownerAddress2: "",
      landownerAddress3: "",
      inheritanceStatus1: "",
      inheritanceStatus2: "",
      inheritanceStatus3: "",
      correctionRegistration1: "",
      correctionRegistration2: "",
      correctionRegistration3: "",
      mortgageStatus1: "",
      mortgageStatus2: "",
      mortgageStatus3: "",
      landCategory1: "",
      landCategory2: "",
      landCategory3: "",
      landArea1: "",
      landArea2: "",
      landArea3: "",
      verticalSnowLoad: "",
      windSpeed: "",
      dococabiLink: "",
    };
  }
  return {
    address: project.address ?? "",
    coordinates: project.coordinates ?? "",
    landowner1: project.landowner1 ?? "",
    landowner2: project.landowner2 ?? "",
    landowner3: project.landowner3 ?? "",
    landownerAddress1: project.landownerAddress1 ?? "",
    landownerAddress2: project.landownerAddress2 ?? "",
    landownerAddress3: project.landownerAddress3 ?? "",
    inheritanceStatus1: project.inheritanceStatus1 ?? "",
    inheritanceStatus2: project.inheritanceStatus2 ?? "",
    inheritanceStatus3: project.inheritanceStatus3 ?? "",
    correctionRegistration1: project.correctionRegistration1 ?? "",
    correctionRegistration2: project.correctionRegistration2 ?? "",
    correctionRegistration3: project.correctionRegistration3 ?? "",
    mortgageStatus1: project.mortgageStatus1 ?? "",
    mortgageStatus2: project.mortgageStatus2 ?? "",
    mortgageStatus3: project.mortgageStatus3 ?? "",
    landCategory1: project.landCategory1 ?? "",
    landCategory2: project.landCategory2 ?? "",
    landCategory3: project.landCategory3 ?? "",
    landArea1: project.landArea1 ?? "",
    landArea2: project.landArea2 ?? "",
    landArea3: project.landArea3 ?? "",
    verticalSnowLoad: project.verticalSnowLoad ?? "",
    windSpeed: project.windSpeed ?? "",
    dococabiLink: project.dococabiLink ?? "",
  };
}

// ========================================
// DetailEditDialog Component
// ========================================

export function DetailEditDialog({
  open,
  onOpenChange,
  project,
  onSave,
}: DetailEditDialogProps) {
  const [form, setForm] = useState<DetailFormData>(getInitialFormData(project));

  // ダイアログが開かれたときにprojectからフォームを初期化
  useEffect(() => {
    if (open && project) {
      setForm(getInitialFormData(project));
    }
  }, [open, project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>詳細情報を編集</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 現地住所 */}
          <div className="space-y-2">
            <Label htmlFor="address">現地住所</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="例: 長野県..."
            />
          </div>

          {/* 座標 */}
          <div className="space-y-2">
            <Label htmlFor="coordinates">座標</Label>
            <Input
              id="coordinates"
              value={form.coordinates}
              onChange={(e) => setForm({ ...form, coordinates: e.target.value })}
              onBlur={() => {
                const normalized = normalizeCoordinateString(form.coordinates);
                if (normalized) setForm({ ...form, coordinates: normalized });
              }}
              placeholder="例: 36.6485, 138.1942（スラッシュ区切りも可）"
            />
          </div>

          {/* 地権者 */}
          <div className="space-y-4">
            <Label>地権者</Label>
            <LandownerFormCard
              index={1}
              name={form.landowner1}
              address={form.landownerAddress1}
              inheritance={form.inheritanceStatus1}
              correction={form.correctionRegistration1}
              mortgage={form.mortgageStatus1}
              onNameChange={(v) => setForm({ ...form, landowner1: v })}
              onAddressChange={(v) => setForm({ ...form, landownerAddress1: v })}
              onInheritanceChange={(v) => setForm({ ...form, inheritanceStatus1: v })}
              onCorrectionChange={(v) => setForm({ ...form, correctionRegistration1: v })}
              onMortgageChange={(v) => setForm({ ...form, mortgageStatus1: v })}
            />
            <LandownerFormCard
              index={2}
              name={form.landowner2}
              address={form.landownerAddress2}
              inheritance={form.inheritanceStatus2}
              correction={form.correctionRegistration2}
              mortgage={form.mortgageStatus2}
              onNameChange={(v) => setForm({ ...form, landowner2: v })}
              onAddressChange={(v) => setForm({ ...form, landownerAddress2: v })}
              onInheritanceChange={(v) => setForm({ ...form, inheritanceStatus2: v })}
              onCorrectionChange={(v) => setForm({ ...form, correctionRegistration2: v })}
              onMortgageChange={(v) => setForm({ ...form, mortgageStatus2: v })}
            />
            <LandownerFormCard
              index={3}
              name={form.landowner3}
              address={form.landownerAddress3}
              inheritance={form.inheritanceStatus3}
              correction={form.correctionRegistration3}
              mortgage={form.mortgageStatus3}
              onNameChange={(v) => setForm({ ...form, landowner3: v })}
              onAddressChange={(v) => setForm({ ...form, landownerAddress3: v })}
              onInheritanceChange={(v) => setForm({ ...form, inheritanceStatus3: v })}
              onCorrectionChange={(v) => setForm({ ...form, correctionRegistration3: v })}
              onMortgageChange={(v) => setForm({ ...form, mortgageStatus3: v })}
            />
          </div>

          {/* 地目・土地の面積 */}
          <div className="space-y-2">
            <Label>地目・土地の面積</Label>
            <div className="space-y-2">
              <LandAreaRow
                category={form.landCategory1}
                area={form.landArea1}
                onCategoryChange={(v) => setForm({ ...form, landCategory1: v })}
                onAreaChange={(v) => setForm({ ...form, landArea1: v })}
              />
              <LandAreaRow
                category={form.landCategory2}
                area={form.landArea2}
                onCategoryChange={(v) => setForm({ ...form, landCategory2: v })}
                onAreaChange={(v) => setForm({ ...form, landArea2: v })}
              />
              <LandAreaRow
                category={form.landCategory3}
                area={form.landArea3}
                onCategoryChange={(v) => setForm({ ...form, landCategory3: v })}
                onAreaChange={(v) => setForm({ ...form, landArea3: v })}
              />
              <div className="flex justify-end items-center gap-2 pt-1 border-t">
                <span className="text-sm">合計:</span>
                <span className="font-medium">
                  {calculateTotalArea(form.landArea1, form.landArea2, form.landArea3)} ㎡
                </span>
              </div>
            </div>
          </div>

          {/* 環境データ */}
          <div className="space-y-2">
            <Label>環境データ</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="verticalSnowLoad" className="text-xs text-muted-foreground">
                  垂直積雪量
                </Label>
                <Input
                  id="verticalSnowLoad"
                  value={form.verticalSnowLoad}
                  onChange={(e) => setForm({ ...form, verticalSnowLoad: e.target.value })}
                  placeholder="例: 30cm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="windSpeed" className="text-xs text-muted-foreground">
                  風速
                </Label>
                <Input
                  id="windSpeed"
                  value={form.windSpeed}
                  onChange={(e) => setForm({ ...form, windSpeed: e.target.value })}
                  placeholder="例: 34m/s"
                />
              </div>
            </div>
          </div>

          {/* どこキャビ連携 */}
          <div className="space-y-2">
            <Label htmlFor="dococabiLink">どこキャビ連携URL</Label>
            <Input
              id="dococabiLink"
              value={form.dococabiLink}
              onChange={(e) => setForm({ ...form, dococabiLink: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit">保存</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ========================================
// Sub-components
// ========================================

function LandownerFormCard({
  index,
  name,
  address,
  inheritance,
  correction,
  mortgage,
  onNameChange,
  onAddressChange,
  onInheritanceChange,
  onCorrectionChange,
  onMortgageChange,
}: {
  index: number;
  name: string;
  address: string;
  inheritance: string;
  correction: string;
  mortgage: string;
  onNameChange: (v: string) => void;
  onAddressChange: (v: string) => void;
  onInheritanceChange: (v: string) => void;
  onCorrectionChange: (v: string) => void;
  onMortgageChange: (v: string) => void;
}) {
  return (
    <div className="p-3 border rounded-lg space-y-2">
      <div className="text-xs font-medium text-muted-foreground">地権者{index}</div>
      <Input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="氏名"
      />
      <Input
        value={address}
        onChange={(e) => onAddressChange(e.target.value)}
        placeholder="住所"
      />
      <div className="grid grid-cols-3 gap-2">
        <Select value={inheritance} onValueChange={onInheritanceChange}>
          <SelectTrigger className="text-xs">
            <SelectValue placeholder="相続" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="有">相続: 有</SelectItem>
            <SelectItem value="無">相続: 無</SelectItem>
            <SelectItem value="未確認">相続: 未確認</SelectItem>
          </SelectContent>
        </Select>
        <Select value={correction} onValueChange={onCorrectionChange}>
          <SelectTrigger className="text-xs">
            <SelectValue placeholder="更正登記" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="有">更正登記: 有</SelectItem>
            <SelectItem value="無">更正登記: 無</SelectItem>
            <SelectItem value="未確認">更正登記: 未確認</SelectItem>
          </SelectContent>
        </Select>
        <Select value={mortgage} onValueChange={onMortgageChange}>
          <SelectTrigger className="text-xs">
            <SelectValue placeholder="抵当権" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="有">抵当権: 有</SelectItem>
            <SelectItem value="無">抵当権: 無</SelectItem>
            <SelectItem value="未確認">抵当権: 未確認</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function LandAreaRow({
  category,
  area,
  onCategoryChange,
  onAreaChange,
}: {
  category: string;
  area: string;
  onCategoryChange: (v: string) => void;
  onAreaChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Select value={category} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-24">
          <SelectValue placeholder="地目" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="山林">山林</SelectItem>
          <SelectItem value="原野">原野</SelectItem>
          <SelectItem value="畑">畑</SelectItem>
          <SelectItem value="田">田</SelectItem>
        </SelectContent>
      </Select>
      <Input
        type="number"
        step="0.01"
        value={area}
        onChange={(e) => onAreaChange(e.target.value)}
        placeholder="面積（㎡）"
        className="flex-1"
      />
    </div>
  );
}

// 型をエクスポート
export type { DetailFormData };
