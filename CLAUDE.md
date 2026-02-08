# Lepac プロジェクト - Claude Code 指示書

## プロジェクト概要

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **DB**: SQLite (better-sqlite3)

---

## ⚠️ 必須ルール（絶対厳守）

以下のルールは**すべてのコーディング作業で必ず遵守**すること。例外は認めない。

### 1. コーディング完了時の自動リファクタリング

**コードを書いた後、必ず以下を実行すること：**

```
1. 編集したファイルの行数を確認
2. 200行を超えていれば → 分割を検討
3. 500行を超えていれば → 必ず分割を実行
4. TypeScriptコンパイル確認（npx tsc --noEmit）
```

### 2. 絶対に守るべきパターン

| ルール | 違反時のアクション |
|--------|-------------------|
| **フック分離** | `useXxxData`（データ取得）と`useXxxActions`（CRUD）を必ず分離 |
| **ダイアログ分離** | 50行超のダイアログは別ファイルに抽出 |
| **useState制限** | 10個以上のuseStateはフックにグループ化 |
| **型・定数の外部化** | `_types.ts`と`_constants.ts`に分離 |
| **コンポーネント分離** | 繰り返しUI要素は必ずサブコンポーネント化 |

### 3. ファイルサイズの絶対基準

| 行数 | ステータス | 必須アクション |
|------|-----------|---------------|
| ~200行 | ✅ 適正 | なし |
| 200-500行 | ⚠️ 警告 | 分割を検討し、可能なら実行 |
| 500行以上 | ❌ 違反 | **即座に分割を実行**（作業を中断してでも対応） |

### 4. コーディング時の必須チェックリスト

新規コード作成・既存コード編集時、以下を**毎回**確認：

- [ ] ファイル行数は500行未満か？
- [ ] useStateは10個未満か？
- [ ] インラインダイアログは50行未満か？
- [ ] fetchロジックはフックに分離されているか？
- [ ] 型定義は`_types.ts`にあるか？

**1つでもNOがあれば、機能実装の前にリファクタリングを実行**

---

## リファクタリングルール

### 1. ファイルサイズの基準

| 区分 | 行数 | アクション |
|-----|-----|----------|
| 適正 | ~200行 | そのまま |
| 要注意 | 200-500行 | 分割を検討 |
| 要リファクタ | 500行以上 | 必ず分割 |

### 2. コンポーネント分割パターン

#### 2.1 ディレクトリ構造

```
src/app/[route]/
├── page.tsx                 # エントリーポイント（~150-300行が理想）
├── _types.ts                # 型定義
├── _constants.ts            # 定数
├── _hooks/
│   ├── index.ts             # エクスポート
│   ├── useXxxData.ts        # データフェッチ・状態管理
│   └── useXxxActions.ts     # CRUD操作
└── _components/
    ├── feature-name/
    │   ├── index.ts         # エクスポート
    │   ├── FeatureTab.tsx   # メインコンポーネント
    │   └── FeatureDialog.tsx # ダイアログ
    └── another-feature/
        └── ...
```

#### 2.2 分割の優先順位

1. **ダイアログ** → 独立したファイルに抽出（状態は内部管理）
2. **タブコンテンツ** → 機能単位でコンポーネント化
3. **fetchロジック** → `useXxxData`フックへ
4. **CRUD操作** → `useXxxActions`フックへ
5. **繰り返しUI** → サブコンポーネント化

### 3. カスタムフック設計

#### 3.1 useXxxData パターン

```typescript
// データフェッチと状態管理を一元化
export function useProjectData(id: string) {
  const [data, setData] = useState<Data | null>(null);

  // useCallbackでメモ化、Promise<void>を返す
  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/xxx/${id}`);
    setData(await res.json());
  }, [id]);

  // 初期化ロジックもフック内に
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, fetchData, setData };
}
```

#### 3.2 useXxxActions パターン

```typescript
// CRUD操作を関数として提供
interface UseActionsOptions {
  projectId: string;
  onRefresh: () => Promise<void>;  // useXxxDataのfetch関数を受け取る
}

