import { z } from "zod";

// 共通バリデーション
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付はYYYY-MM-DD形式で入力してください").optional().nullable();
const isoDateString = z.string().datetime().optional().nullable();
const nonEmptyString = z.string().min(1, "必須項目です").max(1000);
const optionalString = z.string().max(5000).optional().nullable();
const optionalNumber = z.number().optional().nullable();

// プロジェクト作成スキーマ
export const createProjectSchema = z.object({
  // 必須フィールド
  managementNumber: nonEmptyString,
  manager: nonEmptyString,
  client: nonEmptyString,
  projectNumber: nonEmptyString,
  // オプショナルフィールド
  availability: optionalString,
  businessType: optionalString,
  designPower: optionalString,
  sales: optionalString,
  parcelCount: optionalString,
  prefecture: optionalString,
  blank1: optionalString,
  link: optionalString,
  agreementMonth: optionalString,
  projectSubmissionScheduled: dateString,
  projectSubmissionDate: dateString,
  fellingConsentRequest: dateString,
  fellingConsentComplete: dateString,
  siteInvestigation: dateString,
  level: optionalString,
  landContractRequestScheduled: dateString,
  landContractRequest: dateString,
  landContractScheduled: dateString,
  landContractDate: dateString,
  landPrice: optionalString,
  landowner: optionalString,
  landownerAddress: optionalString,
  landAreaTotal: optionalString,
  correctionStatus: optionalString,
  inheritanceStatus: optionalString,
  mortgageStatus: optionalString,
  hazardAtHome: optionalString,
  photo: optionalString,
  snowfall: optionalString,
  windSpeedValue: optionalString,
  neighborhoodFelling: optionalString,
  landRemarks: optionalString,
  landCategory: optionalString,
  nourinStatus: optionalString,
  nourinScrivenerRequest: dateString,
  nourinApplicationScheduled: dateString,
  nourinApplicationDate: dateString,
  nourinCompletionScheduled: dateString,
  nourinCompletionDate: dateString,
  noutenStatus: optionalString,
  landCategoryChangeRequest: dateString,
  noutenScrivenerRequest: dateString,
  noutenApplicationScheduled: dateString,
  noutenApplicationDate: dateString,
  noutenCompletionScheduled: dateString,
  noutenCompletionDate: dateString,
  regulationCategory: optionalString,
  developmentStatus: optionalString,
  residentialDevApplicationScheduled: dateString,
  residentialDevApplicationDate: dateString,
  residentialDevCompletionScheduled: dateString,
  residentialDevCompletionDate: dateString,
  otherRegulations: optionalString,
  regulationApplicationScheduled: dateString,
  regulationApplicationPaymentDate: dateString,
  regulationPermitScheduled: dateString,
  regulationPermitDate: dateString,
  completionNotification: optionalString,
  regulationRemarks: optionalString,
  moduleType: optionalString,
  moduleCount: optionalString,
  moduleCapacity: optionalString,
  systemCapacity: optionalString,
  powerSimulation: optionalString,
  powerCompany: optionalString,
  powerApplicationDestination: optionalString,
  powerApplicationScheduled: dateString,
  powerApplicationDate: dateString,
  powerResponseScheduled: dateString,
  powerResponseDate: dateString,
  estimatedBurden: optionalString,
  additionalBurden: optionalString,
  burdenPaymentDate: dateString,
  interconnectionStatus: optionalString,
  interconnectionDetails: optionalString,
  powerRemarks: optionalString,
  landSettlementDocScheduled: dateString,
  landSettlementDocCollection: dateString,
  landSettlementScheduled: dateString,
  landSettlementDate: dateString,
  ownershipTransferAppScheduled: dateString,
  ownershipTransferApplication: dateString,
  ownershipTransferCompScheduled: dateString,
  ownershipTransferCompletion: dateString,
  developmentCost: optionalString,
  surveyingCost: optionalString,
  administrativeCost: optionalString,
  otherCostTotal: optionalString,
  neighborGreetingRequestScheduled: dateString,
  neighborGreetingRequestDate: dateString,
  neighborGreetingScheduled: dateString,
  neighborGreetingDate: dateString,
  ssRequestScheduled: dateString,
  ssRequestDate: dateString,
  ssScheduled: dateString,
  ssDate: dateString,
  orderCreationRequestScheduled: dateString,
  orderCreationRequest: dateString,
  orderScheduled: dateString,
  orderDate: dateString,
  deliveryDate: dateString,
  constructionAvailableDate: dateString,
  constructionStartScheduled: dateString,
  constructionStartDate: dateString,
  constructionEndScheduled: dateString,
  constructionEndDate: dateString,
  externalLineWorkDate: dateString,
  leadInWorkDate: dateString,
  interconnectionScheduled: dateString,
  interconnectionDate: dateString,
  deliveryLocation: optionalString,
  mountOrderVendor: optionalString,
  mountOrderDate: dateString,
  mountDeliveryScheduled: dateString,
  mountDeliveryStatus: optionalString,
  panelOrderVendor: optionalString,
  panelOrderDate: dateString,
  panelDeliveryScheduled: dateString,
  panelDeliveryStatus: optionalString,
  constructionRemarks: optionalString,
  constructionNote: optionalString,
  siteName: optionalString,
  cityName: optionalString,
  panelCount: optionalString,
  panelLayout: optionalString,
  loadTestStatus: optionalString,
  loadTestDate: dateString,
  pileStatus: optionalString,
  pileDate: dateString,
  framePanelStatus: optionalString,
  framePanelDate: dateString,
  electricalStatus: optionalString,
  electricalDate: dateString,
  fenceStatus: optionalString,
  fenceDate: dateString,
  inspectionPhotoDate: dateString,
  processRemarks: optionalString,
  burdenLandOther: optionalString,
  confirmationItems: optionalString,
  completionMonth: optionalString,
  constructionComplete: optionalString,
  address: optionalString,
  coordinates: optionalString,
  legalStatuses: optionalString,
  // 地権者情報（複数対応）
  landowner1: optionalString,
  landowner2: optionalString,
  landowner3: optionalString,
  landowner1Kana: optionalString,
  landowner2Kana: optionalString,
  landowner3Kana: optionalString,
  landownerAddress1: optionalString,
  landownerAddress2: optionalString,
  landownerAddress3: optionalString,
  inheritanceStatus1: optionalString,
  inheritanceStatus2: optionalString,
  inheritanceStatus3: optionalString,
  correctionRegistration1: optionalString,
  correctionRegistration2: optionalString,
  correctionRegistration3: optionalString,
  mortgageStatus1: optionalString,
  mortgageStatus2: optionalString,
  mortgageStatus3: optionalString,
  // 地目・面積（複数対応）
  landCategory1: optionalString,
  landCategory2: optionalString,
  landCategory3: optionalString,
  landArea1: optionalString,
  landArea2: optionalString,
  landArea3: optionalString,
  // 環境データ
  verticalSnowLoad: optionalString,
  windSpeed: optionalString,
  // 外部連携
  dococabiLink: optionalString,
}).strict();

