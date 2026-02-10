// Database migrations - extracted from src/db/index.ts
// All CREATE TABLE, ALTER TABLE, CREATE INDEX statements

export async function runMigrations(client: { execute: (sql: string, args?: unknown[]) => Promise<unknown> }): Promise<void> {
  await client.execute(`
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
  try { await client.execute(`ALTER TABLE projects ADD COLUMN address TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN coordinates TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN land_category_1 TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN land_category_2 TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN land_category_3 TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN land_area_1 TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN land_area_2 TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN land_area_3 TEXT`); } catch (e) {}
  // 地権者を3つに拡張（既存のlandownerカラムがある場合はlandowner_1に移行）
  try { await client.execute(`ALTER TABLE projects ADD COLUMN landowner_1 TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN landowner_2 TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN landowner_3 TEXT`); } catch (e) {}
  try { await client.execute(`UPDATE projects SET landowner_1 = landowner WHERE landowner IS NOT NULL AND landowner_1 IS NULL`); } catch (e) {}
  // 地権者フリガナ
  try { await client.execute(`ALTER TABLE projects ADD COLUMN landowner_1_kana TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN landowner_2_kana TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN landowner_3_kana TEXT`); } catch (e) {}

  // 地権者追加情報（住所、相続有無、更正登記有無、抵当権有無）
  try { await client.execute(`ALTER TABLE projects ADD COLUMN landowner_address_1 TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN landowner_address_2 TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN landowner_address_3 TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN inheritance_status_1 TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN inheritance_status_2 TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN inheritance_status_3 TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN correction_registration_1 TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN correction_registration_2 TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN correction_registration_3 TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN mortgage_status_1 TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN mortgage_status_2 TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN mortgage_status_3 TEXT`); } catch (e) {}

  // 環境データ（垂直積雪量、風速）
  try { await client.execute(`ALTER TABLE projects ADD COLUMN vertical_snow_load TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN wind_speed TEXT`); } catch (e) {}

  // 外部連携（どこキャビ）
  try { await client.execute(`ALTER TABLE projects ADD COLUMN dococabi_link TEXT`); } catch (e) {}

  // ===== Excel案件表カラム追加（2026年2月） =====
  // 基本情報
  try { await client.execute(`ALTER TABLE projects ADD COLUMN availability TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN business_type TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN design_power TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN sales TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN parcel_count TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN prefecture TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN blank_1 TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN link TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN agreement_month TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN project_submission_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN project_submission_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN felling_consent_request TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN felling_consent_complete TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN site_investigation TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN level TEXT`); } catch (e) {}

  // 土地契約関連
  try { await client.execute(`ALTER TABLE projects ADD COLUMN land_contract_request_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN land_contract_request TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN land_contract_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN land_contract_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN land_price TEXT`); } catch (e) {}

  // 地権者情報（統合）
  try { await client.execute(`ALTER TABLE projects ADD COLUMN landowner TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN landowner_address TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN land_area_total TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN correction_status TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN inheritance_status TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN mortgage_status TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN hazard_at_home TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN photo TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN snowfall TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN wind_speed_value TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN neighborhood_felling TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN land_remarks TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN land_category TEXT`); } catch (e) {}

  // 農振関連
  try { await client.execute(`ALTER TABLE projects ADD COLUMN nourin_status TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN nourin_scrivener_request TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN nourin_application_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN nourin_application_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN nourin_completion_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN nourin_completion_date TEXT`); } catch (e) {}

  // 農転関連
  try { await client.execute(`ALTER TABLE projects ADD COLUMN nouten_status TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN land_category_change_request TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN nouten_scrivener_request TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN nouten_application_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN nouten_application_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN nouten_completion_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN nouten_completion_date TEXT`); } catch (e) {}

  // 規制・造成関連
  try { await client.execute(`ALTER TABLE projects ADD COLUMN regulation_category TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN development_status TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN residential_dev_application_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN residential_dev_application_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN residential_dev_completion_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN residential_dev_completion_date TEXT`); } catch (e) {}

  // その他法令関連
  try { await client.execute(`ALTER TABLE projects ADD COLUMN other_regulations TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN regulation_application_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN regulation_application_payment_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN regulation_permit_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN regulation_permit_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN completion_notification TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN regulation_remarks TEXT`); } catch (e) {}

  // モジュール・システム関連
  try { await client.execute(`ALTER TABLE projects ADD COLUMN module_type TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN module_count TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN module_capacity TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN system_capacity TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN power_simulation TEXT`); } catch (e) {}

  // 電力関連
  try { await client.execute(`ALTER TABLE projects ADD COLUMN power_company TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN power_application_destination TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN power_application_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN power_application_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN power_response_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN power_response_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN estimated_burden TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN additional_burden TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN burden_payment_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN interconnection_status TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN interconnection_details TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN power_remarks TEXT`); } catch (e) {}

  // 土地決済関連
  try { await client.execute(`ALTER TABLE projects ADD COLUMN land_settlement_doc_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN land_settlement_doc_collection TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN land_settlement_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN land_settlement_date TEXT`); } catch (e) {}

  // 所有権移転登記関連
  try { await client.execute(`ALTER TABLE projects ADD COLUMN ownership_transfer_app_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN ownership_transfer_application TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN ownership_transfer_comp_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN ownership_transfer_completion TEXT`); } catch (e) {}

  // 費用関連
  try { await client.execute(`ALTER TABLE projects ADD COLUMN development_cost TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN surveying_cost TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN administrative_cost TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN other_cost_total TEXT`); } catch (e) {}

  // 近隣挨拶関連
  try { await client.execute(`ALTER TABLE projects ADD COLUMN neighbor_greeting_request_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN neighbor_greeting_request_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN neighbor_greeting_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN neighbor_greeting_date TEXT`); } catch (e) {}

  // SS関連
  try { await client.execute(`ALTER TABLE projects ADD COLUMN ss_request_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN ss_request_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN ss_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN ss_date TEXT`); } catch (e) {}

  // 注文・発注関連
  try { await client.execute(`ALTER TABLE projects ADD COLUMN order_creation_request_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN order_creation_request TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN order_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN order_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN delivery_date TEXT`); } catch (e) {}

  // 工事関連
  try { await client.execute(`ALTER TABLE projects ADD COLUMN construction_available_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN construction_start_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN construction_start_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN construction_end_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN construction_end_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN external_line_work_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN lead_in_work_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN interconnection_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN interconnection_date TEXT`); } catch (e) {}

  // その他
  try { await client.execute(`ALTER TABLE projects ADD COLUMN burden_land_other TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN confirmation_items TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN construction_complete TEXT`); } catch (e) {}

  // 工事部向け追加フィールド（発注タブ用）
  try { await client.execute(`ALTER TABLE projects ADD COLUMN delivery_location TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN mount_order_vendor TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN mount_order_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN mount_delivery_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN mount_delivery_status TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN panel_order_vendor TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN panel_order_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN panel_delivery_scheduled TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN panel_delivery_status TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN construction_remarks TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN construction_note TEXT`); } catch (e) {}

  // 工事部向け追加フィールド（工程タブ用）
  try { await client.execute(`ALTER TABLE projects ADD COLUMN site_name TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN city_name TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN panel_count TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN panel_layout TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN load_test_status TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN load_test_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN pile_status TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN pile_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN frame_panel_status TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN frame_panel_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN electrical_status TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN electrical_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN fence_status TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN fence_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN inspection_photo_date TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE projects ADD COLUMN process_remarks TEXT`); } catch (e) {}

  // 法令チェック結果（JSON形式）
  try { await client.execute(`ALTER TABLE projects ADD COLUMN legal_statuses TEXT`); } catch (e) {}

  // マルチテナント用カラム追加
  try { await client.execute(`ALTER TABLE projects ADD COLUMN organization_id INTEGER`); } catch (e) {}
  // 既存データにデフォルト組織ID（Person Energy = 1）を設定
  try { await client.execute(`UPDATE projects SET organization_id = 1 WHERE organization_id IS NULL`); } catch (e) {}

  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      name TEXT,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user'
    )
  `);

  // OAuth連携用カラム追加
  try { await client.execute(`ALTER TABLE users ADD COLUMN line_id TEXT UNIQUE`); } catch (e) {}
  try { await client.execute(`ALTER TABLE users ADD COLUMN email TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE users ADD COLUMN image TEXT`); } catch (e) {}
  // 法人テナント用カラム追加
  try { await client.execute(`ALTER TABLE users ADD COLUMN organization_id INTEGER`); } catch (e) {}

  // 法人（組織）テーブル
  await client.execute(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    )
  `);

  // 初期組織データ投入（存在しない場合のみ）
  const initialOrgs = [
    { name: "Person Energy", code: "person-energy" },
    { name: "ROOTS", code: "roots" },
    { name: "エクソル", code: "exsol" },
    { name: "双日", code: "sojitz" },
  ];
  for (const org of initialOrgs) {
    try {
      await client.execute(
        `INSERT OR IGNORE INTO organizations (name, code, created_at) VALUES (?, ?, ?)`,
        [org.name, org.code, new Date().toISOString()]
      );
    } catch (e) {}
  }

  await client.execute(`
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

  await client.execute(`
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
    const tableInfo = await client.execute(`PRAGMA table_info(todos)`) as { rows: { name: string; notnull: number }[] };
    const projectIdColumn = tableInfo.rows.find((row: any) => row.name === 'project_id');

    if (projectIdColumn && projectIdColumn.notnull === 1) {
      // NOT NULL制約がある場合、テーブルを再作成
      await client.execute(`
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
      await client.execute(`
        INSERT INTO todos_new (id, project_id, content, due_date, created_at, completed_at, completed_memo)
        SELECT id, project_id, content, due_date, created_at, completed_at, completed_memo FROM todos
      `);

      // 古いテーブルを削除
      await client.execute(`DROP TABLE todos`);

      // 新しいテーブルをリネーム
      await client.execute(`ALTER TABLE todos_new RENAME TO todos`);
    }
  } catch (e) {
    // テーブルが存在しない場合は新規作成
    await client.execute(`
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
  try { await client.execute(`ALTER TABLE todos ADD COLUMN completed_at TEXT`); } catch (e) {}
  try { await client.execute(`ALTER TABLE todos ADD COLUMN completed_memo TEXT`); } catch (e) {}
  // アカウント機能用カラム追加
  try { await client.execute(`ALTER TABLE todos ADD COLUMN user_id INTEGER`); } catch (e) {}
  try { await client.execute(`ALTER TABLE todos ADD COLUMN user_name TEXT`); } catch (e) {}
  // マルチテナント用カラム追加
  try { await client.execute(`ALTER TABLE todos ADD COLUMN organization_id INTEGER`); } catch (e) {}
  // 既存データにデフォルト組織ID（Person Energy = 1）を設定
  try { await client.execute(`UPDATE todos SET organization_id = 1 WHERE organization_id IS NULL`); } catch (e) {}
  try { await client.execute(`ALTER TABLE comments ADD COLUMN user_id INTEGER`); } catch (e) {}
  try { await client.execute(`ALTER TABLE comments ADD COLUMN user_name TEXT`); } catch (e) {}

  await client.execute(`
    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      meeting_date TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT,
      agenda TEXT
    )
  `);
  // meetingsテーブルにマルチテナント用カラム追加
  try { await client.execute(`ALTER TABLE meetings ADD COLUMN organization_id INTEGER`); } catch (e) {}
  // 既存データにデフォルト組織ID（Person Energy = 1）を設定
  try { await client.execute(`UPDATE meetings SET organization_id = 1 WHERE organization_id IS NULL`); } catch (e) {}

  // 案件ファイルテーブル（Vercel Blob Storage）
  await client.execute(`
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
  try { await client.execute(`ALTER TABLE project_files ADD COLUMN category TEXT DEFAULT 'other'`); } catch (e) {}

  // 要望（フィードバック）テーブル
  await client.execute(`
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
  // フィードバック投稿者情報カラム追加
  try { await client.execute(`ALTER TABLE feedbacks ADD COLUMN user_id INTEGER`); } catch (e) {}
  try { await client.execute(`ALTER TABLE feedbacks ADD COLUMN user_name TEXT`); } catch (e) {}
  // マルチテナント用カラム追加
  try { await client.execute(`ALTER TABLE feedbacks ADD COLUMN organization_id INTEGER`); } catch (e) {}
  // 既存データにデフォルト組織ID（Person Energy = 1）を設定
  try { await client.execute(`UPDATE feedbacks SET organization_id = 1 WHERE organization_id IS NULL`); } catch (e) {}


  // 工事進捗テーブル（工程表の代わり）
  await client.execute(`
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
  await client.execute(`
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

  // カレンダーイベントテーブル（カスタムイベント用）
  await client.execute(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      event_type TEXT NOT NULL DEFAULT 'other',
      event_date TEXT NOT NULL,
      end_date TEXT,
      description TEXT,
      user_id INTEGER,
      user_name TEXT,
      created_at TEXT NOT NULL
    )
  `);
  // マルチテナント用カラム追加
  try { await client.execute(`ALTER TABLE calendar_events ADD COLUMN organization_id INTEGER`); } catch (e) {}
  // 既存データにデフォルト組織ID（Person Energy = 1）を設定
  try { await client.execute(`UPDATE calendar_events SET organization_id = 1 WHERE organization_id IS NULL`); } catch (e) {}

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
      await client.execute(`
        DELETE FROM progress
        WHERE title = ?
        AND project_id IN (
          SELECT DISTINCT project_id FROM progress WHERE title = ?
        )
      `, [oldTitle, newTitle]);
    } catch (e) {}

    // 残りの古い名前を新しい名前に変更
    try {
      await client.execute(`UPDATE progress SET title = ? WHERE title = ?`, [newTitle, oldTitle]);
    } catch (e) {}
  }

  // 監査ログテーブル（セキュリティインシデント追跡用）
  await client.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER,
      user_id INTEGER,
      user_name TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id INTEGER,
      resource_name TEXT,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL
    )
  `);
  // 監査ログのインデックス作成（検索パフォーマンス向上）
  try { await client.execute(`CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON audit_logs (organization_id, created_at)`); } catch (e) {}
  try { await client.execute(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs (user_id)`); } catch (e) {}
  try { await client.execute(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action)`); } catch (e) {}

  // レート制限テーブル（ブルートフォース・DDoS対策）
  await client.execute(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      request_count INTEGER NOT NULL DEFAULT 1,
      window_start TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  // レート制限のインデックス作成
  try { await client.execute(`CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint ON rate_limits (identifier, endpoint)`); } catch (e) {}
  try { await client.execute(`CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits (window_start)`); } catch (e) {}

  // 地図アノテーションテーブル（現場案内図エディタ用）
  await client.execute(`
    CREATE TABLE IF NOT EXISTS map_annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL DEFAULT '無題の案内図',
      geo_json TEXT NOT NULL,
      map_center TEXT,
      map_zoom INTEGER,
      tile_layer TEXT DEFAULT 'std',
      created_at TEXT NOT NULL,
      updated_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  // Google Sheets 同期ログテーブル
  await client.execute(`
    CREATE TABLE IF NOT EXISTS sheets_sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      synced_at TEXT NOT NULL,
      total_rows INTEGER NOT NULL,
      updated_count INTEGER NOT NULL,
      inserted_count INTEGER NOT NULL,
      skipped_count INTEGER NOT NULL,
      error_count INTEGER NOT NULL,
      errors TEXT,
      duration_ms INTEGER NOT NULL
    )
  `);

  // 検索高速化用インデックス（organization_idとの複合でスキャン範囲を限定）
  try { await client.execute(`CREATE INDEX IF NOT EXISTS idx_projects_org_management_number ON projects (organization_id, management_number)`); } catch (e) {}
  try { await client.execute(`CREATE INDEX IF NOT EXISTS idx_projects_org_client ON projects (organization_id, client)`); } catch (e) {}
  try { await client.execute(`CREATE INDEX IF NOT EXISTS idx_projects_org_address ON projects (organization_id, address)`); } catch (e) {}
  try { await client.execute(`CREATE INDEX IF NOT EXISTS idx_todos_org_content ON todos (organization_id, content)`); } catch (e) {}
  try { await client.execute(`CREATE INDEX IF NOT EXISTS idx_meetings_org_title ON meetings (organization_id, title)`); } catch (e) {}
}
