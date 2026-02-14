import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

// 法人（組織）テーブル
export const organizations = sqliteTable("organizations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(), // 法人名
  code: text("code").notNull().unique(), // 法人コード（URLスラッグ用）
  createdAt: text("created_at").notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // マルチテナント
  organizationId: integer("organization_id"), // 所属組織ID
  // 基本情報
  managementNumber: text("management_number").notNull(), // 管理番号
  manager: text("manager").notNull(), // 担当
  client: text("client").notNull(), // 販売先
  projectNumber: text("project_number").notNull(), // 販売店 案件番号
  availability: text("availability"), // 可否
  businessType: text("business_type"), // 業務
  designPower: text("design_power"), // 設計/電力
  sales: text("sales"), // 営業
  parcelCount: text("parcel_count"), // 筆数
  prefecture: text("prefecture"), // 都道府県
  blank1: text("blank_1"), // (空白)
  link: text("link"), // リンク
  agreementMonth: text("agreement_month"), // 合意書 計上月
  projectSubmissionScheduled: text("project_submission_scheduled"), // 案件提出 予定日
  projectSubmissionDate: text("project_submission_date"), // 案件提出日
  fellingConsentRequest: text("felling_consent_request"), // 伐採/工事 承諾書依頼
  fellingConsentComplete: text("felling_consent_complete"), // 伐採/工事 承諾書揃う
  siteInvestigation: text("site_investigation"), // 現調
  level: text("level"), // レベル

  // 土地契約関連
  landContractRequestScheduled: text("land_contract_request_scheduled"), // 土地売契 依頼予定日
  landContractRequest: text("land_contract_request"), // 土地売契 依頼
  landContractScheduled: text("land_contract_scheduled"), // 土地契約 締結予定日
  landContractDate: text("land_contract_date"), // 土地契約 締結日
  landPrice: text("land_price"), // 土地代

  // 地権者情報（統合）
  landowner: text("landowner"), // 地権者
  landownerAddress: text("landowner_address"), // 地権者住所
  landAreaTotal: text("land_area_total"), // 土地 ㎡数
  correctionStatus: text("correction_status"), // 更正 有無
  inheritanceStatus: text("inheritance_status"), // 相続 有無
  mortgageStatus: text("mortgage_status"), // 抵当権 有無
  hazardAtHome: text("hazard_at_home"), // ハザード（アットホーム）
  photo: text("photo"), // 写真
  snowfall: text("snowfall"), // 積雪
  windSpeedValue: text("wind_speed_value"), // 風速
  neighborhoodFelling: text("neighborhood_felling"), // 近隣伐採
  landRemarks: text("land_remarks"), // 土地備考
  landCategory: text("land_category"), // 地目

  // 農振関連
  nourinStatus: text("nourin_status"), // 農振 有無
  nourinScrivenerRequest: text("nourin_scrivener_request"), // 農振 行政書士依頼
  nourinApplicationScheduled: text("nourin_application_scheduled"), // 農振 申請予定日
  nourinApplicationDate: text("nourin_application_date"), // 農振 申請日
  nourinCompletionScheduled: text("nourin_completion_scheduled"), // 農振 完了予定日
  nourinCompletionDate: text("nourin_completion_date"), // 農振 完了日

  // 農転関連
  noutenStatus: text("nouten_status"), // 農転 有無
  landCategoryChangeRequest: text("land_category_change_request"), // 地目変更 営業への依頼
  noutenScrivenerRequest: text("nouten_scrivener_request"), // 農転 行政書士依頼
  noutenApplicationScheduled: text("nouten_application_scheduled"), // 農転/地目 申請予定日
  noutenApplicationDate: text("nouten_application_date"), // 農転/地目 申請日
  noutenCompletionScheduled: text("nouten_completion_scheduled"), // 農転/地目 完了予定日
  noutenCompletionDate: text("nouten_completion_date"), // 農転/地目 完了日

  // 規制・造成関連
  regulationCategory: text("regulation_category"), // 規制 区分
  developmentStatus: text("development_status"), // 造成 有無
  residentialDevApplicationScheduled: text("residential_dev_application_scheduled"), // 宅造法 申請予定日
  residentialDevApplicationDate: text("residential_dev_application_date"), // 宅造法 申請日
  residentialDevCompletionScheduled: text("residential_dev_completion_scheduled"), // 宅造法 完了予定日
  residentialDevCompletionDate: text("residential_dev_completion_date"), // 宅造法 完了日

  // その他法令関連
  otherRegulations: text("other_regulations"), // その他 法令
  regulationApplicationScheduled: text("regulation_application_scheduled"), // 法令申請予定日
  regulationApplicationPaymentDate: text("regulation_application_payment_date"), // 法令申請日 支払日
  regulationPermitScheduled: text("regulation_permit_scheduled"), // 法令許可予定日
  regulationPermitDate: text("regulation_permit_date"), // 法令許可日
  completionNotification: text("completion_notification"), // 完了届
  regulationRemarks: text("regulation_remarks"), // 法令備考

  // モジュール・システム関連
  moduleType: text("module_type"), // ﾓｼﾞｭｰﾙ
  moduleCount: text("module_count"), // ﾓｼﾞｭｰﾙ 枚数
  moduleCapacity: text("module_capacity"), // ﾓｼﾞｭｰﾙ 容量
  systemCapacity: text("system_capacity"), // ｼｽﾃﾑ 容量
  powerSimulation: text("power_simulation"), // 発電シミュレーション

  // 電力関連
  powerCompany: text("power_company"), // 電力 会社
  powerApplicationDestination: text("power_application_destination"), // 電力申請 申請先
  powerApplicationScheduled: text("power_application_scheduled"), // 電力 申請予定日
  powerApplicationDate: text("power_application_date"), // 電力 申請日
  powerResponseScheduled: text("power_response_scheduled"), // 電力 回答予定日
  powerResponseDate: text("power_response_date"), // 電力 回答日
  estimatedBurden: text("estimated_burden"), // 概算 負担金額
  additionalBurden: text("additional_burden"), // 追加 負担金額
  burdenPaymentDate: text("burden_payment_date"), // 負担金 支払日
  interconnectionStatus: text("interconnection_status"), // 連系可否
  interconnectionDetails: text("interconnection_details"), // 連系詳細
  powerRemarks: text("power_remarks"), // 電力備考

  // 土地決済関連
  landSettlementDocScheduled: text("land_settlement_doc_scheduled"), // 土地決済書類回収予定
  landSettlementDocCollection: text("land_settlement_doc_collection"), // 土地決済書類回収
  landSettlementScheduled: text("land_settlement_scheduled"), // 土地決済予定日
  landSettlementDate: text("land_settlement_date"), // 土地 決済日

  // 所有権移転登記関連
  ownershipTransferAppScheduled: text("ownership_transfer_app_scheduled"), // 所有権移転登記申請予定
  ownershipTransferApplication: text("ownership_transfer_application"), // 所有権移転登記申請
  ownershipTransferCompScheduled: text("ownership_transfer_comp_scheduled"), // 所有権移転登記完了予定
  ownershipTransferCompletion: text("ownership_transfer_completion"), // 所有権移転登記完了

  // 費用関連
  developmentCost: text("development_cost"), // 造成費用
  surveyingCost: text("surveying_cost"), // 測量費用
  administrativeCost: text("administrative_cost"), // 行政費用
  otherCostTotal: text("other_cost_total"), // その他 費用合計

  // 近隣挨拶関連
  neighborGreetingRequestScheduled: text("neighbor_greeting_request_scheduled"), // 近隣挨拶 依頼予定日
  neighborGreetingRequestDate: text("neighbor_greeting_request_date"), // 近隣挨拶 依頼日
  neighborGreetingScheduled: text("neighbor_greeting_scheduled"), // 近隣挨拶 予定日
  neighborGreetingDate: text("neighbor_greeting_date"), // 近隣挨拶 実施日

  // SS関連
  ssRequestScheduled: text("ss_request_scheduled"), // SS 依頼予定日
  ssRequestDate: text("ss_request_date"), // SS 依頼日
  ssScheduled: text("ss_scheduled"), // SS 予定日
  ssDate: text("ss_date"), // SS 実施日

  // 注文・発注関連
  orderCreationRequestScheduled: text("order_creation_request_scheduled"), // 注文書作成依頼予定
  orderCreationRequest: text("order_creation_request"), // 注文書作成依頼
  orderScheduled: text("order_scheduled"), // 発注予定日
  orderDate: text("order_date"), // 発注日
  deliveryDate: text("delivery_date"), // 納品日

  // 工事関連
  constructionAvailableDate: text("construction_available_date"), // 着工可能日
  constructionStartScheduled: text("construction_start_scheduled"), // 着工 予定日
  constructionStartDate: text("construction_start_date"), // 着工日
  constructionEndScheduled: text("construction_end_scheduled"), // 完工 予定日
  constructionEndDate: text("construction_end_date"), // 完工日
  externalLineWorkDate: text("external_line_work_date"), // 外線 工事日
  leadInWorkDate: text("lead_in_work_date"), // 引込 工事日
  interconnectionScheduled: text("interconnection_scheduled"), // 連系 予定日
  interconnectionDate: text("interconnection_date"), // 連系日

  // 工事部向け追加フィールド（発注タブ用）
  deliveryLocation: text("delivery_location"), // 納品場所
  mountOrderVendor: text("mount_order_vendor"), // 架台発注先
  mountOrderDate: text("mount_order_date"), // 架台発注日
  mountDeliveryScheduled: text("mount_delivery_scheduled"), // 架台納品予定日
  mountDeliveryStatus: text("mount_delivery_status"), // 架台納品状況
  panelOrderVendor: text("panel_order_vendor"), // パネル発注先
  panelOrderDate: text("panel_order_date"), // パネル発注日
  panelDeliveryScheduled: text("panel_delivery_scheduled"), // パネル納品予定日
  panelDeliveryStatus: text("panel_delivery_status"), // パネル納品状況
  constructionRemarks: text("construction_remarks"), // 着工備考
  constructionNote: text("construction_note"), // 工事備考

  // 工事部向け追加フィールド（工程タブ用）
  siteName: text("site_name"), // 現場（地名）
  cityName: text("city_name"), // 市名
  panelCount: text("panel_count"), // パネル枚数
  panelLayout: text("panel_layout"), // パネルレイアウト
  loadTestStatus: text("load_test_status"), // 載荷試験ステータス
  loadTestDate: text("load_test_date"), // 載荷試験日付
  pileStatus: text("pile_status"), // 杭ステータス
  pileDate: text("pile_date"), // 杭日付
  framePanelStatus: text("frame_panel_status"), // 架台・パネルステータス
  framePanelDate: text("frame_panel_date"), // 架台・パネル日付
  electricalStatus: text("electrical_status"), // 電気ステータス
  electricalDate: text("electrical_date"), // 電気日付
  fenceStatus: text("fence_status"), // フェンスステータス
  fenceDate: text("fence_date"), // フェンス日付
  inspectionPhotoDate: text("inspection_photo_date"), // 検写日付
  processRemarks: text("process_remarks"), // 工程備考

  // その他
  burdenLandOther: text("burden_land_other"), // 負担金土地 その他
  confirmationItems: text("confirmation_items"), // 確認事項
  completionMonth: text("completion_month"), // 完成月
  constructionComplete: text("construction_complete"), // 完工

  // 個別地権者フィールド（複数筆対応）
  // ※ landowner（上部）はスプレッドシート同期用の代表地権者サマリー
  // ※ landowner1-3は個別筆ごとの詳細情報（UI入力用）
  address: text("address"), // 現地住所
  coordinates: text("coordinates"), // 座標
  landowner1: text("landowner_1"), // 地権者1
  landowner2: text("landowner_2"), // 地権者2
  landowner3: text("landowner_3"), // 地権者3
  landowner1Kana: text("landowner_1_kana"), // 地権者1フリガナ
  landowner2Kana: text("landowner_2_kana"), // 地権者2フリガナ
  landowner3Kana: text("landowner_3_kana"), // 地権者3フリガナ
  landownerAddress1: text("landowner_address_1"), // 地権者1の住所
  landownerAddress2: text("landowner_address_2"), // 地権者2の住所
  landownerAddress3: text("landowner_address_3"), // 地権者3の住所
  inheritanceStatus1: text("inheritance_status_1"), // 相続有無1（有/無/未確認）
  inheritanceStatus2: text("inheritance_status_2"), // 相続有無2
  inheritanceStatus3: text("inheritance_status_3"), // 相続有無3
  correctionRegistration1: text("correction_registration_1"), // 更正登記有無1（有/無/未確認）
  correctionRegistration2: text("correction_registration_2"), // 更正登記有無2
  correctionRegistration3: text("correction_registration_3"), // 更正登記有無3
  mortgageStatus1: text("mortgage_status_1"), // 抵当権有無1（有/無/未確認）
  mortgageStatus2: text("mortgage_status_2"), // 抵当権有無2
  mortgageStatus3: text("mortgage_status_3"), // 抵当権有無3
  landCategory1: text("land_category_1"), // 地目1（山林・原野・畑）
  landCategory2: text("land_category_2"), // 地目2（山林・原野・畑）
  landCategory3: text("land_category_3"), // 地目3（山林・原野・畑）
  landArea1: text("land_area_1"), // 土地面積1
  landArea2: text("land_area_2"), // 土地面積2
  landArea3: text("land_area_3"), // 土地面積3
  verticalSnowLoad: text("vertical_snow_load"), // 垂直積雪量
  windSpeed: text("wind_speed"), // 風速
  dococabiLink: text("dococabi_link"), // どこキャビ連携URL

  // タイムラインフェーズ手動上書き
  // 形式: { [phaseKey]: { startDate?: "YYYY-MM-DD", endDate?: "YYYY-MM-DD", note?: "メモ" } }
  phaseOverrides: text("phase_overrides"),

  // 法令チェック結果（JSON形式で保存）
  // 形式: { "法令名": { "status": "該当"|"非該当"|"要確認", "note": "確認内容",
  //   "confirmationSource": "URL", "contactInfo": "連絡先TEL",
  //   "confirmationMethod": "電話"|"メール"|"WEB",
  //   "confirmationDate": "YYYY-MM-DD", "confirmedBy": "担当者", "department": "担当部署" }, ... }
  legalStatuses: text("legal_statuses"),
}, (table) => ({
  orgIdx: index("projects_org_idx").on(table.organizationId),
  managerIdx: index("projects_manager_idx").on(table.manager),
  prefectureIdx: index("projects_prefecture_idx").on(table.prefecture),
}));

