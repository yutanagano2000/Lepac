"use client";

import { memo } from "react";
import { Search, Filter, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ProjectWithProgress } from "../_types";

interface FilterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectWithProgress[];
  selectedProjectIds: Set<number>;
  filterSearchQuery: string;
  onFilterSearchChange: (query: string) => void;
  onToggleProject: (projectId: number) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

function FilterPanelComponent({
  open,
  onOpenChange,
  projects,
  selectedProjectIds,
  filterSearchQuery,
  onFilterSearchChange,
  onToggleProject,
  onSelectAll,
  onClearAll,
}: FilterPanelProps) {
  const isFiltered = selectedProjectIds.size > 0;

  // フィルター内の検索でフィルタリングされた案件リスト
  const filterableProjects = filterSearchQuery.trim()
    ? projects.filter(
        (p) =>
          p.managementNumber.toLowerCase().includes(filterSearchQuery.toLowerCase()) ||
          p.client.toLowerCase().includes(filterSearchQuery.toLowerCase())
      )
    : projects;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto p-2 font-semibold text-muted-foreground hover:text-foreground justify-start gap-2 text-sm",
            isFiltered && "text-primary"
          )}
        >
          <Filter className={cn("h-4 w-4", isFiltered && "text-primary")} />
          案件
          <ChevronDown className="h-3 w-3" />
          {isFiltered && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {selectedProjectIds.size}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="案件を検索..."
              value={filterSearchQuery}
              onChange={(e) => onFilterSearchChange(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectAll}
              className="h-7 text-xs flex-1"
            >
              全選択
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearAll}
              className="h-7 text-xs flex-1"
            >
              全解除
            </Button>
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-2">
            {filterableProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                案件が見つかりません
              </p>
            ) : (
              filterableProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center gap-3 px-2 py-2 rounded hover:bg-muted/50 cursor-pointer"
                  onClick={() => onToggleProject(project.id)}
                >
                  <Checkbox
                    checked={selectedProjectIds.has(project.id)}
                    onCheckedChange={() => onToggleProject(project.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {project.managementNumber}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {project.client}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <div className="p-2 border-t">
          <Button
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full h-8"
          >
            適用 ({selectedProjectIds.size}件選択中)
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const FilterPanel = memo(FilterPanelComponent);
