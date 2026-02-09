"use client";

import { useState, useMemo, useCallback } from "react";
import type { Meeting } from "@/db/schema";

export function useMeetingsData(initialMeetings: Meeting[]) {
  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMeetings = useMemo(() => {
    if (!searchQuery.trim()) return meetings;
    const q = searchQuery.toLowerCase();
    return meetings.filter((meeting) => {
      const title = (meeting.title ?? "").toLowerCase();
      const content = (meeting.content ?? "").toLowerCase();
      const agenda = (meeting.agenda ?? "").toLowerCase();
      const category = (meeting.category ?? "").toLowerCase();
      return (
        title.includes(q) ||
        content.includes(q) ||
        agenda.includes(q) ||
        category.includes(q)
      );
    });
  }, [meetings, searchQuery]);

  const fetchMeetings = useCallback(async () => {
    try {
      const res = await fetch("/api/meetings", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setMeetings(data);
      }
    } catch (err) {
      console.error("会議一覧の取得に失敗しました:", err);
    }
  }, []);

  return {
    meetings,
    filteredMeetings,
    searchQuery,
    setSearchQuery,
    fetchMeetings,
  };
}
