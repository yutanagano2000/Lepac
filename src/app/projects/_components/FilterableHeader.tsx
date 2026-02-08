"use client";

import { Filter, Search, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { formatCompletionMonthForFilter } from "./utils";

interface FilterableHeaderProps {
  columnKey: string;
  label: string;
  options: string[];
  selected: Set<string>;
  setSelected: React.Dispatch<React.SetStateAction<Set<string>>>;
  filterOpen: string | null;
  setFilterOpen: (key: string | null) => void;
  filterSearchQuery: string;
  setFilterSearchQuery: (query: string) => void;
  toggleSelection: (
    value: string,
    selectedSet: Set<string>,
    setSelectedSet: React.Dispatch<React.SetStateAction<Set<string>>>
  ) => void;
  selectAll: (
    options: string[],
    setSelectedSet: React.Dispatch<React.SetStateAction<Set<string>>>
  ) => void;
  clearAll: (setSelectedSet: React.Dispatch<React.SetStateAction<Set<string>>>) => void;
  getFilteredOptions: (options: string[], searchQuery: string) => string[];
}

export function FilterableHeader({
  columnKey,
  label,
  options,
  selected,
  setSelected,
  filterOpen,
  setFilterOpen,
  filterSearchQuery,
  setFilterSearchQuery,
  toggleSelection,
  selectAll,
  clearAll,
  getFilteredOptions,
}: FilterableHeaderProps) {
  const filteredOptions = getFilteredOptions(options, filterSearchQuery);

  return (
    <Popover
      open={filterOpen === columnKey}
      onOpenChange={(open) => {
        setFilterOpen(open ? columnKey : null);
        if (!open) setFilterSearchQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto p-1 text-xs font-semibold hover:text-foreground justify-start gap-1 whitespace-nowrap",
            selected.size > 0 && "text-primary"
          )}
        >
          <Filter className={cn("h-3 w-3", selected.size > 0 && "text-primary")} />
          {label}
          <ChevronDown className="h-2 w-2" />
          {selected.size > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[9px]">
              {selected.size}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-2 border-b">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="検索..."
              value={filterSearchQuery}
              onChange={(e) => setFilterSearchQuery(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectAll(filteredOptions, setSelected)}
              className="h-6 text-xs flex-1"
            >
              全選択
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearAll(setSelected)}
              className="h-6 text-xs flex-1"
            >
              全解除
            </Button>
          </div>
        </div>
        <ScrollArea className="h-[200px]">
          <div className="p-1">
            {filteredOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                見つかりません
              </p>
            ) : (
              filteredOptions.map((value) => (
                <div
                  key={value}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
                  onClick={() => toggleSelection(value, selected, setSelected)}
                >
                  <Checkbox
                    checked={selected.has(value)}
                    onCheckedChange={() => toggleSelection(value, selected, setSelected)}
                    className="h-3 w-3"
                  />
                  <span className="text-xs truncate">
                    {columnKey === "completionMonth" && value !== "未設定"
                      ? formatCompletionMonthForFilter(value)
                      : value}
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <div className="p-2 border-t">
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setFilterOpen(null);
              setFilterSearchQuery("");
            }}
            className="w-full h-7 text-xs"
          >
            適用 ({selected.size}件選択中)
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