// 進捗テーブル
export const progress = sqliteTable("progress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("planned"), // planned: 予定, completed: 完了
  createdAt: text("created_at").notNull(), // 予定日
  completedAt: text("completed_at"), // 完了日
}, (table) => ({
  projectIdx: index("progress_project_idx").on(table.projectId),
}));

// コメント（ツイート）テーブル
export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
  userId: integer("user_id"), // 投稿者
  userName: text("user_name"), // 投稿者名（キャッシュ用）
}, (table) => ({
  projectIdx: index("comments_project_idx").on(table.projectId),
}));

// TODOテーブル（案件ごと・期日付きリマインダー、ダッシュボード表示用）
// projectIdがnullの場合は案件に紐づかないプレーンなTODO
export const todos = sqliteTable("todos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  organizationId: integer("organization_id"), // 所属組織ID
  projectId: integer("project_id"), // nullの場合は案件に紐づかない
  content: text("content").notNull(),
  dueDate: text("due_date").notNull(), // この日までに行う（YYYY-MM-DD）
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at"), // 完了日時（ISO文字列）
  completedMemo: text("completed_memo"), // 完了時のメモ
  userId: integer("user_id"), // 作成者
  userName: text("user_name"), // 作成者名（キャッシュ用）
}, (table) => ({
  orgIdx: index("todos_org_idx").on(table.organizationId),
  projectIdx: index("todos_project_idx").on(table.projectId),
  dueDateIdx: index("todos_due_date_idx").on(table.dueDate),
}));

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Progress = typeof progress.$inferSelect;
export type NewProgress = typeof progress.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;

