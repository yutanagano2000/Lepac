"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TodoItem } from "./TodoItem";
import type { TodoWithProject } from "@/components/HomeTodosView";

interface TodoSectionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  items: TodoWithProject[];
  emptyMessage: string;
  badge?: React.ReactNode;
  onReopen: (todo: TodoWithProject) => void;
  onDelete: (todoId: number) => void;
}

export function TodoSection({
  title,
  description,
  icon: Icon,
  items,
  emptyMessage,
  badge,
  onReopen,
  onDelete,
}: TodoSectionProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {title}
          </CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
        {badge}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{emptyMessage}</p>
        ) : (
          <div className="space-y-2">
            {items.map((todo) => (
              <TodoItem key={todo.id} todo={todo} onReopen={onReopen} onDelete={onDelete} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
