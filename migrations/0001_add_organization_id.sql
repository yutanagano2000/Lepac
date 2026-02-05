-- Phase 1: マルチテナント対応のためのorganizationId追加
-- 実行前にバックアップを取得してください

-- projects テーブルに organizationId を追加
ALTER TABLE projects ADD COLUMN organization_id INTEGER;

-- todos テーブルに organizationId を追加
ALTER TABLE todos ADD COLUMN organization_id INTEGER;

-- meetings テーブルに organizationId を追加
ALTER TABLE meetings ADD COLUMN organization_id INTEGER;

-- feedbacks テーブルに organizationId を追加
ALTER TABLE feedbacks ADD COLUMN organization_id INTEGER;

-- calendar_events テーブルに organizationId を追加
ALTER TABLE calendar_events ADD COLUMN organization_id INTEGER;

-- インデックスの追加（クエリパフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_todos_organization_id ON todos(organization_id);
CREATE INDEX IF NOT EXISTS idx_meetings_organization_id ON meetings(organization_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_organization_id ON feedbacks(organization_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_organization_id ON calendar_events(organization_id);

-- 既存データのマイグレーション（デフォルト組織ID=1を設定）
-- 本番環境では適切な組織IDを設定してください
-- UPDATE projects SET organization_id = 1 WHERE organization_id IS NULL;
-- UPDATE todos SET organization_id = 1 WHERE organization_id IS NULL;
-- UPDATE meetings SET organization_id = 1 WHERE organization_id IS NULL;
-- UPDATE feedbacks SET organization_id = 1 WHERE organization_id IS NULL;
-- UPDATE calendar_events SET organization_id = 1 WHERE organization_id IS NULL;
