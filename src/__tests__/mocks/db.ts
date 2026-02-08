import { vi } from "vitest";

// Drizzle ORM のモック用ヘルパー型
export interface MockQueryResult<T> {
  data: T[];
  returning: T[];
}

// モックされたDB操作を作成するファクトリ
export function createMockDb() {
  // モックデータストア
  const store = {
    projects: [] as any[],
    users: [] as any[],
    todos: [] as any[],
    comments: [] as any[],
    progress: [] as any[],
    meetings: [] as any[],
    feedbacks: [] as any[],
    projectFiles: [] as any[],
    constructionProgress: [] as any[],
    constructionPhotos: [] as any[],
    calendarEvents: [] as any[],
  };

  // IDカウンター
  let idCounter = 1;

  // クエリビルダーのモック
  const createQueryBuilder = (tableName: keyof typeof store) => {
    let filters: ((item: any) => boolean)[] = [];
    let selectedData: any = null;

    const builder = {
      where: vi.fn((condition: (item: any) => boolean) => {
        filters.push(condition);
        return builder;
      }),
      orderBy: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      offset: vi.fn(() => builder),
      then: vi.fn((resolve: (data: any) => void) => {
        let result = store[tableName];
        for (const filter of filters) {
          result = result.filter(filter);
        }
        resolve(result);
        return Promise.resolve(result);
      }),
    };

    return builder;
  };

  // DBモックオブジェクト
  const mockDb = {
    select: vi.fn(() => ({
      from: vi.fn((table: any) => {
        const tableName = getTableName(table);
        return createQueryBuilder(tableName);
      }),
    })),

    insert: vi.fn((table: any) => {
      const tableName = getTableName(table);
      return {
        values: vi.fn((data: any) => ({
          returning: vi.fn(() => {
            const newItem = { id: idCounter++, ...data };
            store[tableName].push(newItem);
            return Promise.resolve([newItem]);
          }),
          execute: vi.fn(() => {
            const newItem = { id: idCounter++, ...data };
            store[tableName].push(newItem);
            return Promise.resolve({ insertId: newItem.id });
          }),
        })),
      };
    }),

    update: vi.fn((table: any) => {
      const tableName = getTableName(table);
      return {
        set: vi.fn((data: any) => ({
          where: vi.fn((condition: (item: any) => boolean) => ({
            execute: vi.fn(() => {
              const index = store[tableName].findIndex(condition);
              if (index !== -1) {
                store[tableName][index] = { ...store[tableName][index], ...data };
              }
              return Promise.resolve({ rowsAffected: index !== -1 ? 1 : 0 });
            }),
            returning: vi.fn(() => {
              const index = store[tableName].findIndex(condition);
              if (index !== -1) {
                store[tableName][index] = { ...store[tableName][index], ...data };
                return Promise.resolve([store[tableName][index]]);
              }
              return Promise.resolve([]);
            }),
          })),
        })),
      };
    }),

    delete: vi.fn((table: any) => {
      const tableName = getTableName(table);
      return {
        where: vi.fn((condition: (item: any) => boolean) => ({
          execute: vi.fn(() => {
            const initialLength = store[tableName].length;
            store[tableName] = store[tableName].filter((item) => !condition(item));
            return Promise.resolve({ rowsAffected: initialLength - store[tableName].length });
          }),
        })),
      };
    }),

    // ストア操作用ヘルパー
    _store: store,
    _reset: () => {
      Object.keys(store).forEach((key) => {
        store[key as keyof typeof store] = [];
      });
      idCounter = 1;
    },
    _seed: (tableName: keyof typeof store, data: any[]) => {
      store[tableName] = data.map((item, index) => ({
        id: item.id ?? index + 1,
        ...item,
      }));
      idCounter = Math.max(...store[tableName].map((item) => item.id)) + 1;
    },
  };

  return mockDb;
}

// テーブル名を取得するヘルパー（Drizzleのテーブル定義からテーブル名を抽出）
function getTableName(table: any): string {
  // Drizzleのテーブルオブジェクトから名前を取得
  if (table && typeof table === "object") {
    // SQLiteのテーブルオブジェクトの場合
    if (table._.name) return camelCase(table._.name);
    if (table[Symbol.for("drizzle:Name")]) return camelCase(table[Symbol.for("drizzle:Name")]);
  }
  return "unknown";
}

// スネークケースをキャメルケースに変換
function camelCase(str: string): string {
  return str
    .split("_")
    .map((word, index) =>
      index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join("");
}

// デフォルトのモックDB
export const mockDb = createMockDb();

// vi.mockで使用するためのファクトリ
export function setupDbMock() {
  vi.mock("@/db", () => ({
    db: mockDb,
  }));
}
