# セキュリティ専門家向け 技術スタック整理資料

**プロジェクト名**: geo_checker_nextjs (太陽光発電案件管理SaaS)
**作成日**: 2026-02-10
**対象環境**: 本番 (Vercel) / 開発 (localhost)

---

## 1. アーキテクチャ概要

| 項目 | 技術 | バージョン |
|------|------|-----------|
| フレームワーク | Next.js (App Router) | 16.1.2 |
| 言語 | TypeScript | 5.9.3 |
| ランタイム | React | 19.2.3 |
| ORM | Drizzle ORM | 0.45.1 |
| DB | Turso (libSQL/SQLite) | - |
| ホスティング | Vercel (Serverless) | - |
| ファイルストレージ | Vercel Blob / Supabase Storage | - |
| 認証 | NextAuth.js v5 (beta.30) | 5.0.0-beta.30 |
| UIライブラリ | shadcn/ui + Radix UI + Tailwind CSS | - |

### デプロイ構成

```
[ブラウザ] ──HTTPS──> [Vercel Edge Network]
                          │
                          ├── Middleware (IP制限 + 認証チェック)
                          │
                          ├── Next.js App Router
                          │     ├── SSR Pages
                          │     └── API Routes (/api/*)
                          │
                          ├──> [Turso DB] (SQLite, libSQL protocol)
                          ├──> [Supabase Storage] (ファイル保存)
                          ├──> [Vercel Blob] (ファイル保存)
                          ├──> [Google Sheets API] (データ同期)
                          └──> [LINE Login] (OAuth認証)
```

---

## 2. 認証・認可

### 2.1 認証方式

| 方式 | 用途 | 実装 |
|------|------|------|
| Credentials (ID/PW) | Webログイン | bcrypt (cost 10), NextAuth.js |
| LINE OAuth | Webログイン (SSO) | NextAuth.js Provider |
| JWT (HS256) | モバイルAPI | jose ライブラリ, 7日間有効 |
| セッション (JWT) | Web全般 | NextAuth.js JWT Strategy |

### 2.2 認可モデル (RBAC + マルチテナント)

```
ユーザー ──belongs_to──> 組織 (organization_id)
  │
  ├── role: "user"  → 一般操作
  └── role: "admin" → 管理者操作 + 組織選択
```

**認証ガード関数** (`src/lib/auth-guard.ts`):

| 関数 | チェック内容 |
|------|------------|
| `requireAuth()` | ログイン済みか |
| `requireOrganization()` | ログイン + 組織所属 |
| `requireAdmin()` | ログイン + admin権限 |
| `requireProjectAccess(projectId)` | ログイン + 組織 + プロジェクト所有権 |
| `*WithCsrf()` 系 | 上記 + CSRF検証 |
| `*WithRateLimit()` 系 | 上記 + レート制限 |

### 2.3 パスワードポリシー (`src/lib/password-policy.ts`)

- 最小12文字
- 大文字・小文字・数字・特殊文字 各1文字以上必須
- bcrypt ハッシュ化

### 2.4 Middleware (`src/middleware.ts`)

- **IP制限**: 環境変数 `IP_RESTRICTION_ENABLED=true` で有効化
  - 許可IP: 環境変数 `ALLOWED_IPS` + ハードコード3件
  - ヘッダー優先順: `x-vercel-forwarded-for` > `cf-connecting-ip` > `x-forwarded-for`
- **認証**: NextAuth middleware統合
- **除外パス**: `api`, `_next/static`, `_next/image`, `*.png`

---

## 3. セキュリティ機能

### 3.1 CSRF保護 (`src/lib/csrf-protection.ts`)

- Origin/Referer ヘッダー検証
- `timingSafeEqual()` によるタイミング攻撃対策
- GET/HEAD/OPTIONS はスキップ
- 許可オリジン: Vercel URL, NEXTAUTH_URL, localhost (開発時)

### 3.2 レート制限 (`src/lib/rate-limit.ts`)

| エンドポイント種別 | 制限 | ウィンドウ |
|------------------|------|----------|
| ログイン | 5回 | 5分 |
| API一般 | 100回 | 1分 |
| 厳格 (パスワードリセット等) | 3回 | 15分 |

- SQLiteベース、アトミック更新
- クリーンアップ関数あり (`cleanupOldRateLimits()`)

### 3.3 監査ログ (`src/lib/audit-log.ts`)

**記録イベント**: `create`, `read`, `update`, `delete`, `login`, `logout`, `login_failed`

**記録内容**:
- userId, userName, action, resourceType, resourceId
- ipAddress, userAgent, details (JSON)
- **機密データ自動除去**: `password`, `token`, `apiKey`, `ssn` 等 → `[REDACTED]`

### 3.4 入力検証 (`src/lib/validations.ts`)

- **Zodスキーマ**: 100+フィールド定義
- `parseValidId()`: SQLインジェクション対策 (正の整数のみ)
- `isPathSafe()`: パストラバーサル検証 (`..`, 絶対パス, NULLバイト, 制御文字を拒否)
- `sanitizeString()`: HTMLタグ除去 (XSS対策)

