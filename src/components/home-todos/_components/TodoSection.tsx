"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { TodoWithProject } from "../_types";
import { TodoItem } from "./TodoItem";

interface TodoSectionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  items: TodoWithProject[];
  emptyMessage: string;
  badge?: React.ReactNode;
  onDelete: (todoId: number) => void;
  onReopen: (todo: TodoWithProject) => void;
}

export function TodoSection({
  title,
  description,
  icon: Icon,
  items,
  emptyMessage,
  badge,
  onDelete,
  onReopen,
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
          <p className="text-sm text-muted-foreground py-4 text-center">
            {emptyMessage}
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onDelete={onDelete}
                onReopen={onReopen}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