// 会議（議事録）テーブル
export const meetings = sqliteTable("meetings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  organizationId: integer("organization_id"), // 所属組織ID
  title: text("title").notNull(), // タイトル（どんな会議だったか）
  meetingDate: text("meeting_date").notNull(), // 日付（YYYY-MM-DD）
  category: text("category").notNull(), // 種別（社内 / 社外）
  content: text("content"), // 議事録本文（長文）
  agenda: text("agenda"), // 議題（今後検索用）
}, (table) => ({
  orgIdx: index("meetings_org_idx").on(table.organizationId),
  dateIdx: index("meetings_date_idx").on(table.meetingDate),
}));

export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;

// ユーザー権限フラグの型定義
export type UserPermissions = {
  canViewFinance?: boolean;    // ファイナンス閲覧
  canExportData?: boolean;     // データエクスポート
  canManageUsers?: boolean;    // ユーザー管理
};

// ユーザーテーブル
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(), // ログインID
  name: text("name"), // 表示名
  password: text("password").notNull(), // ハッシュ化したパスワード
  role: text("role").notNull().default("user"), // user, admin
  // 権限フラグ（JSON形式）
  permissions: text("permissions"), // JSON: { canViewFinance: true, ... }
  // OAuth連携用
  lineId: text("line_id").unique(), // LINE User ID
  email: text("email"), // メールアドレス（OAuth取得用）
  image: text("image"), // プロフィール画像URL
  // 法人テナント
  organizationId: integer("organization_id"), // 所属法人ID
}, (table) => ({
  orgIdx: index("users_org_idx").on(table.organizationId),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// 案件ファイルテーブル（Vercel Blob Storage）
// カテゴリ: registry_copy(謄本) / cadastral_map(公図) / drawing(図面) / consent_form(同意書) / other(その他)
export const projectFiles = sqliteTable("project_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  fileName: text("file_name").notNull(), // 元のファイル名
  fileUrl: text("file_url").notNull(), // Vercel BlobのURL
  fileType: text("file_type").notNull(), // image/jpeg, application/pdf など
  fileSize: integer("file_size").notNull(), // バイト数
  category: text("category").default("other"), // registry_copy / cadastral_map / drawing / consent_form / other
  createdAt: text("created_at").notNull(),
}, (table) => ({
  projectIdx: index("project_files_project_idx").on(table.projectId),
  categoryIdx: index("project_files_category_idx").on(table.category),
}));

export type ProjectFile = typeof projectFiles.$inferSelect;
export type NewProjectFile = typeof projectFiles.$inferInsert;

// 要望（フィードバック）テーブル
export const feedbacks = sqliteTable("feedbacks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  organizationId: integer("organization_id"), // 所属組織ID
  content: text("content").notNull(), // 要望内容
  pagePath: text("page_path").notNull(), // どの画面から投稿されたか
  pageTitle: text("page_title"), // 画面のタイトル（表示用）
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, rejected
  replies: text("replies"), // JSON形式の返信（Gitツリー形式）
  likes: integer("likes").notNull().default(0), // いいね数
  createdAt: text("created_at").notNull(),
  userId: integer("user_id"), // 投稿者ID
  userName: text("user_name"), // 投稿者名（キャッシュ用）
}, (table) => ({
  orgIdx: index("feedbacks_org_idx").on(table.organizationId),
  statusIdx: index("feedbacks_status_idx").on(table.status),
}));

