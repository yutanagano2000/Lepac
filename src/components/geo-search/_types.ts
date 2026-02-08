// 判定結果の型
export interface JudgmentResult {
  宅地造成等工事規制区域: boolean;
  特定盛土等規制区域: boolean;
}

// 追加ボタンの型定義
export interface AdditionalButton {
  label: string;
  url: string;
}

// 法律の型定義
export interface Law {
  id: number;
  name: string;
  fixedText?: string;
}

// 住所情報の型定義
export interface LocationInfo {
  prefecture: string;
  city: string;
  fullAddress: string;
  shortAddress: string;
}

// 法律検索カードのprops型
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
  note?: string;
  farmlandAlert?: boolean;
}
