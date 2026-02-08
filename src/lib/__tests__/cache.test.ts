import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// シンプルなインメモリキャッシュの実装をテスト
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();

  set(key: string, data: T, ttlMs: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  invalidatePattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}

describe("Cache Tests", () => {
  let cache: SimpleCache<any>;

  beforeEach(() => {
    cache = new SimpleCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("基本操作", () => {
    it("データを保存して取得できる", () => {
      cache.set("key1", { value: "test" });
      expect(cache.get("key1")).toEqual({ value: "test" });
    });

    it("存在しないキーはnullを返す", () => {
      expect(cache.get("nonexistent")).toBeNull();
    });

    it("データを削除できる", () => {
      cache.set("key1", { value: "test" });
      cache.delete("key1");
      expect(cache.get("key1")).toBeNull();
    });

    it("全データをクリアできる", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.clear();
      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toBeNull();
    });

    it("hasメソッドでキーの存在確認ができる", () => {
      cache.set("key1", "value1");
      expect(cache.has("key1")).toBe(true);
      expect(cache.has("key2")).toBe(false);
    });
  });

  describe("TTL（Time To Live）", () => {
    it("デフォルトTTL内はデータが取得できる", () => {
      cache.set("key1", "value1"); // デフォルト60秒

      vi.advanceTimersByTime(30000); // 30秒経過
      expect(cache.get("key1")).toBe("value1");
    });

    it("TTL経過後はnullを返す", () => {
      cache.set("key1", "value1", 5000); // 5秒

      vi.advanceTimersByTime(6000); // 6秒経過
      expect(cache.get("key1")).toBeNull();
    });

    it("カスタムTTLを設定できる", () => {
      cache.set("key1", "value1", 10000); // 10秒

      vi.advanceTimersByTime(9000); // 9秒経過
      expect(cache.get("key1")).toBe("value1");

      vi.advanceTimersByTime(2000); // さらに2秒経過
      expect(cache.get("key1")).toBeNull();
    });

    it("期限切れデータは自動削除される", () => {
      cache.set("key1", "value1", 5000);

      vi.advanceTimersByTime(6000);
      cache.get("key1"); // この呼び出しで削除される

      // 内部的に削除されている（hasでも確認）
      expect(cache.has("key1")).toBe(false);
    });
  });

  describe("パターン無効化", () => {
    it("パターンにマッチするキーを削除できる", () => {
      cache.set("projects:1", "data1");
      cache.set("projects:2", "data2");
      cache.set("todos:1", "data3");

      cache.invalidatePattern(/^projects:/);

      expect(cache.get("projects:1")).toBeNull();
      expect(cache.get("projects:2")).toBeNull();
      expect(cache.get("todos:1")).toBe("data3");
    });

    it("全てのキーを無効化できる", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      cache.invalidatePattern(/.*/);

      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toBeNull();
    });
  });

  describe("データ型", () => {
    it("オブジェクトをキャッシュできる", () => {
      const obj = { name: "test", value: 123 };
      cache.set("obj", obj);
      expect(cache.get("obj")).toEqual(obj);
    });

    it("配列をキャッシュできる", () => {
      const arr = [1, 2, 3, { nested: true }];
      cache.set("arr", arr);
      expect(cache.get("arr")).toEqual(arr);
    });

    it("プリミティブ値をキャッシュできる", () => {
      cache.set("string", "hello");
      cache.set("number", 42);
      cache.set("boolean", true);
      cache.set("null", null);

      expect(cache.get("string")).toBe("hello");
      expect(cache.get("number")).toBe(42);
      expect(cache.get("boolean")).toBe(true);
      expect(cache.get("null")).toBe(null);
    });
  });
});

describe("APIキャッシュ戦略", () => {
  describe("Stale-While-Revalidate パターン", () => {
    interface SWRCache<T> {
      data: T;
      timestamp: number;
      staleTime: number;
      maxAge: number;
    }

    function isFresh<T>(entry: SWRCache<T>): boolean {
      return Date.now() - entry.timestamp < entry.staleTime;
    }

    function isStale<T>(entry: SWRCache<T>): boolean {
      const age = Date.now() - entry.timestamp;
      return age >= entry.staleTime && age < entry.maxAge;
    }

    function isExpired<T>(entry: SWRCache<T>): boolean {
      return Date.now() - entry.timestamp >= entry.maxAge;
    }

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("フレッシュ期間内はキャッシュを返す", () => {
      const entry: SWRCache<string> = {
        data: "cached",
        timestamp: Date.now(),
        staleTime: 30000, // 30秒
        maxAge: 60000, // 60秒
      };

      vi.advanceTimersByTime(20000); // 20秒経過
      expect(isFresh(entry)).toBe(true);
      expect(isStale(entry)).toBe(false);
    });

    it("ステール期間はキャッシュを返しつつ再検証", () => {
      const entry: SWRCache<string> = {
        data: "cached",
        timestamp: Date.now(),
        staleTime: 30000,
        maxAge: 60000,
      };

      vi.advanceTimersByTime(40000); // 40秒経過
      expect(isFresh(entry)).toBe(false);
      expect(isStale(entry)).toBe(true);
      expect(isExpired(entry)).toBe(false);
    });

    it("maxAge経過後は期限切れ", () => {
      const entry: SWRCache<string> = {
        data: "cached",
        timestamp: Date.now(),
        staleTime: 30000,
        maxAge: 60000,
      };

      vi.advanceTimersByTime(70000); // 70秒経過
      expect(isExpired(entry)).toBe(true);
    });
  });

  describe("キャッシュキー生成", () => {
    function generateCacheKey(endpoint: string, params: Record<string, any>): string {
      const sortedParams = Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join("&");
      return `${endpoint}?${sortedParams}`;
    }

    it("同じパラメータで同じキーを生成する", () => {
      const key1 = generateCacheKey("/api/projects", { page: 1, limit: 10 });
      const key2 = generateCacheKey("/api/projects", { limit: 10, page: 1 });
      expect(key1).toBe(key2);
    });

    it("異なるパラメータで異なるキーを生成する", () => {
      const key1 = generateCacheKey("/api/projects", { page: 1 });
      const key2 = generateCacheKey("/api/projects", { page: 2 });
      expect(key1).not.toBe(key2);
    });

    it("異なるエンドポイントで異なるキーを生成する", () => {
      const key1 = generateCacheKey("/api/projects", {});
      const key2 = generateCacheKey("/api/todos", {});
      expect(key1).not.toBe(key2);
    });
  });
});

describe("キャッシュ無効化戦略", () => {
  let cache: SimpleCache<any>;

  beforeEach(() => {
    cache = new SimpleCache();
  });

  it("プロジェクト更新時に関連キャッシュを無効化", () => {
    cache.set("projects:list", [{ id: 1 }, { id: 2 }]);
    cache.set("projects:1", { id: 1, name: "Project 1" });
    cache.set("dashboard", { projectCount: 2 });

    // プロジェクト更新時
    cache.invalidatePattern(/^projects:/);
    cache.delete("dashboard");

    expect(cache.get("projects:list")).toBeNull();
    expect(cache.get("projects:1")).toBeNull();
    expect(cache.get("dashboard")).toBeNull();
  });

  it("TODO更新時にダッシュボードキャッシュを無効化", () => {
    cache.set("todos:list", [{ id: 1 }]);
    cache.set("dashboard", { todoCount: 1 });

    // TODO更新時
    cache.invalidatePattern(/^todos:/);
    cache.delete("dashboard");

    expect(cache.get("todos:list")).toBeNull();
    expect(cache.get("dashboard")).toBeNull();
  });
});
