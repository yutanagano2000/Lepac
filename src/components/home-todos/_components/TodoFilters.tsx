"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TodoFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  projectFilter: string;
  onProjectFilterChange: (filter: string) => void;
  projectOptions: string[];
}

export function TodoFilters({
  searchQuery,
  onSearchChange,
  projectFilter,
  onProjectFilterChange,
  projectOptions,
}: TodoFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="内容で検索"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={projectFilter} onValueChange={onProjectFilterChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="案件で絞り込み" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべての案件</SelectItem>
          {projectOptions.map((mn) => (
            <SelectItem key={mn} value={mn}>
              {mn}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
