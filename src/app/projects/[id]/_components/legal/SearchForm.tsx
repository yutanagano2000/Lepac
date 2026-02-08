"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SearchFormProps {
  coordinateInput: string;
  onCoordinateInput: (value: string) => void;
  prefecture: string;
  onPrefectureChange: (value: string) => void;
  onSearch: () => void;
  isLoading: boolean;
  isDisabled: boolean;
}

export function SearchForm({
  coordinateInput,
  onCoordinateInput,
  prefecture,
  onPrefectureChange,
  onSearch,
  isLoading,
  isDisabled,
}: SearchFormProps) {
  return (
    <div className="bg-card rounded-4xl border border-border shadow-lg p-8 space-y-6">
      <div className="space-y-2">
        <label htmlFor="coordinate" className="text-sm font-medium text-foreground">
          座標（緯度,経度 または 緯度/経度）
        </label>
        <Input
          id="coordinate"
          type="text"
          placeholder="例: 34.580590,133.457655 または 34.58/133.45"
          value={coordinateInput}
          onChange={(e) => onCoordinateInput(e.target.value)}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          緯度と経度をカンマまたはスラッシュ区切りで入力してください
        </p>
      </div>

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

      <div className="pt-2">
        <Button
          onClick={onSearch}
          size="lg"
          className="w-full"
          disabled={isDisabled || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              検索中...
            </>
          ) : (
            "検索"
          )}
        </Button>
      </div>
    </div>
  );
}
