"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkflowBuilder } from "../_components/WorkflowBuilder";
import { toast } from "sonner";
import type { Node, Edge } from "@xyflow/react";

const categories = ["確認申請", "届出", "許可申請", "検査", "その他"];

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditWorkflowPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("確認申請（太陽光）");
  const [description, setDescription] = useState(
    "太陽光発電所の確認申請ワークフロー"
  );
  const [category, setCategory] = useState("確認申請");
  const [estimatedMinutes, setEstimatedMinutes] = useState("120");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSave = async (nodes: Node[], edges: Edge[]) => {
    if (!name.trim()) {
      toast.error("ワークフロー名を入力してください");
      return;
    }

    const workflow = {
      id,
      name,
      description,
      category,
      estimatedMinutes: parseInt(estimatedMinutes),
      nodes,
      edges,
    };

    console.log("Updating workflow:", workflow);
    toast.success("ワークフローを更新しました");
    router.push("/workflows");
  };

  if (!mounted) {
    return (
      <div className="p-6 flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Link href="/workflows">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">ワークフロー編集</h1>
          <p className="text-muted-foreground">ID: {id}</p>
        </div>
      </div>

      {/* 基本情報 */}
      <div className="grid gap-4 md:grid-cols-4 border rounded-lg p-4 bg-muted/30">
        <div className="space-y-2">
          <Label htmlFor="name">ワークフロー名 *</Label>
          <Input
            id="name"
            placeholder="例: 確認申請（太陽光）"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">カテゴリ</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="選択..." />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="time">想定時間（分）</Label>
          <Input
            id="time"
            type="number"
            placeholder="60"
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(e.target.value)}
          />
        </div>
        <div className="space-y-2 md:col-span-1">
          <Label htmlFor="description">説明</Label>
          <Textarea
            id="description"
            placeholder="ワークフローの説明..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-[38px] min-h-[38px]"
          />
        </div>
      </div>

      {/* ワークフロービルダー */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">ワークフロー設計</h2>
          <div className="text-sm text-muted-foreground">
            ドラッグ＆ドロップでノードを接続
          </div>
        </div>
        <WorkflowBuilder workflowId={id} onSave={handleSave} />
      </div>
    </div>
  );
}
