"use client";

import { ExternalLink, FileText, CheckSquare, Send, Navigation, Edit } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CurrentTask, TaskType } from "../_types";

interface TaskCardProps {
  task: CurrentTask;
}

const taskTypeConfig: Record<TaskType, { icon: React.ElementType; label: string; color: string }> = {
  input: { icon: Edit, label: "入力", color: "bg-blue-500" },
  document: { icon: FileText, label: "書類確認", color: "bg-purple-500" },
  check: { icon: CheckSquare, label: "チェック", color: "bg-green-500" },
  submit: { icon: Send, label: "提出", color: "bg-orange-500" },
  navigate: { icon: Navigation, label: "移動", color: "bg-gray-500" },
};

export function TaskCard({ task }: TaskCardProps) {
  const config = taskTypeConfig[task.taskType];
  const Icon = config.icon;

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={`${config.color} text-white`}>
              <Icon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
            {task.estimatedMinutes && (
              <Badge variant="outline">
                目安: {task.estimatedMinutes}分
              </Badge>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            ステップ {task.stepOrder}
          </span>
        </div>
        <CardTitle className="text-xl mt-2">{task.title}</CardTitle>
        {task.instruction && (
          <CardDescription className="text-base whitespace-pre-wrap">
            {task.instruction}
          </CardDescription>
        )}
      </CardHeader>

      {task.targetUrl && (
        <CardContent>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => window.open(task.targetUrl!, "_blank")}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            関連ページを開く
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