export type Feedback = typeof feedbacks.$inferSelect;
export type NewFeedback = typeof feedbacks.$inferInsert;

// 工事進捗カテゴリ（工程表の代わり）
export const CONSTRUCTION_PROGRESS_CATEGORIES = [
  "造成",
  "載荷試験",
  "杭打ち",
  "ケーブル埋設",
  "架台組立",
  "パネル設置",
  "電気工事",
  "フェンス設置",
  "その他",
] as const;

// 工事写真カテゴリ
export const CONSTRUCTION_PHOTO_CATEGORIES = [
  "着工前",
  "造成後",
  "載荷試験",
  "杭打ち",
  "ケーブル埋設",
  "架台組立",
  "パネル",
  "電気",
  "フェンス",
  "完工写真",
] as const;

// 工事進捗テーブル（工程表の代わり）
export const constructionProgress = sqliteTable("construction_progress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  category: text("category").notNull(), // 造成、杭打ち、etc.
  status: text("status").notNull().default("pending"), // pending: 未着手, in_progress: 進行中, completed: 完了
  note: text("note"), // 進捗メモ
  completedAt: text("completed_at"), // 完了日時
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at"),
}, (table) => ({
  projectIdx: index("construction_progress_project_idx").on(table.projectId),
  statusIdx: index("construction_progress_status_idx").on(table.status),
}));

