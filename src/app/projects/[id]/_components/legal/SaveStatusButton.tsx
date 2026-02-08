"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SaveStatusButtonProps {
  isSaving: boolean;
  hasChanges: boolean;
  onSave: () => void;
}

export function SaveStatusButton({ isSaving, hasChanges, onSave }: SaveStatusButtonProps) {
  return (
    <div className="flex justify-end">
      <Button onClick={onSave} disabled={isSaving || !hasChanges}>
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            保存中...
          </>
        ) : (
          "ステータスを保存"
        )}
      </Button>
    </div>
  );
}