---

## 4. API エンドポイント一覧 (53件)

### 4.1 公開API (認証不要)

| パス | メソッド | 用途 | 保護 |
|------|---------|------|------|
| `/api/auth/[...nextauth]` | ALL | NextAuth認証 | NextAuth内部 |
| `/api/register-initial-user` | POST | 初期ユーザー登録 | 本番環境無効, setupKey必須, timingSafeEqual |
| `/api/mobile/auth/credentials` | POST | モバイルログイン | レート制限(login), タイミング攻撃対策 |
| `/api/mobile/auth/line` | POST | LINE OAuth (モバイル) | - |
| `/api/mobile/auth/line/code` | POST | LINE認証コード交換 | - |

### 4.2 認証必須API (主要なもの)

| カテゴリ | エンドポイント数 | 認証ガード |
|---------|----------------|-----------|
| プロジェクト管理 | 18 | `requireProjectAccess` / `WithCsrf` |
| ファイル管理 | 6 | `requireProjectAccess` / `WithCsrf` |
| 組織・ユーザー | 5 | `requireAuth` / `requireOrganization` |
| カレンダー・会議・TODO | 7 | `requireOrganization` / `WithCsrf` |
| フィードバック | 3 | `requireOrganization` |
| 工事管理 | 3 | `requireOrganization` |
| ダッシュボード・検索等 | 4 | `requireOrganization` |
| 管理者専用 | 1 | `requireAdmin` |
| Cron同期 | 1 | セッション OR CRON_SECRET Bearer |

---

## 5. データベーススキーマ (主要テーブル)

### 5.1 セキュリティ関連

| テーブル | 用途 | センシティブ項目 |
|---------|------|----------------|
| `users` | ユーザー管理 | password (bcrypt), email, lineId |
| `organizations` | 組織管理 | code (招待コード) |
| `auditLogs` | 監査ログ | ipAddress, userAgent, details |
| `rateLimits` | レート制限 | identifier (IP/ユーザーID) |

### 5.2 ビジネスデータ

| テーブル | 用途 | センシティブ項目 |
|---------|------|----------------|
| `projects` | 案件管理 (240+カラム) | 地権者名・住所, 座標, 土地代, 費用情報 |
| `projectFiles` | ファイルメタ | fileUrl (Vercel Blob URL) |
| `constructionPhotos` | 工事写真 | contractorName, photoUrl |
| `comments` | コメント | 内容テキスト |
| `todos` | TODO | 内容テキスト |
| `meetings` | 会議記録 | 参加者, 内容 |
| `feedbacks` | フィードバック | ユーザー投稿内容 |
| `mapAnnotations` | 地図注釈 | GeoJSON, 座標 |
| `slopeAnalyses` | 傾斜解析 | 座標, 解析結果 |

**マルチテナント分離**: 全テーブルで `organizationId` カラムによるデータ分離

---

## 6. 外部サービス接続

### 6.1 接続先一覧

| サービス | プロトコル | 用途 | 認証方式 |
|---------|-----------|------|---------|
| Turso (libSQL) | HTTPS (WebSocket) | メインDB | Auth Token |
| Supabase Storage | HTTPS | ファイル保存 (レガシー) | Service Role Key |
| Vercel Blob | HTTPS | ファイル保存 (メイン) | Read/Write Token |
| Google Sheets API | HTTPS | データ同期 | Service Account Key |
| LINE Login | HTTPS (OAuth 2.0) | SSO認証 | Client ID/Secret |
| GSI (国土地理院) | HTTPS | 地図タイル配信 | 不要 (公開API) |
| Cesium Ion | HTTPS | 3D地形データ | Public Token |

### 6.2 環境変数 (シークレット)

```
# 認証
AUTH_SECRET                    # NextAuth.js署名キー
LINE_CLIENT_ID                 # LINE OAuth
LINE_CLIENT_SECRET             # LINE OAuth

# データベース
TURSO_DATABASE_URL             # Turso接続URL
TURSO_AUTH_TOKEN               # Turso認証トークン

# ストレージ
SUPABASE_URL                   # Supabase URL
SUPABASE_SERVICE_ROLE_KEY      # Supabase管理者キー (全バケットアクセス)
BLOB_READ_WRITE_TOKEN          # Vercel Blob RWトークン

# 外部API
GOOGLE_SERVICE_ACCOUNT_EMAIL   # Google SA メール
GOOGLE_PRIVATE_KEY             # Google SA 秘密鍵
GOOGLE_SHEETS_SPREADSHEET_ID   # 同期先スプレッドシート
GOOGLE_SHEETS_SHEET_NAME       # 同期先シート名

# セキュリティ
CRON_SECRET                    # Vercel Cron認証
ALLOWED_IPS                    # IP制限許可リスト
IP_RESTRICTION_ENABLED         # IP制限有効フラグ
INITIAL_SETUP_KEY              # 初期セットアップ用 (本番無効)

# 公開トークン
NEXT_PUBLIC_CESIUM_ION_TOKEN   # Cesium (クライアント公開)
```