export type ConstructionProgress = typeof constructionProgress.$inferSelect;
export type NewConstructionProgress = typeof constructionProgress.$inferInsert;

// 工事写真テーブル
export const constructionPhotos = sqliteTable("construction_photos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  category: text("category").notNull(), // 着工前、造成後、etc.
  fileName: text("file_name").notNull(), // 元のファイル名
  fileUrl: text("file_url").notNull(), // Vercel BlobのURL
  fileType: text("file_type").notNull(), // image/jpeg など
  fileSize: integer("file_size").notNull(), // バイト数
  contractorName: text("contractor_name"), // 撮影した業者名
  note: text("note"), // 写真に関するメモ
  takenAt: text("taken_at"), // 撮影日時
  createdAt: text("created_at").notNull(),
}, (table) => ({
  projectIdx: index("construction_photos_project_idx").on(table.projectId),
  categoryIdx: index("construction_photos_category_idx").on(table.category),
}));

export type ConstructionPhoto = typeof constructionPhotos.$inferSelect;
export type NewConstructionPhoto = typeof constructionPhotos.$inferInsert;

// カレンダーイベントテーブル（カスタムイベント用）
export const calendarEvents = sqliteTable("calendar_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  organizationId: integer("organization_id"), // 所属組織ID
  title: text("title").notNull(), // イベント名
  eventType: text("event_type").notNull().default("other"), // todo, meeting, other, etc.
  eventDate: text("event_date").notNull(), // 日付（YYYY-MM-DD）
  endDate: text("end_date"), // 終了日（任意）
  startTime: text("start_time"), // 開始時刻 "HH:MM" (例: "09:00")
  endTime: text("end_time"), // 終了時刻 "HH:MM" (例: "17:00")
  description: text("description"), // 説明・メモ
  userId: integer("user_id"), // 作成者ID
  userName: text("user_name"), // 作成者名（キャッシュ用）
  createdAt: text("created_at").notNull(),
}, (table) => ({
  orgIdx: index("calendar_events_org_idx").on(table.organizationId),
  dateIdx: index("calendar_events_date_idx").on(table.eventDate),
}));

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type NewCalendarEvent = typeof calendarEvents.$inferInsert;

