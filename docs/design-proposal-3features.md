# 3機能改修 設計提案書（Gemini視点）

**作成日**: 2026-02-12
**対象**: 横型Gitツリータイムライン / パネルレイアウト選択 / カレンダー機能強化
**視点**: UX・ユーザビリティ・太陽光パネル業界の実務フロー

---

## 目次

1. [横型Gitツリータイムライン](#1-横型gitツリータイムライン)
2. [パネルレイアウト選択](#2-パネルレイアウト選択)
3. [カレンダー機能強化](#3-カレンダー機能強化)
4. [横断的考慮事項](#4-横断的考慮事項)
5. [実装優先順位](#5-実装優先順位)

---

## 1. 横型Gitツリータイムライン

### 1.1 現状分析

| ファイル | 役割 | 行数 |
|---------|------|------|
| `src/components/WorkflowTimeline.tsx` | 案件詳細用の縦型タイムライン | 350行 |
| `src/app/schedule/page.tsx` | 独立したスケジュール生成ページ（横型あり） | 477行 |
| `src/lib/timeline.ts` | 計算ロジック（共通） | 508行 |
| `src/components/workflow-timeline/PhaseDetail.tsx` | サブフェーズ詳細 | 89行 |

schedule/page.tsxの横型実装（207-327行）は10フェーズを`flex items-center`で一行に配置している。
WorkflowTimeline.tsxは縦型リストで、5状態の色分けを実装済み。

**縦型に変更された推定理由**: 10ノード横一列はモバイルで破綻する。太陽光業者の現場担当者はスマートフォンで確認する頻度が高い。

### 1.2 設計方針: レスポンシブ・ハイブリッド型

```
デスクトップ (>= 1024px): 横型Gitツリー（全10ノード一列）
タブレット (768-1023px):  横型2段（5ノード x 2行、折り返しライン接続）
モバイル (< 768px):       縦型コンパクトリスト（現行のステータスバッジ付き）
```

### 1.3 ノードカラーリング（6状態）

現行の WorkflowTimeline.tsx には「1週間以内に期限」の黄/オレンジ状態が欠落している。

```typescript
// src/lib/timeline.ts に追加
type NodeStatus = 'completed' | 'in_progress' | 'overdue' | 'due_soon' | 'waiting' | 'pending';

function determineNodeStatus(phase: PhaseData, now: Date): NodeStatus {
  if (phase.status === 'completed') return 'completed';
  if (phase.key === 'waiting_period' && phase.status !== 'completed') return 'waiting';
  if (phase.isOverdue) return 'overdue';

  // 1週間以内の期限警告
  if (phase.endDate) {
    const oneWeekFromNow = new Date(now);
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    if (phase.endDate <= oneWeekFromNow && phase.endDate > now) return 'due_soon';
  }

  if (phase.status === 'in_progress') return 'in_progress';
  return 'pending';
}

const nodeColors: Record<NodeStatus, { border: string; bg: string; text: string }> = {
  completed:   { border: 'border-green-500',  bg: 'bg-green-500',   text: 'text-white' },
  in_progress: { border: 'border-blue-500',   bg: 'bg-blue-500',    text: 'text-white' },
  overdue:     { border: 'border-red-500',     bg: 'bg-red-500',     text: 'text-white' },
  due_soon:    { border: 'border-amber-500',   bg: 'bg-amber-400',   text: 'text-black' },
  waiting:     { border: 'border-amber-600',   bg: 'bg-amber-600',   text: 'text-white' },
  pending:     { border: 'border-muted-foreground/40', bg: 'bg-muted', text: 'text-muted-foreground' },
};
```

### 1.4 ノード編集機能

太陽光業界では電力会社の回答遅延や法令許可の前後でスケジュールが頻繁に変動する。

**UI: インライン編集ポップオーバー**

```
ノードクリック -> Popover表示
  +-- 予定日DatePicker（既存の ui/date-picker.tsx を流用）
  +-- メモ入力（Textarea、最大200文字）
  +-- ステータス手動切替（完了/未完了トグル）
  +-- 「後続フェーズも連動する」チェックボックス
  +-- 保存ボタン
```

**「後続連動」チェックボックスの理由**: 太陽光案件では電力回答待ちが遅延しても工事日程が変わらないケースがある（材料先行発注済みなど）。一律に後続を再計算すると実態と乖離する。

**DB設計**: 既存の`progress`テーブルの`createdAt`(予定日)と`description`で代替可能。追加カラム不要。

### 1.5 ファイル構成（300行ルール準拠）

```
src/components/
  workflow-timeline/
    HorizontalTimeline.tsx     -- 横型ノードライン（デスクトップ用）
    CompactTimeline.tsx         -- 縦型コンパクト版（モバイル用）
    TimelineNode.tsx            -- 個別ノードコンポーネント（共通）
    TimelineNodeEditor.tsx      -- ノード編集ポップオーバー
    PhaseDetail.tsx             -- 既存（サブフェーズ詳細）
    constants.ts                -- 色・ステータス定数
    hooks/
      useTimelineStatus.ts     -- ステータス判定ロジック
      useTimelineLayout.ts     -- レスポンシブ判定（画面幅によるレイアウト切替）
```

### 1.6 太陽光業界特有の考慮

- **「待機期間」ノード**: 電力会社の回答は30-45日かかるが、進捗がないのが正常。パルスアニメーションではなく砂時計アイコン + 残日数カウントダウン表示の方が直感的
- **並行工程の分岐表現**: 申請フェーズと契約・設計フェーズが並行するケース（timeline.tsの`applicationContractStartDate`の処理）をGitツリーの「ブランチ」分岐ラインで可視化

### 1.7 エッジケース

- 完工月が未設定の案件: 横型ノードは全て`pending`状態で表示。日付は「未定」表記
- 全フェーズ完了後の表示: 全ノード緑 + 「全工程完了」バナー
- 手動編集日付が逆転（前フェーズより後フェーズの日付が早い）: 警告表示のみ（ブロックしない）

---

## 2. パネルレイアウト選択

### 2.1 現状分析

| 項目 | 状態 |
|------|------|
| `panelLayout` カラム | `text("panel_layout")` で既存（schema.ts 181行目） |
| `moduleCount` カラム | パネル枚数（既存） |
| `moduleCapacity` カラム | モジュール容量（既存） |
| `systemCapacity` カラム | システム容量（既存） |
| UI | フリーテキスト入力のみ。選択UIは未実装 |

### 2.2 業界標準マスターデータ

```typescript
// src/lib/panel-layout.ts（新規作成）

export interface PanelLayoutConfig {
  id: string;               // "9x2", "10x2" 等
  series: number;            // 直列数（縦方向のパネル枚数）
  parallel: number;          // 並列数（横方向のストリング数）
  label: string;             // 表示用ラベル "9直2列"
  panelsPerString: number;   // 1ストリング当たりのパネル枚数
  totalPanels: number;       // 合計パネル枚数（1アレイ分）
}

export const PANEL_LAYOUTS: PanelLayoutConfig[] = [
  { id: '8x2',  series: 8,  parallel: 2, label: '8直2列',  panelsPerString: 8,  totalPanels: 16 },
  { id: '9x2',  series: 9,  parallel: 2, label: '9直2列',  panelsPerString: 9,  totalPanels: 18 },
  { id: '10x2', series: 10, parallel: 2, label: '10直2列', panelsPerString: 10, totalPanels: 20 },
  { id: '11x2', series: 11, parallel: 2, label: '11直2列', panelsPerString: 11, totalPanels: 22 },
  { id: '12x2', series: 12, parallel: 2, label: '12直2列', panelsPerString: 12, totalPanels: 24 },
  { id: '9x3',  series: 9,  parallel: 3, label: '9直3列',  panelsPerString: 9,  totalPanels: 27 },
  { id: '10x3', series: 10, parallel: 3, label: '10直3列', panelsPerString: 10, totalPanels: 30 },
  { id: '11x3', series: 11, parallel: 3, label: '11直3列', panelsPerString: 11, totalPanels: 33 },
  { id: '12x3', series: 12, parallel: 3, label: '12直3列', panelsPerString: 12, totalPanels: 36 },
  { id: '10x4', series: 10, parallel: 4, label: '10直4列', panelsPerString: 10, totalPanels: 40 },
  { id: '12x4', series: 12, parallel: 4, label: '12直4列', panelsPerString: 12, totalPanels: 48 },
];

export const PANEL_WATTAGES = [
  { value: 400, label: '400W' },
  { value: 420, label: '420W' },
  { value: 440, label: '440W' },
  { value: 450, label: '450W' },
  { value: 500, label: '500W' },
  { value: 550, label: '550W' },
  { value: 580, label: '580W' },
  { value: 600, label: '600W' },
  { value: 700, label: '700W' },
];

export function calculateSystemCapacity(
  totalPanels: number,
  wattPerPanel: number,
  arrayCount: number = 1
): { kw: number; mw: number } {
  const totalWatts = totalPanels * arrayCount * wattPerPanel;
  return {
    kw: Math.round(totalWatts / 10) / 100,
    mw: Math.round(totalWatts / 10000) / 100,
  };
}
```

### 2.3 UI設計

```
+-------------------------------------------+
| パネルレイアウト                           |
|                                            |
| レイアウト: [10直2列 v]   アレイ数: [24]   |
|                                            |
| パネル種別: [550W v]                       |
|                                            |
| +-- 計算結果 ----------------------------+ |
| | 1アレイ: 20枚                          | |
| | 合計パネル: 480枚                      | |
| | システム容量: 264.0 kW (0.26 MW)       | |
| +----------------------------------------+ |
|                                            |
| +-- 簡易レイアウト図 --------------------+ |
| | [] [] [] [] [] [] [] [] [] []          | |
| | [] [] [] [] [] [] [] [] [] []          | |
| | (10直 x 2列 = 20枚/アレイ)            | |
| +----------------------------------------+ |
+-------------------------------------------+
```

### 2.4 実務上の重要ポイント

1. **アレイ数の入力は必須**: 「10直2列」は1アレイの構成。サイト全体では同じレイアウトを複数並べる。`panelCount`カラム（既存）と照合して矛盾チェック可能
2. **カスタム入力の許可**: プルダウンにない非標準レイアウト（7直2列、13直2列等）は「その他」選択時に直列数・並列数の個別入力欄を表示
3. **既存カラムとの整合性**: `moduleCapacity`, `systemCapacity`, `moduleCount` が既に存在するため、パネルレイアウト選択時にこれらも自動更新するか、不整合を警告表示

### 2.5 DB保存形式

既存の `panelLayout` カラム（text型）にJSON文字列を格納:

```typescript
interface PanelLayoutData {
  layoutId: string;     // "10x2" or "custom"
  series: number;       // 直列数
  parallel: number;     // 並列数
  arrayCount: number;   // アレイ数
  wattage?: number;     // パネルワット数
}
// 例: '{"layoutId":"10x2","series":10,"parallel":2,"arrayCount":24,"wattage":550}'
```

**後方互換性**: 既にフリーテキストで入力されているデータは文字列のまま表示。新規選択時にJSON形式へ移行。読み取り時にJSONパースを試み、失敗すればフリーテキストとして表示。

### 2.6 モバイル対応

- セレクトボックスはネイティブのselect要素にフォールバック（iOSのドラム式UIは小画面で使いやすい）
- 簡易レイアウト図はモバイルでは非表示。代わりに「20枚/アレイ x 24アレイ = 480枚 = 264kW」のテキストサマリーのみ

---

## 3. カレンダー機能強化

### 3.1 現状分析

| ファイル | 役割 | 行数 | 問題 |
|---------|------|------|------|
| `src/components/FullCalendarView.tsx` | メインカレンダー | 498行 | **300行超過 要分割** |
| `src/app/calendar/page.tsx` | カレンダーページ | 155行 | - |
| `src/components/ui/date-picker.tsx` | shadcn DatePicker | 84行 | - |

- `calendarEvents`テーブルに時間カラムなし（`eventDate: text` のみ）
- 全イベント `allDay: true` で登録
- イベント編集機能は未実装（詳細表示 + 削除のみ）
- `@fullcalendar/react` + `timeGridPlugin` 導入済みだが未活用

### 3.2 DBスキーマ拡張

```typescript
// calendarEvents テーブルへの追加カラム（ALTER TABLE ADD COLUMN パターン）
startTime: text("start_time"),                  // "09:00" 形式（null = 終日）
endTime: text("end_time"),                      // "17:00" 形式（null = 終日）
isAllDay: integer("is_all_day").default(1),     // 1 = 終日, 0 = 時間指定
```

既存データとの互換性: `startTime` が `null` かつ `isAllDay` が `1` の場合は従来通りの終日イベント。

### 3.3 FullCalendarView.tsx の分割

```
src/components/calendar/
  FullCalendarView.tsx        -- メインコンポーネント（~150行）
  EventDetailDialog.tsx       -- イベント詳細表示（~100行）
  EventCreateDialog.tsx       -- 新規イベント作成（~120行）
  EventEditDialog.tsx         -- イベント編集（~120行、新規）
  TimeInput.tsx               -- 時間入力コンポーネント（~50行、新規）
  constants.ts                -- 色・種別定数
  types.ts                    -- 型定義
```

### 3.4 イベント編集機能

```
イベントクリック -> 詳細ダイアログ表示
  +-- 「編集」ボタン -> 編集ダイアログに切替
  |     +-- タイトル（Input）
  |     +-- 種別（Select: TODO/会議/その他）
  |     +-- 日付（shadcn DatePicker）
  |     +-- 終日/時間指定 切替（Switch）
  |     +-- 時間入力（Selectベースの時間選択、15分刻み）
  |     +-- メモ（Textarea）
  |     +-- 保存/キャンセル
  +-- 「削除」ボタン -> 削除確認ダイアログ
  +-- 案件リンク（紐づいている場合）
```

**編集制限ルール:**
- `progress`や`todo`から自動生成されたイベントは読み取り専用。編集は元の画面（進捗/TODO）で行う
- カスタムイベント（`custom-` prefix）のみ編集可能

### 3.5 時間入力コンポーネント

```typescript
// src/components/calendar/TimeInput.tsx
// shadcn/ui の Select をベースに 15分刻みの時間選択

// 06:00 ~ 21:45 の選択肢を生成（64個）
const TIME_OPTIONS = Array.from({ length: 64 }, (_, i) => {
  const hours = Math.floor(i / 4) + 6;
  const minutes = (i % 4) * 15;
  const value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return { value, label: value };
});
```

**モバイル対応:** 画面幅 768px 未満では `<input type="time">` にフォールバック（OS標準のタイムピッカー）。

### 3.6 shadcn DatePicker移行

既存の `src/components/ui/date-picker.tsx` をそのまま活用可能:
- FullCalendarの`dateClick`で取得される`YYYY-MM-DD`形式はDatePickerの`value`と互換
- DatePickerの`onChange`が返す`yyyy-MM-dd`形式はAPIリクエストにそのまま使用可能

### 3.7 太陽光業界の実務的観点

- 会議の時間帯は「午前/午後」の大枠で入れることが多い。15分刻みのSelect UIが適切（1分刻みは過剰）
- 将来拡張として「電力回答予定日」「法令許可予定日」等の案件マイルストーン日付をカレンダーに自動表示。イベントの`type`に `milestone` を追加するスキーマ設計を見据える

### 3.8 エッジケース

1. 時間帯を跨ぐイベント: 開始時間 > 終了時間の場合にバリデーションエラー表示
2. 終日イベントから時間指定への切替: `isAllDay`トグル時にデフォルト値（09:00-17:00）を設定
3. 既存の終日イベント: DBマイグレーション後もstartTime/endTimeはnullのまま保持
4. タイムゾーン: 日本固定（`Asia/Tokyo`）前提

---

## 4. 横断的考慮事項

### 4.1 既存UIとの一貫性

3機能すべてで既に使用されているshadcn/uiコンポーネント群を一貫して使用:
`Card`, `Dialog`, `Select`, `Popover`, `Calendar`, `Badge`, `Button`, `Input`, `Textarea`, `Label`, `Switch`

独自UIコンポーネントの新規作成は最小限に抑える。

### 4.2 将来の拡張ロードマップ

| 機能 | 短期（今回実装） | 中期（3ヶ月後） | 長期（6ヶ月後） |
|------|-----------------|----------------|----------------|
| タイムライン | 横型表示 + ノード編集 | ガントチャート表示切替 | 複数案件の横断タイムライン比較 |
| パネルレイアウト | プルダウン選択 + 容量自動計算 | SVGベースのレイアウト図面プレビュー | パネル配置シミュレーション（傾斜解析連携） |
| カレンダー | 時間入力 + 編集 + DatePicker | 案件マイルストーン自動同期 | Googleカレンダー/Outlook連携 |

### 4.3 パフォーマンス

- タイムラインの再計算: クライアントサイドで完結（`calculateWorkflowTimeline`は軽量）
- カレンダーイベント取得: 既にSWRキャッシュ（5分）使用中。編集後は`mutate()`で即時更新
- パネルレイアウトの計算: 純粋関数。`useMemo`でメモ化

### 4.4 300行ルール 影響ファイル一覧

| ファイル | 現在行数 | 対応 |
|---------|---------|------|
| `FullCalendarView.tsx` | 498行 | 分割必須（3.3参照） |
| `schedule/page.tsx` | 477行 | 横型タイムライン実装後に分割 |
| `WorkflowTimeline.tsx` | 350行 | 横型タイムラインとして再構成（1.5参照） |

---

## 5. 実装優先順位

**推奨順序: 2 -> 3 -> 1**

### 第1位: パネルレイアウト選択（工数: 小）

- 変更範囲が最も小さい（新規コンポーネント1つ + APIルート修正）
- 既存DBカラムをそのまま活用
- 依存関係なし

### 第2位: カレンダー機能強化（工数: 中）

- FullCalendarView.tsxの分割を先行実施
- その上で時間入力・編集機能を追加する2段階アプローチ
- DBマイグレーション（ALTER TABLE ADD COLUMN）が必要

### 第3位: 横型Gitツリータイムライン（工数: 大）

- 影響範囲が最も広い
- レスポンシブ設計の検証に時間がかかる
- 既存のWorkflowTimeline.tsxとschedule/page.tsxの両方を再構成する必要あり
