import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  constructionStartScheduled: text("construction_start_scheduled"), // 着工 予定日
  constructionStartDate: text("construction_start_date"), // 着工日
  constructionEndScheduled: text("construction_end_scheduled"), // 完工 予定日
  constructionEndDate: text("construction_end_date"), // 完工日
  externalLineWorkDate: text("external_line_work_date"), // 外線 工事日
  leadInWorkDate: text("lead_in_work_date"), // 引込 工事日
  interconnectionScheduled: text("interconnection_scheduled"), // 連系 予定日
  interconnectionDate: text("interconnection_date"), // 連系日

  // その他
  burdenLandOther: text("burden_land_other"), // 負担金土地 その他
  confirmationItems: text("confirmation_items"), // 確認事項
  completionMonth: text("completion_month"), // 完成月
  constructionComplete: text("construction_complete"), // 完工

  // 既存フィールド（互換性維持）
  address: text("address"), // 現地住所
  coordinates: text("coordinates"), // 座標
  landowner1: text("landowner_1"), // 地権者1
  landowner2: text("landowner_2"), // 地権者2
  landowner3: text("landowner_3"), // 地権者3
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

  // 法令チェック結果（JSON形式で保存）
  // 形式: { "法令名": { "status": "該当" | "非該当" | "要確認", "note": "メモ" }, ... }
  legalStatuses: text("legal_statuses"),
});

// 進捗テーブル
export const progress = sqliteTable("progress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("planned"), // planned: 予定, completed: 完了
  createdAt: text("created_at").notNull(), // 予定日
  completedAt: text("completed_at"), // 完了日
});

// コメント（ツイート）テーブル
export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
  userId: integer("user_id"), // 投稿者
  userName: text("user_name"), // 投稿者名（キャッシュ用）
});

// TODOテーブル（案件ごと・期日付きリマインダー、ダッシュボード表示用）
// projectIdがnullの場合は案件に紐づかないプレーンなTODO
export const todos = sqliteTable("todos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id"), // nullの場合は案件に紐づかない
  content: text("content").notNull(),
  dueDate: text("due_date").notNull(), // この日までに行う（YYYY-MM-DD）
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at"), // 完了日時（ISO文字列）
  completedMemo: text("completed_memo"), // 完了時のメモ
  userId: integer("user_id"), // 作成者
  userName: text("user_name"), // 作成者名（キャッシュ用）
});

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
  title: text("title").notNull(), // タイトル（どんな会議だったか）
  meetingDate: text("meeting_date").notNull(), // 日付（YYYY-MM-DD）
  category: text("category").notNull(), // 種別（社内 / 社外）
  content: text("content"), // 議事録本文（長文）
  agenda: text("agenda"), // 議題（今後検索用）
});

export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;

// ユーザーテーブル
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(), // ログインID
  name: text("name"), // 表示名
  password: text("password").notNull(), // ハッシュ化したパスワード
  role: text("role").notNull().default("user"), // user, admin
  // OAuth連携用
  lineId: text("line_id").unique(), // LINE User ID
  email: text("email"), // メールアドレス（OAuth取得用）
  image: text("image"), // プロフィール画像URL
});

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
});

export type ProjectFile = typeof projectFiles.$inferSelect;
export type NewProjectFile = typeof projectFiles.$inferInsert;

// 要望（フィードバック）テーブル
export const feedbacks = sqliteTable("feedbacks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  content: text("content").notNull(), // 要望内容
  pagePath: text("page_path").notNull(), // どの画面から投稿されたか
  pageTitle: text("page_title"), // 画面のタイトル（表示用）
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, rejected
  replies: text("replies"), // JSON形式の返信（Gitツリー形式）
  likes: integer("likes").notNull().default(0), // いいね数
  createdAt: text("created_at").notNull(),
});

export type Feedback = typeof feedbacks.$inferSelect;
export type NewFeedback = typeof feedbacks.$inferInsert;