// 監査ログテーブル（セキュリティインシデント追跡用）
export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  organizationId: integer("organization_id"), // 所属組織ID
  userId: integer("user_id"), // 操作したユーザーID
  userName: text("user_name"), // ユーザー名（キャッシュ用）
  action: text("action").notNull(), // 操作種別: create, read, update, delete, login, logout
  resourceType: text("resource_type").notNull(), // 対象リソース種別: project, todo, meeting, feedback, user
  resourceId: integer("resource_id"), // 対象リソースID
  resourceName: text("resource_name"), // リソース名（表示用）
  details: text("details"), // 詳細情報（JSON形式）
  ipAddress: text("ip_address"), // IPアドレス
  userAgent: text("user_agent"), // ユーザーエージェント
  createdAt: text("created_at").notNull(), // タイムスタンプ
}, (table) => ({
  orgIdx: index("audit_logs_org_idx").on(table.organizationId),
  userIdx: index("audit_logs_user_idx").on(table.userId),
  createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  actionIdx: index("audit_logs_action_idx").on(table.action),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

// レート制限テーブル（ブルートフォース・DDoS対策）
export const rateLimits = sqliteTable("rate_limits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  identifier: text("identifier").notNull(), // IP アドレスまたはユーザーID
  endpoint: text("endpoint").notNull(), // エンドポイント（login, api等）
  requestCount: integer("request_count").notNull().default(1),
  windowStart: text("window_start").notNull(), // ウィンドウ開始時刻
  createdAt: text("created_at").notNull(),
}, (table) => ({
  identifierEndpointIdx: index("rate_limits_identifier_endpoint_idx").on(table.identifier, table.endpoint),
}));

export type RateLimit = typeof rateLimits.$inferSelect;
export type NewRateLimit = typeof rateLimits.$inferInsert;

// 地図アノテーションテーブル（現場案内図エディタ用）
export const mapAnnotations = sqliteTable("map_annotations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull().default("無題の案内図"),
  geoJson: text("geo_json").notNull(), // GeoJSON文字列
  mapCenter: text("map_center"), // JSON: [lat, lng]
  mapZoom: integer("map_zoom"),
  tileLayer: text("tile_layer").default("std"), // std | photo | pale
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at"),
}, (table) => ({
  projectIdx: index("map_annotations_project_idx").on(table.projectId),
}));

export type MapAnnotation = typeof mapAnnotations.$inferSelect;
export type NewMapAnnotation = typeof mapAnnotations.$inferInsert;

