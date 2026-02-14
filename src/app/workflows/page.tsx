"use client";

import { useState } from "react";
import { Plus, Search, MoreHorizontal, Play, Edit, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

// サンプルデータ
const sampleWorkflows = [
  {
    id: "1",
    name: "確認申請（太陽光）",
    description: "太陽光発電所の確認申請ワークフロー",
    category: "確認申請",
    stepsCount: 8,
    estimatedMinutes: 120,
    isActive: true,
    usageCount: 45,
  },
  {
    id: "2",
    name: "農地転用届出",
    description: "農地転用の届出手続きワークフロー",
    category: "届出",
    stepsCount: 5,
    estimatedMinutes: 60,
    isActive: true,
    usageCount: 23,
  },
  {
    id: "3",
    name: "林地開発許可",
    description: "林地開発許可申請のワークフロー",
    category: "許可申請",
    stepsCount: 12,
    estimatedMinutes: 180,
    isActive: false,
    usageCount: 8,
  },
];

export default function WorkflowsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [workflows] = useState(sampleWorkflows);

  const filteredWorkflows = workflows.filter(
    (wf) =>
      wf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wf.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ワークフロー</h1>
          <p className="text-muted-foreground">
            申請・届出のワークフローテンプレートを管理
          </p>
        </div>
        <Link href="/workflows/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            新規作成
          </Button>
        </Link>
      </div>

      {/* 検索 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ワークフローを検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* ワークフロー一覧 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredWorkflows.map((workflow) => (
          <Card key={workflow.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{workflow.name}</CardTitle>
                  <CardDescription>{workflow.description}</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/workflows/${workflow.id}`}>
                        <Edit className="h-4 w-4 mr-2" />
                        編集
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="h-4 w-4 mr-2" />
                      複製
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      削除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary">{workflow.category}</Badge>
                <Badge variant={workflow.isActive ? "default" : "outline"}>
                  {workflow.isActive ? "有効" : "無効"}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground">
                    {workflow.stepsCount}
                  </div>
                  <div>ステップ</div>
                </div>
                <div>
                  <div className="font-medium text-foreground">
                    {workflow.estimatedMinutes}分
                  </div>
                  <div>目安時間</div>
                </div>
                <div>
                  <div className="font-medium text-foreground">
                    {workflow.usageCount}
                  </div>
                  <div>使用回数</div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Link href={`/workflows/${workflow.id}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    <Edit className="h-4 w-4 mr-2" />
                    編集
                  </Button>
                </Link>
                <Button variant="secondary">
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredWorkflows.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>ワークフローが見つかりません</p>
        </div>
      )}
    </div>
  );
}
