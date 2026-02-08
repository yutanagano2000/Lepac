"use client";

import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateJp } from "@/lib/timeline";
import { cn } from "@/lib/utils";

interface CreateTodoFormProps {
  content: string;
  onContentChange: (content: string) => void;
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  onDueDateChange: (date: string) => void;
  calendarOpen: boolean;
  onCalendarOpenChange: (open: boolean) => void;
  isCreating: boolean;
  onSubmit: () => void;
}

export function CreateTodoForm({
  content,
  onContentChange,
  selectedDate,
  onDateSelect,
  onDueDateChange,
  calendarOpen,
  onCalendarOpenChange,
  isCreating,
  onSubmit,
}: CreateTodoFormProps) {
  const handleDateSelect = (date: Date | undefined) => {
    onDateSelect(date);
    if (date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      onDueDateChange(`${y}-${m}-${d}`);
      onCalendarOpenChange(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Plus className="h-4 w-4" />
          TODOを追加
        </CardTitle>
        <CardDescription className="text-xs">
          案件に紐づかないTODOを作成できます
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="TODOの内容を入力"
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                onSubmit();
              }
            }}
          />
          <Popover open={calendarOpen} onOpenChange={onCalendarOpenChange}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full sm:w-[180px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? formatDateJp(selectedDate) : "期日を選択"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button
            onClick={onSubmit}
            disabled={!content.trim() || !selectedDate || isCreating}
          >
            {isCreating ? "作成中..." : "追加"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
