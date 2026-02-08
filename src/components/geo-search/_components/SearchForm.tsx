"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface SearchFormProps {
  coordinateInput: string;
  onCoordinateInputChange: (value: string) => void;
  prefecture: string;
  onPrefectureChange: (value: string) => void;
  latitude: string;
  longitude: string;
  isLoading: boolean;
  onSearch: () => void;
}

export function SearchForm({
  coordinateInput,
  onCoordinateInputChange,
  prefecture,
  onPrefectureChange,
  latitude,
  longitude,
  isLoading,
  onSearch,
}: SearchFormProps) {
  return (
    <div className="bg-card rounded-4xl border border-border shadow-lg p-8 space-y-6">
      {/* 座標入力 */}
      <div className="space-y-2">
        <label htmlFor="coordinate" className="text-sm font-medium text-foreground">
          座標（緯度,経度 または 緯度/経度）
        </label>
        <Input
          id="coordinate"
          type="text"
          placeholder="例: 34.580590,133.457655"
          value={coordinateInput}
          onChange={(e) => onCoordinateInputChange(e.target.value)}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          緯度と経度をカンマまたはスラッシュ区切りで入力してください
        </p>
      </div>

      {/* 都道府県選択 */}
      <div className="space-y-2">
        <label htmlFor="prefecture" className="text-sm font-medium text-foreground">
          都道府県
        </label>
        <Select value={prefecture} onValueChange={onPrefectureChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="都道府県を選択してください" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hiroshima">広島県</SelectItem>
            <SelectItem value="okayama">岡山県</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 検索ボタン */}
      <div className="pt-2">
        <Button
          onClick={onSearch}
          size="lg"
          className="w-full"
          disabled={!latitude || !longitude || !prefecture || isLoading}
        >
          {isLoading ? "検索中..." : "検索"}
        </Button>
      </div>
    </div>
  );
}