// プロジェクト更新スキーマ（すべてオプショナル）
export const updateProjectSchema = createProjectSchema.partial();

// TODO作成スキーマ
export const createTodoSchema = z.object({
  content: nonEmptyString,
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付はYYYY-MM-DD形式で入力してください"),
  projectId: z.number().int().positive().optional().nullable(),
  assigneeId: z.number().int().positive().optional().nullable(), // 担当者ID
  assigneeName: z.string().max(100).optional().nullable(), // 担当者名
});

// TODO更新スキーマ
export const updateTodoSchema = z.object({
  content: nonEmptyString.optional(),
  dueDate: dateString,
  completedAt: isoDateString,
  completedMemo: optionalString,
}).strict();

// コメント作成スキーマ
export const createCommentSchema = z.object({
  content: nonEmptyString,
});

// フィードバック作成スキーマ
export const createFeedbackSchema = z.object({
  content: nonEmptyString,
  pagePath: z.string().min(1).max(500),
  pageTitle: optionalString,
});

// フィードバック更新スキーマ
export const updateFeedbackSchema = z.object({
  status: z.enum(["pending", "in_progress", "completed", "rejected"]).optional(),
  replies: optionalString,
});

// 会議作成スキーマ
export const createMeetingSchema = z.object({
  title: nonEmptyString,
  meetingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付はYYYY-MM-DD形式で入力してください"),
  category: z.enum(["社内", "社外"]),
  content: optionalString,
  agenda: optionalString,
});

