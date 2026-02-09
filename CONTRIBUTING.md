# Lepac 開発ルール

## ブランチ戦略

### ブランチ構成

```
master                  ← 本番環境（Vercel自動デプロイ）
  └── develop           ← 開発統合ブランチ
        ├── feature/windows-dev  ← Windows PC 開発用
        └── feature/mac-dev      ← Mac 開発用
```

### ブランチの役割

| ブランチ | 用途 | 直push | マージ方法 |
|---------|------|--------|-----------|
| `master` | 本番デプロイ専用 | **禁止** | PR経由のみ |
| `develop` | 開発統合・レビュー | **禁止** | PR経由のみ |
| `feature/windows-dev` | Windows日常開発 | 可 | developへPR |
| `feature/mac-dev` | Mac日常開発 | 可 | developへPR |

---

## 開発フロー

### 1. 日常開発（feature → develop）

```bash
# feature/windows-dev または feature/mac-dev で作業
git add <files>
git commit -m "feat: 機能の説明"
git push

# developへPR作成
gh pr create --base develop --title "feat: 機能の説明"
```

### 2. レビュー & FBループ

1. PRを作成すると、GitHub上で差分が確認できる
2. レビュアーがコメント・修正依頼を行う
3. 開発者がfeatureブランチで修正 → push（PRに自動反映）
4. 問題なければApprove → Merge

### 3. 本番デプロイ（develop → master）

```bash
# developが安定した状態で
gh pr create --base master --head develop --title "release: リリース内容の要約"
```

1. develop上で動作確認済みであること
2. PRレビュー＆承認
3. マージ → Vercelが自動デプロイ

---

## 禁止事項

- `master` への直push（Branch Protectionで強制）
- `develop` への直push（Branch Protectionで強制）
- `master` への force push
- レビューなしでの `develop → master` マージ

---

## コミットメッセージ規約

```
<type>: <日本語で簡潔な説明>
```

### type一覧

| type | 用途 |
|------|------|
| `feat` | 新機能追加 |
| `fix` | バグ修正 |
| `refactor` | リファクタリング（機能変更なし） |
| `chore` | ビルド・設定・依存関係の変更 |
| `docs` | ドキュメントのみの変更 |
| `test` | テストの追加・修正 |
| `style` | コードスタイルの変更（動作に影響なし） |

### 例

```
feat: カレンダーにドラッグ＆ドロップ機能を追加
fix: ファイルアップロード時のタイムアウトエラーを修正
refactor: LegalSearchTabコンポーネントを分割
chore: @turf/bboxパッケージを追加
```

---

## PR作成ルール

### タイトル

- コミットメッセージ規約と同じ `<type>: <説明>` 形式
- 70文字以内

### 本文テンプレート

```markdown
## 概要
- 変更内容の要約（箇条書き）

## 変更ファイル
- 影響範囲のあるファイル・機能

## テスト
- [ ] ローカルでビルド確認（npm run build）
- [ ] 主要機能の動作確認
- [ ] 既存テストがパスすること
```

---

## 環境別の作業開始手順

### Windows PC

```bash
cd C:/nagano/geo_checker_nextjs
git checkout feature/windows-dev
git pull origin feature/windows-dev
# developの最新を取り込む場合
git pull origin develop
npm install
npm run dev
```

### Mac

```bash
cd ~/path/to/geo_checker_nextjs
git checkout feature/mac-dev
git pull origin feature/mac-dev
# developの最新を取り込む場合
git pull origin develop
npm install
npm run dev
```

---

## developの最新を取り込む

featureブランチで作業中にdevelopの変更を取り込む場合：

```bash
git pull origin develop
# コンフリクトがあれば解消してcommit
npm install  # package.jsonに変更があれば
```

---

## 緊急時の対応（Hotfix）

本番で緊急バグが見つかった場合：

```bash
# masterから直接hotfixブランチを作成
git checkout master
git pull origin master
git checkout -b hotfix/緊急修正の説明

# 修正 → commit → push
git push -u origin hotfix/緊急修正の説明

# masterとdevelop両方にPRを作成
gh pr create --base master --title "hotfix: 緊急修正の説明"
gh pr create --base develop --title "hotfix: 緊急修正の説明"
```
