"use client";

import { Folder, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import type { FolderInfo } from "../_types";

interface FolderListCardProps {
  folders: FolderInfo[];
  selectedFolders: Set<string>;
  validFoldersCount: number;
  importing: boolean;
  onToggleFolder: (folderName: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onShowConfirmDialog: () => void;
}

export function FolderListCard({
  folders,
  selectedFolders,
  validFoldersCount,
  importing,
  onToggleFolder,
  onSelectAll,
  onClearSelection,
  onShowConfirmDialog,
}: FolderListCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">フォルダ一覧</CardTitle>
            <CardDescription>
              {validFoldersCount}件のインポート可能なフォルダ（全{folders.length}
              件中）
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onSelectAll}>
              全選択
            </Button>
            <Button variant="outline" size="sm" onClick={onClearSelection}>
              全解除
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {folders.map((folder, index) => {
              const isValid = folder.managementNumber && folder.projectNumber;
              const isSelected = selectedFolders.has(folder.folderName);

              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : isValid
                        ? "hover:bg-muted/50"
                        : "opacity-50"
                  }`}
                  onClick={() => isValid && onToggleFolder(folder.folderName)}
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={!isValid}
                    onCheckedChange={() =>
                      isValid && onToggleFolder(folder.folderName)
                    }
                  />
                  <Folder
                    className={`h-5 w-5 shrink-0 ${isValid ? "text-blue-500" : "text-zinc-400"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {folder.folderName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {folder.managementNumber && (
                        <Badge variant="outline" className="text-xs">
                          {folder.managementNumber}
                        </Badge>
                      )}
                      {folder.manager && (
                        <Badge variant="secondary" className="text-xs">
                          {folder.manager}
                        </Badge>
                      )}
                      {folder.projectNumber && (
                        <Badge variant="secondary" className="text-xs">
                          {folder.projectNumber}
                        </Badge>
                      )}
                      {folder.note && (
                        <span className="text-xs text-muted-foreground truncate">
                          {folder.note}
                        </span>
                      )}
                    </div>
                  </div>
                  {!isValid && (
                    <Badge variant="destructive" className="text-xs shrink-0">
                      解析不可
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {selectedFolders.size}件を選択中
          </p>
          <Button
            onClick={onShowConfirmDialog}
            disabled={selectedFolders.size === 0 || importing}
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                インポート中...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                選択した案件をインポート
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
