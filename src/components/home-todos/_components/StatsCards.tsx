"use client";

import {
  AlertCircle,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { GroupedTodos } from "../_types";

interface StatsCardsProps {
  grouped: GroupedTodos;
}

export function StatsCards({ grouped }: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">超過</p>
              <p className="text-2xl font-bold">{grouped.overdue.length}</p>
            </div>
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">今日</p>
              <p className="text-2xl font-bold">{grouped.today.length}</p>
            </div>
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">３日以内</p>
              <p className="text-2xl font-bold">{grouped.upcoming.length}</p>
            </div>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">完了</p>
              <p className="text-2xl font-bold">{grouped.completed.length}</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
