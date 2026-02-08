import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRecentSearches } from "../useRecentSearches";
import { PROJECT_SEARCH_RECENT_KEY, MAX_RECENT_SEARCHES } from "../../_constants";

// localStorage モック
let mockStorage: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockStorage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage[key];
  }),
  clear: vi.fn(() => {
    mockStorage = {};
  }),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("useRecentSearches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = {};
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("初期状態", () => {
    it("初期状態ではrecentSearchesが空配列", () => {
      const { result } = renderHook(() => useRecentSearches());

      expect(result.current.recentSearches).toEqual([]);
    });

    it("初期状態ではshowSuggestionsがfalse", () => {
      const { result } = renderHook(() => useRecentSearches());

      expect(result.current.showSuggestions).toBe(false);
    });

    it("localStorageから最近の検索を読み込む", () => {
      mockStorage[PROJECT_SEARCH_RECENT_KEY] = JSON.stringify(["検索1", "検索2"]);

      const { result } = renderHook(() => useRecentSearches());

      expect(result.current.recentSearches).toEqual(["検索1", "検索2"]);
    });
  });

  describe("handleSearchFocus", () => {
    it("フォーカス時にshowSuggestionsがtrueになる", () => {
      const { result } = renderHook(() => useRecentSearches());

      act(() => {
        result.current.handleSearchFocus();
      });

      expect(result.current.showSuggestions).toBe(true);
    });
  });

  describe("handleSearchBlur", () => {
    it("ブラー時にshowSuggestionsがfalseになる（遅延後）", () => {
      const { result } = renderHook(() => useRecentSearches());

      act(() => {
        result.current.handleSearchFocus();
      });

      expect(result.current.showSuggestions).toBe(true);

      act(() => {
        result.current.handleSearchBlur("test");
      });

      // 200ms遅延があるのでまだtrue
      expect(result.current.showSuggestions).toBe(true);

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current.showSuggestions).toBe(false);
    });

    it("検索クエリがある場合、最近の検索に追加される", () => {
      const { result } = renderHook(() => useRecentSearches());

      act(() => {
        result.current.handleSearchBlur("新しい検索");
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        PROJECT_SEARCH_RECENT_KEY,
        JSON.stringify(["新しい検索"])
      );
    });

    it("空白のみの検索クエリは追加されない", () => {
      const { result } = renderHook(() => useRecentSearches());

      act(() => {
        result.current.handleSearchBlur("   ");
      });

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe("handleSearchKeyDown", () => {
    it("Enterキーで検索クエリが最近の検索に追加される", () => {
      const { result } = renderHook(() => useRecentSearches());

      const enterEvent = { key: "Enter" } as React.KeyboardEvent<HTMLInputElement>;

      act(() => {
        result.current.handleSearchKeyDown(enterEvent, "Enter検索");
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        PROJECT_SEARCH_RECENT_KEY,
        JSON.stringify(["Enter検索"])
      );
    });

    it("Enter以外のキーでは追加されない", () => {
      const { result } = renderHook(() => useRecentSearches());

      const tabEvent = { key: "Tab" } as React.KeyboardEvent<HTMLInputElement>;

      act(() => {
        result.current.handleSearchKeyDown(tabEvent, "Tab検索");
      });

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it("空白のみのクエリはEnterでも追加されない", () => {
      const { result } = renderHook(() => useRecentSearches());

      const enterEvent = { key: "Enter" } as React.KeyboardEvent<HTMLInputElement>;

      act(() => {
        result.current.handleSearchKeyDown(enterEvent, "   ");
      });

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe("handleSuggestionClick", () => {
    it("候補クリックでクエリが設定される", () => {
      const { result } = renderHook(() => useRecentSearches());
      const setQuery = vi.fn();

      act(() => {
        result.current.handleSuggestionClick("候補テキスト", setQuery);
      });

      expect(setQuery).toHaveBeenCalledWith("候補テキスト");
    });

    it("候補クリックで最近の検索に追加される", () => {
      const { result } = renderHook(() => useRecentSearches());
      const setQuery = vi.fn();

      act(() => {
        result.current.handleSuggestionClick("候補テキスト", setQuery);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        PROJECT_SEARCH_RECENT_KEY,
        JSON.stringify(["候補テキスト"])
      );
    });

    it("候補クリックでshowSuggestionsがfalseになる", () => {
      const { result } = renderHook(() => useRecentSearches());
      const setQuery = vi.fn();

      act(() => {
        result.current.handleSearchFocus();
      });

      expect(result.current.showSuggestions).toBe(true);

      act(() => {
        result.current.handleSuggestionClick("候補テキスト", setQuery);
      });

      expect(result.current.showSuggestions).toBe(false);
    });
  });

  describe("重複の除去とMAX制限", () => {
    it("重複する検索は除去される", () => {
      mockStorage[PROJECT_SEARCH_RECENT_KEY] = JSON.stringify(["既存検索"]);

      const { result } = renderHook(() => useRecentSearches());

      act(() => {
        result.current.handleSearchBlur("既存検索");
      });

      // 重複は除去されて先頭に移動
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        PROJECT_SEARCH_RECENT_KEY,
        JSON.stringify(["既存検索"])
      );
    });

    it(`最大${MAX_RECENT_SEARCHES}件まで保存される`, () => {
      mockStorage[PROJECT_SEARCH_RECENT_KEY] = JSON.stringify(["検索1", "検索2", "検索3"]);

      const { result } = renderHook(() => useRecentSearches());

      act(() => {
        result.current.handleSearchBlur("新しい検索");
      });

      // 新しい検索が先頭に追加され、最大3件まで
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        PROJECT_SEARCH_RECENT_KEY,
        JSON.stringify(["新しい検索", "検索1", "検索2"])
      );
    });
  });

  describe("localStorage エラーハンドリング", () => {
    it("localStorageの読み込みエラーでも空配列を返す", () => {
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem = vi.fn(() => {
        throw new Error("Storage error");
      });

      const { result } = renderHook(() => useRecentSearches());

      expect(result.current.recentSearches).toEqual([]);

      localStorageMock.getItem = originalGetItem;
    });

    it("不正なJSONでも空配列を返す", () => {
      mockStorage[PROJECT_SEARCH_RECENT_KEY] = "invalid json";

      const { result } = renderHook(() => useRecentSearches());

      expect(result.current.recentSearches).toEqual([]);
    });

    it("配列でないデータでも空配列を返す", () => {
      mockStorage[PROJECT_SEARCH_RECENT_KEY] = JSON.stringify({ not: "array" });

      const { result } = renderHook(() => useRecentSearches());

      expect(result.current.recentSearches).toEqual([]);
    });

    it("localStorageの書き込みエラーでもクラッシュしない", () => {
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = vi.fn(() => {
        throw new Error("Quota exceeded");
      });

      const { result } = renderHook(() => useRecentSearches());

      expect(() => {
        act(() => {
          result.current.handleSearchBlur("テスト");
        });
      }).not.toThrow();

      localStorageMock.setItem = originalSetItem;
    });
  });

  describe("型フィルタリング", () => {
    it("文字列以外の要素はフィルタリングされる", () => {
      mockStorage[PROJECT_SEARCH_RECENT_KEY] = JSON.stringify(["valid", 123, null, "also valid", undefined]);

      const { result } = renderHook(() => useRecentSearches());

      expect(result.current.recentSearches).toEqual(["valid", "also valid"]);
    });
  });
});
