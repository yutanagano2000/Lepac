"use client";

import Link from "next/link";
import { FileText, Mail, Users, MapPin, CalendarDays, Scale, Upload, Folder, PenTool } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const tools = [
  {
    href: "/meetings",
    label: "会議",
    description: "議事録の作成・閲覧",
    icon: Users,
  },
  {
    href: "/map",
    label: "マップ",
    description: "座標変換・各種マップへのリンク",
    icon: MapPin,
  },
  {
    href: "/schedule",
    label: "スケジュール",
    description: "案件のスケジュール管理",
    icon: CalendarDays,
  },
  {
    href: "/legal",
    label: "法令確認",
    description: "法令に関する確認・検索",
    icon: Scale,
  },
  {
    href: "/tools/filename",
    label: "ファイル名生成",
    description: "書類・氏名・日付からファイル名を生成",
    icon: FileText,
  },
  {
    href: "/tools/mail",
    label: "メール文面生成",
    description: "質問に答えてメール文面を自動生成",
    icon: Mail,
  },
  {
    href: "/import",
    label: "案件一括インポート",
    description: "どこでもキャビネットから案件を一括登録",
    icon: Upload,
  },
  {
    href: "/touhon",
    label: "謄本検索",
    description: "登記簿謄本を住所で検索",
    icon: Folder,
  },
  {
    href: "/map-editor",
    label: "現場案内図",
    description: "地図上で筆界をトレースして案内図を作成",
    icon: PenTool,
  },
] as const;

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-background px-4 sm:px-6">
      <div className="mx-auto max-w-5xl py-6 sm:py-10">
        <div className="space-y-4 sm:space-y-6">
          <div className="space-y-1">
            <h1 className="text-lg sm:text-xl font-semibold">ツール</h1>
            <p className="text-sm text-muted-foreground">
              業務で使う便利機能を集約しています
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link key={tool.href} href={tool.href}>
                  <Card className="h-full transition-colors hover:bg-accent cursor-pointer">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        {tool.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {tool.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
