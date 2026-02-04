import { createClient, Client } from "@libsql/client";
import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

let client: Client | null = null;
let dbInstance: LibSQLDatabase<typeof schema> | null = null;
let initialized = false;

function getClient(): Client {
  if (!client) {
    if (!process.env.TURSO_DATABASE_URL) {
      throw new Error("TURSO_DATABASE_URL is not set");
    }
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

export const db: LibSQLDatabase<typeof schema> = new Proxy({} as LibSQLDatabase<typeof schema>, {
  get(_, prop) {
    if (!dbInstance) {
      initDb(); // 背景で初期化（非同期だが、次は待たれる）
      dbInstance = drizzle(getClient(), { schema });
    }
    return (dbInstance as unknown as Record<string, unknown>)[prop as string];
  },
});

// テーブル作成（初回のみ）
async function initDb() {
  if (initialized) return;
  
  const c = getClient();
  
  await c.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      management_number TEXT NOT NULL,
      manager TEXT NOT NULL,
      client TEXT NOT NULL,
      project_number TEXT NOT NULL,
      completion_month TEXT,
      address TEXT,
      coordinates TEXT,
      landowner TEXT
    )
  `);

  // カラム追加用（既存テーブルへの対応）
  try { await c.execute(`ALTER TABLE projects ADD COLUMN address TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN coordinates TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN land_category_1 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN land_category_2 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN land_category_3 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN land_area_1 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN land_area_2 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN land_area_3 TEXT`); } catch (e) {}
  // 地権者を3つに拡張（既存のlandownerカラムがある場合はlandowner_1に移行）
  try { await c.execute(`ALTER TABLE projects ADD COLUMN landowner_1 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN landowner_2 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN landowner_3 TEXT`); } catch (e) {}
  try { await c.execute(`UPDATE projects SET landowner_1 = landowner WHERE landowner IS NOT NULL AND landowner_1 IS NULL`); } catch (e) {}

  // 地権者追加情報（住所、相続有無、更正登記有無、抵当権有無）
  try { await c.execute(`ALTER TABLE projects ADD COLUMN landowner_address_1 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN landowner_address_2 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN landowner_address_3 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN inheritance_status_1 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN inheritance_status_2 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN inheritance_status_3 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN correction_registration_1 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN correction_registration_2 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN correction_registration_3 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN mortgage_status_1 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN mortgage_status_2 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN mortgage_status_3 TEXT`); } catch (e) {}

  // 環境データ（垂直積雪量、風速）
  try { await c.execute(`ALTER TABLE projects ADD COLUMN vertical_snow_load TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN wind_speed TEXT`); } catch (e) {}

  // 外部連携（どこキャビ）
  try { await c.execute(`ALTER TABLE projects ADD COLUMN dococabi_link TEXT`); } catch (e) {}

  // ===== Excel案件表カラム追加（2026年2月） =====
  // 基本情報
  try { await c.execute(`ALTER TABLE projects ADD COLUMN availability TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN business_type TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN design_power TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN sales TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN parcel_count TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN prefecture TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN blank_1 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN link TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN agreement_month TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN project_submission_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN project_submission_date TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN felling_consent_request TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN felling_consent_complete TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN site_investigation TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN level TEXT`); } catch (e) {}

  // 土地契約関連
  try { await c.execute(`ALTER TABLE projects ADD COLUMN land_contract_request_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN land_contract_request TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN land_contract_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN land_contract_date TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN land_price TEXT`); } catch (e) {}

  // 地権者情報（統合）
  try { await c.execute(`ALTER TABLE projects ADD COLUMN landowner TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN landowner_address TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN land_area_total TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN correction_status TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN inheritance_status TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN mortgage_status TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN hazard_at_home TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN photo TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN snowfall TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN wind_speed_value TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN neighborhood_felling TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN land_remarks TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN land_category TEXT`); } catch (e) {}

  // 農振関連
  try { await c.execute(`ALTER TABLE projects ADD COLUMN nourin_status TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN nourin_scrivener_request TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN nourin_application_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN nourin_application_date TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN nourin_completion_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN nourin_completion_date TEXT`); } catch (e) {}

  // 農転関連
  try { await c.execute(`ALTER TABLE projects ADD COLUMN nouten_status TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN land_category_change_request TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN nouten_scrivener_request TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN nouten_application_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN nouten_application_date TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN nouten_completion_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN nouten_completion_date TEXT`); } catch (e) {}

  // 規制・造成関連
  try { await c.execute(`ALTER TABLE projects ADD COLUMN regulation_category TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN development_status TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN residential_dev_application_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN residential_dev_application_date TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN residential_dev_completion_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN residential_dev_completion_date TEXT`); } catch (e) {}

  // その他法令関連
  try { await c.execute(`ALTER TABLE projects ADD COLUMN other_regulations TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN regulation_application_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN regulation_application_payment_date TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN regulation_permit_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN regulation_permit_date TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN completion_notification TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN regulation_remarks TEXT`); } catch (e) {}

  // モジュール・システム関連
  try { await c.execute(`ALTER TABLE projects ADD COLUMN module_type TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN module_count TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN module_capacity TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN system_capacity TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN power_simulation TEXT`); } catch (e) {}

  // 電力関連
  try { await c.execute(`ALTER TABLE projects ADD COLUMN power_company TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN power_application_destination TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN power_application_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN power_application_date TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN power_response_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN power_response_date TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN estimated_burden TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN additional_burden TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN burden_payment_date TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN interconnection_status TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN interconnection_details TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN power_remarks TEXT`); } catch (e) {}

  // 土地決済関連
  try { await c.execute(`ALTER TABLE projects ADD COLUMN land_settlement_doc_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN land_settlement_doc_collection TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN land_settlement_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN land_settlement_date TEXT`); } catch (e) {}

  // 所有権移転登記関連
  try { await c.execute(`ALTER TABLE projects ADD COLUMN ownership_transfer_app_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN ownership_transfer_application TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN ownership_transfer_comp_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN ownership_transfer_completion TEXT`); } catch (e) {}

  // 費用関連
  try { await c.execute(`ALTER TABLE projects ADD COLUMN development_cost TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN surveying_cost TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN administrative_cost TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN other_cost_total TEXT`); } catch (e) {}

  // 近隣挨拶関連
  try { await c.execute(`ALTER TABLE projects ADD COLUMN neighbor_greeting_request_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN neighbor_greeting_request_date TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN neighbor_greeting_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN neighbor_greeting_date TEXT`); } catch (e) {}

  // SS関連
  try { await c.execute(`ALTER TABLE projects ADD COLUMN ss_request_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN ss_request_date TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN ss_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN ss_date TEXT`); } catch (e) {}

  // 注文・発注関連
  try { await c.execute(`ALTER TABLE projects ADD COLUMN order_creation_request_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN order_creation_request TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN order_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN order_date TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN delivery_date TEXT`); } catch (e) {}

  // 工事関連
  try { await c.execute(`ALTER TABLE projects ADD COLUMN construction_available_date TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN construction_start_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN construction_start_date TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN construction_end_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN construction_end_date TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN external_line_work_date TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN lead_in_work_date TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN interconnection_scheduled TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN interconnection_date TEXT`); } catch (e) {}

  // その他
  try { await c.execute(`ALTER TABLE projects ADD COLUMN burden_land_other TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN confirmation_items TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN construction_complete TEXT`); } catch (e) {}

  // 法令チェック結果（JSON形式）
  try { await c.execute(`ALTER TABLE projects ADD COLUMN legal_statuses TEXT`); } catch (e) {}

  await c.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      name TEXT,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user'
    )
  `);

  // OAuth連携用カラム追加
  try { await c.execute(`ALTER TABLE users ADD COLUMN line_id TEXT UNIQUE`); } catch (e) {}
  try { await c.execute(`ALTER TABLE users ADD COLUMN email TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE users ADD COLUMN image TEXT`); } catch (e) {}

  await c.execute(`
    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'planned',
      created_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  await c.execute(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  // todosテーブルのproject_idをnullableに変更するマイグレーション
  // SQLiteではALTER TABLEでNOT NULLを削除できないため、テーブルを再作成する
  try {
    // 既存のテーブルがproject_id NOT NULLかどうか確認
    const tableInfo = await c.execute(`PRAGMA table_info(todos)`);
    const projectIdColumn = tableInfo.rows.find((row: any) => row.name === 'project_id');

    if (projectIdColumn && projectIdColumn.notnull === 1) {
      // NOT NULL制約がある場合、テーブルを再作成
      await c.execute(`
        CREATE TABLE IF NOT EXISTS todos_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER,
          content TEXT NOT NULL,
          due_date TEXT NOT NULL,
          created_at TEXT NOT NULL,
          completed_at TEXT,
          completed_memo TEXT,
          FOREIGN KEY (project_id) REFERENCES projects(id)
        )
      `);

      // 既存データを移行
      await c.execute(`
        INSERT INTO todos_new (id, project_id, content, due_date, created_at, completed_at, completed_memo)
        SELECT id, project_id, content, due_date, created_at, completed_at, completed_memo FROM todos
      `);

      // 古いテーブルを削除
      await c.execute(`DROP TABLE todos`);

      // 新しいテーブルをリネーム
      await c.execute(`ALTER TABLE todos_new RENAME TO todos`);
    }
  } catch (e) {
    // テーブルが存在しない場合は新規作成
    await c.execute(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        content TEXT NOT NULL,
        due_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        completed_memo TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id)
      )
    `);
  }
  try { await c.execute(`ALTER TABLE todos ADD COLUMN completed_at TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE todos ADD COLUMN completed_memo TEXT`); } catch (e) {}
  // アカウント機能用カラム追加
  try { await c.execute(`ALTER TABLE todos ADD COLUMN user_id INTEGER`); } catch (e) {}
  try { await c.execute(`ALTER TABLE todos ADD COLUMN user_name TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE comments ADD COLUMN user_id INTEGER`); } catch (e) {}
  try { await c.execute(`ALTER TABLE comments ADD COLUMN user_name TEXT`); } catch (e) {}

  await c.execute(`
    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      meeting_date TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT,
      agenda TEXT
    )
  `);

  // 案件ファイルテーブル（Vercel Blob Storage）
  await c.execute(`
    CREATE TABLE IF NOT EXISTS project_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  // カテゴリカラム追加（registry_copy/cadastral_map/drawing/consent_form/other）
  try { await c.execute(`ALTER TABLE project_files ADD COLUMN category TEXT DEFAULT 'other'`); } catch (e) {}

  // 要望（フィードバック）テーブル
  await c.execute(`
    CREATE TABLE IF NOT EXISTS feedbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      page_path TEXT NOT NULL,
      page_title TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      replies TEXT,
      likes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  // 工事進捗テーブル（工程表の代わり）
  await c.execute(`
    CREATE TABLE IF NOT EXISTS construction_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      note TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  // 工事写真テーブル
  await c.execute(`
    CREATE TABLE IF NOT EXISTS construction_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      contractor_name TEXT,
      note TEXT,
      taken_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  // 古い名前を新しい名前に統一（重複データのクリーンアップ）
  // 「現地調査」→「現調」、「農転・地目申請」→「法令申請」、「連系（発電開始）」→「連系」
  const legacyTitleMigrations = [
    { oldTitle: "現地調査", newTitle: "現調" },
    { oldTitle: "農転・地目申請", newTitle: "法令申請" },
    { oldTitle: "連系（発電開始）", newTitle: "連系" },
  ];

  for (const { oldTitle, newTitle } of legacyTitleMigrations) {
    // 新しい名前が既に存在するプロジェクトから古い名前のレコードを削除
    try {
      await c.execute(`
        DELETE FROM progress 
        WHERE title = ? 
        AND project_id IN (
          SELECT DISTINCT project_id FROM progress WHERE title = ?
        )
      `, [oldTitle, newTitle]);
    } catch (e) {}

    // 残りの古い名前を新しい名前に変更
    try {
      await c.execute(`UPDATE progress SET title = ? WHERE title = ?`, [newTitle, oldTitle]);
    } catch (e) {}
  }
  
  initialized = true;
}

// 初期化関数をエクスポート
export { initDb };
