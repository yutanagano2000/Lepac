"use client";

import Link from "next/link";
import { FileText, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const tools = [
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
] as const;

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-background px-6">
      <div className="mx-auto max-w-5xl py-10">
        <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">ツール</h1>
            <p className="text-sm text-muted-foreground">
              業務で使う便利機能を集約しています
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
