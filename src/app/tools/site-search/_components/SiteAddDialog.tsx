"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import {
  NOUSHIN_OPTIONS, CITY_PLANNING_OPTIONS,
  OWNER_INTENTION_OPTIONS, LAND_CATEGORY_OPTIONS,
} from "@/lib/site-scoring";

interface Props {
  onAdd: (data: Record<string, unknown>) => Promise<void>;
  csrfToken: string;
}

export function SiteAddDialog({ onAdd, csrfToken }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {};
    fd.forEach((v, k) => { if (v) data[k] = v; });
    data.isIdleFarmland = fd.get("isIdleFarmland") === "on";
    try {
      await onAdd(data);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />候補地を追加</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>候補地を追加</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="latitude">緯度 *</Label>
              <Input name="latitude" type="number" step="any" required placeholder="36.2345" />
            </div>
            <div>
              <Label htmlFor="longitude">経度 *</Label>
              <Input name="longitude" type="number" step="any" required placeholder="138.1234" />
            </div>
          </div>
          <div>
            <Label htmlFor="address">住所</Label>
            <Input name="address" placeholder="長野県長野市○○町1-2-3" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>地目</Label>
              <Select name="landCategory">
                <SelectTrigger><SelectValue placeholder="選択" /></SelectTrigger>
                <SelectContent>
                  {LAND_CATEGORY_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="areaSqm">面積（㎡）</Label>
              <Input name="areaSqm" type="number" step="any" placeholder="1200" />
            </div>
          </div>
          <div>
            <Label>農振区分</Label>
            <Select name="noushinClass">
              <SelectTrigger><SelectValue placeholder="選択" /></SelectTrigger>
              <SelectContent>
                {NOUSHIN_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>都市計画区分</Label>
            <Select name="cityPlanningClass">
              <SelectTrigger><SelectValue placeholder="選択" /></SelectTrigger>
              <SelectContent>
                {CITY_PLANNING_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>所有者意向</Label>
            <Select name="ownerIntention">
              <SelectTrigger><SelectValue placeholder="選択" /></SelectTrigger>
              <SelectContent>
                {OWNER_INTENTION_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="isIdleFarmland" id="isIdleFarmland" className="h-4 w-4" />
            <Label htmlFor="isIdleFarmland">遊休農地</Label>
          </div>
          <div>
            <Label>メモ</Label>
            <Textarea name="memo" rows={2} placeholder="補足情報を入力" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "追加中..." : "追加してスコア算出"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