---

## 7. セキュリティヘッダー設定 (`next.config.ts`)

| ヘッダー | 値 | 備考 |
|---------|---|------|
| Strict-Transport-Security | max-age=63072000; includeSubDomains; preload | HSTS有効 |
| X-Frame-Options | SAMEORIGIN | クリックジャッキング対策 |
| X-Content-Type-Options | nosniff | MIMEスニッフィング防止 |
| X-XSS-Protection | 1; mode=block | ブラウザXSSフィルター |
| Referrer-Policy | strict-origin-when-cross-origin | リファラー制御 |
| Permissions-Policy | camera=(), microphone=(), geolocation=(self) | 機能制限 |
| Content-Security-Policy | (下記参照) | CSP |

### CSP詳細

```
default-src 'self';
script-src  'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.plot.ly;
style-src   'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com;
img-src     'self' data: blob: https://*.tile.openstreetmap.org https://cyberjapandata.gsi.go.jp ...;
connect-src 'self' https://*.turso.io https://*.supabase.co ...;
frame-src   'none';
object-src  'none';
base-uri    'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
```

**注意点**: `'unsafe-eval'` と `'unsafe-inline'` が script-src に含まれる (Next.js/Plotly要件)

---

## 8. ファイルアップロード・ダウンロード

### アップロード

| 項目 | 実装 |
|------|------|
| 許可MIMEタイプ | `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `application/pdf` |
| サイズ上限 | 通常10MB / 工事写真20MB |
| ファイル名サニタイズ | `[^a-zA-Z0-9._-]` → `_`, `path.basename()` |
| パストラバーサル対策 | `isPathSafe()` 検証 |
| 衝突防止 | `randomUUID()` + `addRandomSuffix` |
| CSRF保護 | `requireProjectAccessWithCsrf()` |

### ダウンロード

| 項目 | 実装 |
|------|------|
| 認証 | `requireProjectAccess(projectId)` |
| パス検証 | `isPathSafe()` |
| ホスト検証 | Supabase URLのみ許可 |
| Supabase | 署名付きURL (1時間有効) |
| Vercel Blob | 直接リダイレクト |

---

## 9. 既知のセキュリティ考慮事項

### 高優先度

| 項目 | 現状 | リスク |
|------|------|--------|
| CSP unsafe-eval/inline | Next.js/Plotly要件で使用中 | XSS攻撃の緩和効果低下 |
| Vercel Blob公開モード | `public`アクセスモード | DBレコード削除後もURL有効 |
| next-auth beta版 | v5.0.0-beta.30 | 未リリース版のセキュリティリスク |

### 中優先度

| 項目 | 現状 | リスク |
|------|------|--------|
| IP制限ハードコード | 3件のIPがソースにハードコード | 管理分散、監査困難 |
| 監査ログ保持期間 | 無期限 | ストレージ肥大化、GDPR等 |
| レート制限クリーンアップ | 関数あり、定期実行なし | テーブル肥大化 |
| LINE認証ユーザーPW | ランダム生成、本人不知 | PW認証切替不可 |

### 低優先度

| 項目 | 現状 | リスク |
|------|------|--------|
| CORS | 未設定 (Same-Origin) | モバイルアプリ対応時に要設定 |
| 2FA | 未実装 | アカウント乗っ取りリスク |
| JWT Secret開発フォールバック | 警告表示のみ | 開発環境での弱いシークレット |

---

## 10. テスト体制

| 種別 | ツール | 備考 |
|------|-------|------|
| ユニットテスト | Vitest + Testing Library | - |
| E2Eテスト | Playwright | 複数ブラウザ対応 |
| リンター | ESLint | next.config統合 |
| モック | MSW (Mock Service Worker) | API モック |

---

## 11. 主要セキュリティファイルパス

```
src/
├── auth.ts                          # NextAuth設定 (認証プロバイダー)
├── auth.config.ts                   # 認証リダイレクト・公開パス定義
├── middleware.ts                    # IP制限 + 認証ミドルウェア
├── lib/
│   ├── auth-guard.ts                # 認証ガード関数群
│   ├── csrf-protection.ts           # CSRF保護
│   ├── rate-limit.ts                # レート制限
│   ├── audit-log.ts                 # 監査ログ
│   ├── jwt.ts                       # モバイルJWT発行・検証
│   ├── password-policy.ts           # パスワードポリシー
│   ├── validations.ts               # Zodスキーマ + 入力検証
│   └── supabase.ts                  # Supabase接続 (Service Role)
├── db/
│   ├── index.ts                     # DB初期化 + Proxy
│   ├── schema.ts                    # 全テーブル定義
│   └── migrations.ts                # マイグレーション
└── app/api/                         # 全APIルート (53エンドポイント)

next.config.ts                       # セキュリティヘッダー + CSP
vercel.json                          # Cron設定
.env.local                           # シークレット (Git除外)
```

---

*本資料はセキュリティ専門家との相談用に作成されたものです。*
*実際のシークレット値は含まれていません。*
