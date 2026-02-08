"use client";

import { useState, useCallback } from "react";

/**
 * 日付をYYYY.M.D形式でフォーマット
 */
export function formatYyyyMd(date: Date | undefined): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}.${m}.${d}`;
}

/**
 * YYYY.M.D または YYYY/M/D 形式の文字列をDateにパース
 * 無効な形式の場合はnullを返す
 */
export function parseDateText(text: string): Date | null {
  const match = text.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})$/);
  if (!match) return null;

  const [, y, m, d] = match;
  const parsed = new Date(Number(y), Number(m) - 1, Number(d));
  return isNaN(parsed.getTime()) ? null : parsed;
}

interface UseDatePickerOptions {
  /** 初期日付 */
  initialDate?: Date;
  /** 日付変更時のコールバック */
  onChange?: (date: Date | undefined) => void;
}

interface UseDatePickerReturn {
  /** 現在の日付 */
  date: Date | undefined;
  /** テキスト入力値 */
  text: string;
  /** カレンダーポップオーバーの開閉状態 */
  isOpen: boolean;
  /** ポップオーバー開閉を制御 */
  setIsOpen: (open: boolean) => void;
  /** テキスト入力変更ハンドラ */
  onTextChange: (value: string) => void;
  /** カレンダー選択ハンドラ */
  onCalendarSelect: (date: Date | undefined) => void;
  /** 日付を直接設定（外部からの更新用） */
  setDate: (date: Date | undefined) => void;
  /** テキストを直接設定（外部からの更新用） */
  setText: (text: string) => void;
  /** 日付をリセット */
  reset: () => void;
}

/**
 * Calendar + テキスト入力の同期を行う汎用フック
 *
 * @example
 * ```tsx
 * const datePicker = useDatePicker({
 *   initialDate: form.date,
 *   onChange: (date) => setForm({ ...form, date }),
 * });
 *
 * <Input
 *   value={datePicker.text}
 *   onChange={(e) => datePicker.onTextChange(e.target.value)}
 *   placeholder="例: 2026.1.19"
 * />
 * <Popover open={datePicker.isOpen} onOpenChange={datePicker.setIsOpen}>
 *   <PopoverTrigger asChild>
 *     <Button variant="outline" size="icon">
 *       <CalendarIcon className="h-4 w-4" />
 *     </Button>
 *   </PopoverTrigger>
 *   <PopoverContent>
 *     <Calendar
 *       mode="single"
 *       selected={datePicker.date}
 *       onSelect={(d) => {
 *         datePicker.onCalendarSelect(d);
 *         datePicker.setIsOpen(false);
 *       }}
 *     />
 *   </PopoverContent>
 * </Popover>
 * ```
 */
export function useDatePicker(options: UseDatePickerOptions = {}): UseDatePickerReturn {
  const { initialDate, onChange } = options;

  const [date, setDateState] = useState<Date | undefined>(initialDate);
  const [text, setText] = useState<string>(formatYyyyMd(initialDate));
  const [isOpen, setIsOpen] = useState(false);

  const updateDate = useCallback(
    (newDate: Date | undefined) => {
      setDateState(newDate);
      onChange?.(newDate);
    },
    [onChange]
  );

  const onTextChange = useCallback(
    (value: string) => {
      setText(value);

      if (value === "") {
        updateDate(undefined);
        return;
      }

      const parsed = parseDateText(value);
      if (parsed) {
        updateDate(parsed);
      }
    },
    [updateDate]
  );

  const onCalendarSelect = useCallback(
    (selectedDate: Date | undefined) => {
      if (selectedDate) {
        updateDate(selectedDate);
        setText(formatYyyyMd(selectedDate));
      }
    },
    [updateDate]
  );

  const setDate = useCallback(
    (newDate: Date | undefined) => {
      setDateState(newDate);
      setText(formatYyyyMd(newDate));
    },
    []
  );

  const reset = useCallback(() => {
    setDateState(initialDate);
    setText(formatYyyyMd(initialDate));
    setIsOpen(false);
  }, [initialDate]);

  return {
    date,
    text,
    isOpen,
    setIsOpen,
    onTextChange,
    onCalendarSelect,
    setDate,
    setText,
    reset,
  };
}