// 会議更新スキーマ
export const updateMeetingSchema = createMeetingSchema.partial();

// カレンダーイベント作成スキーマ
export const createCalendarEventSchema = z.object({
  title: nonEmptyString,
  eventType: z.enum(["todo", "meeting", "other"]).default("other"),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付はYYYY-MM-DD形式で入力してください"),
  endDate: dateString,
  description: optionalString,
});

// カレンダーイベント更新スキーマ
export const updateCalendarEventSchema = createCalendarEventSchema.partial();

// 組織選択スキーマ
export const selectOrganizationSchema = z.object({
  organizationId: z.number().int().positive().optional().nullable(),
  organizationName: z.string().min(1).max(100).optional(),
}).refine(
  (data) => data.organizationId !== undefined || data.organizationName !== undefined,
  { message: "組織IDまたは組織名のいずれかが必要です" }
);

// 工事進捗更新スキーマ
export const updateConstructionSchema = z.object({
  deliveryLocation: optionalString,
  mountOrderVendor: optionalString,
  mountOrderDate: dateString,
  mountDeliveryScheduled: dateString,
  mountDeliveryStatus: optionalString,
  panelOrderVendor: optionalString,
  panelOrderDate: dateString,
  panelDeliveryScheduled: dateString,
  panelDeliveryStatus: optionalString,
  constructionAvailableDate: dateString,
  constructionRemarks: optionalString,
  constructionNote: optionalString,
  siteName: optionalString,
  cityName: optionalString,
  panelCount: optionalString,
  panelLayout: optionalString,
  loadTestStatus: optionalString,
  loadTestDate: dateString,
  pileStatus: optionalString,
  pileDate: dateString,
  framePanelStatus: optionalString,
  framePanelDate: dateString,
  electricalStatus: optionalString,
  electricalDate: dateString,
  fenceStatus: optionalString,
  fenceDate: dateString,
  inspectionPhotoDate: dateString,
  processRemarks: optionalString,
}).strict();

// 工事進捗カテゴリ更新スキーマ
export const updateConstructionProgressSchema = z.object({
  status: z.enum(["pending", "in_progress", "completed"]),
  note: optionalString,
  completedAt: isoDateString,
});

// ファイルアップロードバリデーション
export const fileUploadSchema = z.object({
  category: z.enum(["registry_copy", "cadastral_map", "drawing", "consent_form", "other"]),
});

// バリデーションエラーをJSON形式に変換
export function formatZodError(error: z.ZodError) {
  return {
    error: "Validation failed",
    details: error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  };
}

// 環境判定
const isProduction = process.env.NODE_ENV === "production";

// リクエストボディをバリデート
export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: ReturnType<typeof formatZodError> }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    if (result.success) {
      return { success: true, data: result.data };
    }
    // 本番環境では詳細を隠す
    if (isProduction) {
      return { success: false, error: { error: "入力内容に誤りがあります", details: [] } };
    }
    return { success: false, error: formatZodError(result.error) };
  } catch {
    return { success: false, error: { error: "無効なリクエストです", details: [] } };
  }
}
