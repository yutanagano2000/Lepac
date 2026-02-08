"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// テキスト入力ダイアログ
interface TextInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (text: string) => void;
  title?: string;
  placeholder?: string;
  initialValue?: string;
}

export function TextInputDialog({
  open,
  onOpenChange,
  onSubmit,
  title = "テキストを入力",
  placeholder = "テキストを入力...",
  initialValue = "",
}: TextInputDialogProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
    }
  }, [open, initialValue]);

  const handleSubmit = useCallback(() => {
    if (value.trim()) {
      onSubmit(value.trim());
      onOpenChange(false);
    }
  }, [value, onSubmit, onOpenChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={!value.trim()}>
            追加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 引き出し線入力ダイアログ（郵便番号 + 住所）
interface LeaderInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (postalCode: string, address: string) => void;
  initialPostalCode?: string;
  initialAddress?: string;
  isEditing?: boolean;
}

export function LeaderInputDialog({
  open,
  onOpenChange,
  onSubmit,
  initialPostalCode = "",
  initialAddress = "",
  isEditing = false,
}: LeaderInputDialogProps) {
  const [postalCode, setPostalCode] = useState(initialPostalCode);
  const [address, setAddress] = useState(initialAddress);

  useEffect(() => {
    if (open) {
      setPostalCode(initialPostalCode);
      setAddress(initialAddress);
    }
  }, [open, initialPostalCode, initialAddress]);

  const handleSubmit = useCallback(() => {
    if (postalCode.trim() || address.trim()) {
      onSubmit(postalCode.trim(), address.trim());
      onOpenChange(false);
    }
  }, [postalCode, address, onSubmit, onOpenChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "住所ボックスを編集" : "引き出し線を追加"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="postalCode">郵便番号</Label>
            <Input
              id="postalCode"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="例: 730-0001"
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">住所</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="例: 広島県広島市中区大手町1-1-1"
              onKeyDown={handleKeyDown}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Ctrl + Enter で確定
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!postalCode.trim() && !address.trim()}
          >
            {isEditing ? "更新" : "追加"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
