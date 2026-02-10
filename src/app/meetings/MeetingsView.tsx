"use client";

import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Meeting } from "@/db/schema";
import { useMeetingsData, useMeetingsActions } from "./_hooks";
import { MeetingDialog, MeetingsTable } from "./_components";

interface MeetingsViewProps {
  initialMeetings: Meeting[];
}

export default function MeetingsView({ initialMeetings }: MeetingsViewProps) {
  const {
    filteredMeetings,
    searchQuery,
    setSearchQuery,
    fetchMeetings,
  } = useMeetingsData(initialMeetings);

  const {
    form,
    updateForm,
    selectedDate,
    calendarOpen,
    setCalendarOpen,
    dialogOpen,
    setDialogOpen,
    isSubmitting,
    handleSubmit,
    handleDateSelect,
  } = useMeetingsActions({ onRefresh: fetchMeetings });

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6">
      <div className="mx-auto max-w-5xl py-6 sm:py-10">
        <div className="space-y-4 sm:space-y-6">
          {/* ヘッダー */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex items-center justify-between sm:block">
              <div className="space-y-1 shrink-0">
                <h1 className="text-lg sm:text-xl font-semibold">会議</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  議事録を保存・確認できます
                </p>
              </div>
              {/* モバイル用新規登録ボタン */}
              <Button size="sm" className="sm:hidden" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                新規
              </Button>
            </div>

            <div className="relative flex-1 sm:max-w-xl order-last sm:order-none">
              <Search className="absolute left-3 sm:left-4 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="タイトル・内容・議題・種別で検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 sm:pl-12 h-10 sm:h-12 text-sm sm:text-base bg-muted/50 border-0 focus-visible:ring-2 rounded-xl"
              />
            </div>

            {/* デスクトップ用新規登録ボタン */}
            <Button className="hidden sm:flex" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              新規登録
            </Button>

            <MeetingDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              form={form}
              onFormChange={updateForm}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              calendarOpen={calendarOpen}
              onCalendarOpenChange={setCalendarOpen}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
            />
          </div>

          <MeetingsTable meetings={filteredMeetings} searchQuery={searchQuery} />
        </div>
      </div>
    </div>
  );
}