// Google Sheets 同期ログテーブル
export const sheetsSyncLogs = sqliteTable("sheets_sync_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  syncedAt: text("synced_at").notNull(), // 同期実行日時
  totalRows: integer("total_rows").notNull(), // スプレッドシートの総行数
  updatedCount: integer("updated_count").notNull(), // 更新件数
  insertedCount: integer("inserted_count").notNull(), // 新規挿入件数
  skippedCount: integer("skipped_count").notNull(), // スキップ件数
  errorCount: integer("error_count").notNull(), // エラー件数
  errors: text("errors"), // エラー詳細（JSON配列）
  durationMs: integer("duration_ms").notNull(), // 処理時間（ミリ秒）
});

export type SheetsSyncLog = typeof sheetsSyncLogs.$inferSelect;
export type NewSheetsSyncLog = typeof sheetsSyncLogs.$inferInsert;

// 傾斜解析結果テーブル
export const slopeAnalyses = sqliteTable("slope_analyses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  organizationId: integer("organization_id").notNull(),
  name: text("name").notNull().default("傾斜解析"),
  polygon: text("polygon").notNull(), // GeoJSON Polygon座標 [[lat,lon],...]
  gridInterval: integer("grid_interval").notNull().default(2),
  totalPoints: integer("total_points").notNull(),
  // 統計データ
  avgSlope: real("avg_slope"),
  maxSlope: real("max_slope"),
  minSlope: real("min_slope"),
  flatPercent: real("flat_percent"), // 平坦 (<3°) の割合
  steepPercent: real("steep_percent"), // 急 (>15°) の割合
  avgElevation: real("avg_elevation"),
  maxElevation: real("max_elevation"),
  minElevation: real("min_elevation"),
  // 詳細データ（JSON）
  elevationMatrix: text("elevation_matrix"), // JSON
  slopeMatrix: text("slope_matrix"), // JSON
  crossSection: text("cross_section"), // JSON
  createdAt: text("created_at").notNull(),
  createdBy: integer("created_by"),
}, (table) => ({
  projectIdx: index("slope_analyses_project_idx").on(table.projectId),
  orgIdx: index("slope_analyses_org_idx").on(table.organizationId),
}));

export type SlopeAnalysis = typeof slopeAnalyses.$inferSelect;
export type NewSlopeAnalysis = typeof slopeAnalyses.$inferInsert;

// 候補地テーブル（太陽光発電 候補地探索）
export const savedSites = sqliteTable("saved_sites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  organizationId: integer("organization_id").notNull(),
  // 位置情報
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  address: text("address"),
  cityCode: text("city_code"),
  // 土地属性（WAGRI農地ピン相当）
  landCategory: text("land_category"),         // 地目（田/畑/山林等）
  areaSqm: real("area_sqm"),                   // 面積（㎡）
  noushinClass: text("noushin_class"),          // 農振区分（青地/白地/農振外）
  cityPlanningClass: text("city_planning_class"), // 都市計画区分
  ownerIntention: text("owner_intention"),      // 所有者意向（売りたい/貸したい等）
  isIdleFarmland: integer("is_idle_farmland"),  // 遊休農地フラグ
  // スコアリング結果
  score: integer("score"),                     // 算出スコア（0-100）
  stars: integer("stars"),                     // ☆1-5
  scoreDetails: text("score_details"),         // スコア内訳（JSON）
  // 営業管理
  status: text("status").notNull().default("new"), // new/visited/negotiating/contracted/rejected
  memo: text("memo"),
  // データソース
  dataSource: text("data_source").default("manual"), // manual/wagri
  dataDate: text("data_date"),                 // データ基準日
  // メタ
  createdAt: text("created_at").notNull(),
  createdBy: integer("created_by"),
}, (table) => ({
  orgIdx: index("saved_sites_org_idx").on(table.organizationId),
  starsIdx: index("saved_sites_stars_idx").on(table.stars),
  statusIdx: index("saved_sites_status_idx").on(table.status),
}));

export type SavedSite = typeof savedSites.$inferSelect;
export type NewSavedSite = typeof savedSites.$inferInsert;

// ファイルサーバー同期: フォルダテーブル
export const serverFolders = sqliteTable("server_folders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  managementNumber: text("management_number").notNull().unique(),
  folderName: text("folder_name").notNull(),
  folderPath: text("folder_path").notNull(),
  syncedAt: text("synced_at").notNull(),
}, (table) => ({
  mgmtIdx: index("idx_server_folders_mgmt").on(table.managementNumber),
}));

