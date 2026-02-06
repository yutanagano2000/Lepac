export interface JudgmentResult {
  宅地造成等工事規制区域: boolean;
  特定盛土等規制区域: boolean;
}

export interface AdditionalButton {
  label: string;
  url: string;
}

export interface Law {
  id: number;
  name: string;
  fixedText?: string;
}

export type LegalStatus = "該当" | "非該当" | "要確認";
export type ConfirmationMethod = "電話" | "メール" | "WEB" | "";
export interface LegalStatusInfo {
  status: LegalStatus;
  note?: string; // 確認内容（検索結果）
  confirmationSource?: string; // 確認先（URL・リンク）
  contactInfo?: string; // 連絡先（TEL等）
  confirmationMethod?: ConfirmationMethod; // 確認方法
  confirmationDate?: string; // 確認日
  confirmedBy?: string; // 担当者
  department?: string; // 担当部署
  updatedBy?: string;
  updatedAt?: string;
}
export type LegalStatuses = Record<string, LegalStatusInfo>;

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface LawSearchCardProps {
  lawName: string;
  onSearch: (lawName: string, lawId?: number) => void;
  lawId?: number;
  fixedText?: string;
  copiedText: string | null;
  onCopy: (text: string) => void;
  prefecture?: string;
  additionalButtons?: AdditionalButton[];
  badges?: string[];
  caption?: string;
  /** ただし書き（コピーアイコンなしで表示） */
  note?: string;
  /** 地目に農地（田・畑）が含まれる場合の小さなアラート表示 */
  farmlandAlert?: boolean;
  /** 現在のステータス */
  currentStatus?: LegalStatus;
  /** 現在のユーザーメモ（確認内容） */
  currentNote?: string;
  /** 確認先（URL・リンク） */
  currentConfirmationSource?: string;
  /** 連絡先（TEL等） */
  currentContactInfo?: string;
  /** 確認方法 */
  currentConfirmationMethod?: ConfirmationMethod;
  /** 確認日 */
  currentConfirmationDate?: string;
  /** 担当者 */
  currentConfirmedBy?: string;
  /** 担当部署 */
  currentDepartment?: string;
  /** 編集者名 */
  updatedBy?: string;
  /** 編集日時 */
  updatedAt?: string;
  /** ステータス変更時のコールバック */
  onStatusChange?: (status: LegalStatus) => void;
  /** ステータス削除時のコールバック */
  onStatusRemove?: () => void;
  /** メモ変更時のコールバック */
  onNoteChange?: (note: string) => void;
  /** 追加フィールド変更時のコールバック */
  onFieldChange?: (field: string, value: string) => void;
  /** 「対象地区ではありません」ボタンを非表示にする */
  hideNotApplicableButton?: boolean;
}

export interface LegalSearchTabProps {
  searchParams: { lat: string; lon: string; prefecture: string } | null;
  projectAddress: string | null;
  projectCoordinates: string | null;
  projectLandCategories?: {
    landCategory1: string | null;
    landCategory2: string | null;
    landCategory3: string | null;
  } | null;
  projectId?: number;
  projectClient?: string | null; // 貴社名（販売先）
  projectNumber?: string | null; // 案件番号
  initialLegalStatuses?: string | null;
  onLegalStatusesChange?: (statuses: LegalStatuses) => void;
}