export function useProjectActions(options: UseActionsOptions) {
  const { projectId, onRefresh } = options;

  const createItem = useCallback(async (data: CreateData) => {
    await fetch(`/api/xxx/${projectId}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    await onRefresh();  // 自動リフレッシュ
  }, [projectId, onRefresh]);

  return { createItem, updateItem, deleteItem };
}
```

### 4. ダイアログコンポーネント設計

#### 4.1 状態管理

- **内部状態**: フォーム入力値、バリデーション状態
- **外部状態**: `open`, `onOpenChange`, 編集対象データ

```typescript
interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;                           // 編集対象
  onConfirm: (data: FormData) => Promise<void>; // 確定時コールバック
}

export function EditDialog({ open, onOpenChange, item, onConfirm }: DialogProps) {
  const [form, setForm] = useState<FormData>(getInitial(item));

  // ダイアログが開くたびに初期化
  useEffect(() => {
    if (open && item) {
      setForm(getInitial(item));
    }
  }, [open, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(form);
    onOpenChange(false);  // 成功時に閉じる
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>...</Dialog>;
}
```

### 5. Props設計

#### 5.1 コールバック命名規則

| 用途 | 命名パターン | 例 |
|-----|------------|---|
| ダイアログを開く | `onXxxOpen` | `onEditOpen`, `onDeleteOpen` |
| アクション実行 | `onXxx` | `onAdd`, `onDelete`, `onConfirm` |
| 状態変更 | `onXxxChange` | `onOpenChange`, `onValueChange` |
| リフレッシュ | `onRefreshXxx` | `onRefreshProject`, `onRefreshData` |

#### 5.2 型エクスポート

```typescript
// _components/feature/index.ts
export { FeatureTab } from "./FeatureTab";
export { FeatureDialog } from "./FeatureDialog";
export type { FeatureFormData } from "./FeatureDialog";  // 型もエクスポート
```

### 6. page.tsx の構成

```typescript
export default function Page() {
  // 1. フック呼び出し
  const { data, fetchData } = useXxxData(id);
  const actions = useXxxActions({ id, onRefresh: fetchData });

  // 2. UIダイアログ状態（最小限に）
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // 3. ダイアログ開閉ハンドラ（シンプルに）
  const openEditDialog = (item: Item) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  // 4. JSX
  return (
    <>
      <MainContent onEdit={openEditDialog} />
      <EditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editingItem}
        onConfirm={async (data) => {
          await actions.update(editingItem!.id, data);
          setEditingItem(null);
        }}
      />
    </>
  );
}
```

### 7. 避けるべきパターン

1. **page.tsx内での直接fetch** → フックに移動
2. **50行超のインラインダイアログ** → コンポーネント化
3. **10個以上のuseState** → フックでグループ化
4. **同じfetchロジックの重複** → useXxxDataで一元化
5. **コールバック内でのstate更新後fetch** → actionsフックで自動化

### 8. チェックリスト（必須実行）

#### 新規ページ作成時（作成前に確認）:
- [ ] `_types.ts`で型定義を先に作成
- [ ] 200行超えそうなら先にフック設計
- [ ] ダイアログは最初から別ファイルで作成

#### コード編集完了時（毎回必ず実行）:
```bash
# 1. 編集ファイルの行数確認
wc -l <編集したファイル>

# 2. TypeScriptコンパイル確認
npx tsc --noEmit
```

- [ ] 行数確認 → 500行超えなら**即座に分割**
- [ ] useState数確認 → 10個超えなら**即座にフック化**
- [ ] インラインダイアログ確認 → 50行超えなら**即座に抽出**
- [ ] fetchロジック確認 → page.tsx内にあれば**即座にuseXxxDataへ移動**
- [ ] CRUD操作確認 → 散らばっていれば**即座にuseXxxActionsへ集約**

⚠️ **上記チェックで問題が見つかった場合、次の作業に進む前にリファクタリングを完了させること**

---

## コーディング規約

### import順序

```typescript
// 1. React/Next.js
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

// 2. 外部ライブラリ
import { ArrowLeft } from "lucide-react";

// 3. 内部ユーティリティ
import { cn } from "@/lib/utils";

// 4. UIコンポーネント
import { Button } from "@/components/ui/button";

// 5. ローカルフック
import { useProjectData } from "./_hooks";

// 6. ローカルコンポーネント
import { DetailsTab } from "./_components/details";

// 7. 型定義
import type { Project } from "./_types";
```

### ファイル内構成

```typescript
// 1. "use client" (必要な場合)
"use client";

// 2. imports

// 3. 型定義（ファイル内で使う場合）
interface Props { ... }

// 4. ヘルパー関数
function formatDate(date: Date) { ... }

// 5. メインコンポーネント
export function Component() { ... }

// 6. サブコンポーネント（exportしない）
function SubComponent() { ... }
```

---

## テスト駆動開発（TDD）方針

### ⚠️ 必須ルール

**すべての新規機能・バグ修正はTDDで実装すること**

1. **テストを先に書く** → 失敗することを確認
2. **最小限のコードで実装** → テストをパスさせる
3. **リファクタリング** → テストが通る状態を維持

### 1. テストフレームワーク

| 用途 | フレームワーク | 設定ファイル |
|------|--------------|-------------|
| ユニットテスト | Vitest + React Testing Library | `vitest.config.ts` |
| E2Eテスト | Playwright | `playwright.config.ts` |
| APIモック | MSW (Mock Service Worker) | `src/__tests__/mocks/handlers.ts` |

### 2. カバレッジ目標（必須達成）

| メトリクス | 最低基準 | 推奨 |
|-----------|---------|------|
| ステートメント | **80%** | 90%+ |
| ブランチ | **80%** | 85%+ |
| 関数 | **80%** | 85%+ |
| 行 | **80%** | 90%+ |

```bash
# カバレッジ確認コマンド
npm run test:coverage

# カバレッジレポート表示
open coverage/index.html
```

### 3. テストファイル配置

```
src/
├── app/
│   └── [route]/
│       ├── __tests__/           # ページ・ビューのテスト
│       │   └── XxxView.test.tsx
│       └── _hooks/
│           └── __tests__/       # フックのテスト
│               └── useXxx.test.ts
├── components/
│   └── __tests__/               # 共通コンポーネントのテスト
│       └── Component.test.tsx
├── lib/
│   └── __tests__/               # ユーティリティのテスト
│       └── utils.test.ts
└── __tests__/
    ├── setup.ts                 # テストセットアップ
    └── mocks/
        └── handlers.ts          # MSWハンドラー
```

### 4. テストパターン

#### 4.1 カスタムフックのテスト

```typescript
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useXxxData } from "../useXxxData";

describe("useXxxData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response));
  });

  it("初期状態を検証", () => {
    const { result } = renderHook(() => useXxxData());
    expect(result.current.data).toEqual([]);
  });

  it("データ取得を検証", async () => {
    const { result } = renderHook(() => useXxxData());
    await act(async () => {
      await result.current.fetchData();
    });
    expect(global.fetch).toHaveBeenCalled();
  });
});
```

#### 4.2 APIルートのテスト

```typescript
import { describe, it, expect, vi } from "vitest";

// DBモック（呼び出し順序でテーブル識別）
let callCount = 0;
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(mockData);
        return Promise.resolve([]);
      }),
    })),
  },
}));

import { GET, POST } from "../route";

describe("API Route", () => {
  beforeEach(() => {
    callCount = 0;
  });

  it("GETが正常にデータを返す", async () => {
    const response = await GET();
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
```

#### 4.3 コンポーネントのテスト

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Component } from "../Component";

// Next.js モック
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("Component", () => {
  it("タイトルが表示される", () => {
    render(<Component data={mockData} />);
    expect(screen.getByText("タイトル")).toBeInTheDocument();
  });

  it("ボタンクリックでアクションが実行される", async () => {
    const onAction = vi.fn();
    render(<Component onAction={onAction} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(onAction).toHaveBeenCalled();
  });
});
```

### 5. カバレッジ除外対象

以下はカバレッジ計算から除外（`vitest.config.ts`で設定）：

```typescript
coverage: {
  exclude: [
    "node_modules/**",
    "src/__tests__/**",
    "**/*.d.ts",
    "**/index.ts",              // 再エクスポートファイル
    "src/app/**/page.tsx",      // サーバーコンポーネント
    "src/app/**/layout.tsx",    // レイアウト
    "src/components/ui/**",     // shadcn/ui自動生成
  ],
}
```

### 6. テスト実行コマンド

```bash
# ユニットテスト実行
npm run test:run

# ウォッチモード
npm run test

# カバレッジ付き実行
npm run test:coverage

# E2Eテスト実行
npm run test:e2e

# 特定ファイルのみ
npm run test:run -- src/lib/__tests__/utils.test.ts
```

### 7. コード変更時のテストチェックリスト

- [ ] 新機能にはテストを先に作成したか？
- [ ] 既存テストは全てパスするか？
- [ ] カバレッジ80%以上を維持しているか？
- [ ] エッジケース（null、空配列、エラー）をテストしたか？
- [ ] モックは適切にリセットされているか？

### 8. MSWハンドラーの追加

```typescript
// src/__tests__/mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/projects", () => {
    return HttpResponse.json(mockProjects);
  }),

  http.post("/api/projects", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 1, ...body });
  }),
];
```

### 9. 避けるべきテストパターン

1. **実装詳細のテスト** → 振る舞いをテストする
2. **スナップショットの乱用** → 意図的な変更と事故の区別が困難
3. **テスト間の依存** → 各テストは独立して実行可能に
4. **過度なモック** → 統合テストでカバーすべき部分もある
5. **非同期処理の`waitFor`忘れ** → フレーキーテストの原因

---

## セキュリティテスト

### 必須テスト項目

| 機能 | テスト内容 |
|------|-----------|
| CSRF保護 | Origin/Refererヘッダー検証 |
| レート制限 | 閾値超過時のブロック |
| 認証ガード | 未認証アクセスの拒否 |
| 監査ログ | 重要操作の記録 |
| JWT | トークン生成・検証・有効期限 |

```typescript
// セキュリティテストの例
describe("CSRF Protection", () => {
  it("不正なOriginを拒否する", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { Origin: "http://malicious.com" },
    });
    const result = await verifyCsrfToken(request);
    expect(result.valid).toBe(false);
  });
});
```