export type ServerFolder = typeof serverFolders.$inferSelect;
export type NewServerFolder = typeof serverFolders.$inferInsert;

// ファイルサーバー同期: ファイルテーブル
export const serverFiles = sqliteTable("server_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  managementNumber: text("management_number").notNull(),
  subfolderKey: text("subfolder_key"), // "agreement", "landInfo" 等（NULLはルート）
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").default(0),
  fileModifiedAt: text("file_modified_at"),
  syncedAt: text("synced_at").notNull(),
}, (table) => ({
  mgmtIdx: index("idx_server_files_mgmt").on(table.managementNumber),
}));

export type ServerFile = typeof serverFiles.$inferSelect;
export type NewServerFile = typeof serverFiles.$inferInsert;

// ワークフロー タスク種別
export const WORKFLOW_TASK_TYPES = [
  "input",     // データ入力
  "document",  // 書類作成
  "check",     // 確認・チェック
  "submit",    // 送信・提出
  "navigate",  // 画面遷移
] as const;

// ワークフロー ステータス
export const WORKFLOW_STATUSES = [
  "pending",     // 未着手
  "in_progress", // 進行中
  "completed",   // 完了
  "cancelled",   // キャンセル
] as const;

// ワークフローテンプレート
export const workflowTemplates = sqliteTable("workflow_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  organizationId: integer("organization_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"), // 月次処理, 請求, 報告 など
  isActive: integer("is_active").notNull().default(1), // 1=有効, 0=無効
  createdBy: integer("created_by").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at"),
}, (table) => ({
  orgIdx: index("workflow_templates_org_idx").on(table.organizationId),
  activeIdx: index("workflow_templates_active_idx").on(table.isActive),
}));

export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;
export type NewWorkflowTemplate = typeof workflowTemplates.$inferInsert;

// ワークフローステップ
export const workflowSteps = sqliteTable("workflow_steps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  templateId: integer("template_id").notNull(),
  stepOrder: integer("step_order").notNull(),
  taskType: text("task_type").notNull(), // input, document, check, submit, navigate
  title: text("title").notNull(),
  instruction: text("instruction"),
  targetUrl: text("target_url"), // 遷移先URL（任意）
  requiredFields: text("required_fields"), // JSON: 必須入力項目
  estimatedMinutes: integer("estimated_minutes"),
}, (table) => ({
  templateIdx: index("workflow_steps_template_idx").on(table.templateId),
  orderIdx: index("workflow_steps_order_idx").on(table.templateId, table.stepOrder),
}));

export type WorkflowStep = typeof workflowSteps.$inferSelect;
export type NewWorkflowStep = typeof workflowSteps.$inferInsert;

// ワークフロー割り当て
export const workflowAssignments = sqliteTable("workflow_assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  templateId: integer("template_id").notNull(),
  userId: integer("user_id").notNull(), // 担当者
  projectId: integer("project_id"), // 案件紐付け（任意）
  assignedBy: integer("assigned_by").notNull(), // 割り当てた管理者
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, cancelled
  currentStep: integer("current_step").notNull().default(1),
  dueDate: text("due_date"),
  priority: integer("priority").default(2), // 1=低, 2=中, 3=高
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  templateIdx: index("workflow_assignments_template_idx").on(table.templateId),
  userIdx: index("workflow_assignments_user_idx").on(table.userId),
  statusIdx: index("workflow_assignments_status_idx").on(table.status),
}));

export type WorkflowAssignment = typeof workflowAssignments.$inferSelect;
export type NewWorkflowAssignment = typeof workflowAssignments.$inferInsert;

// ワークフロー実行記録
export const workflowExecutions = sqliteTable("workflow_executions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  assignmentId: integer("assignment_id").notNull(),
  stepId: integer("step_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, skipped
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  durationSeconds: integer("duration_seconds"),
  result: text("result"), // JSON: 入力値、添付ファイルURLなど
  notes: text("notes"),
}, (table) => ({
  assignmentIdx: index("workflow_executions_assignment_idx").on(table.assignmentId),
  stepIdx: index("workflow_executions_step_idx").on(table.stepId),
}));

export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type NewWorkflowExecution = typeof workflowExecutions.$inferInsert;