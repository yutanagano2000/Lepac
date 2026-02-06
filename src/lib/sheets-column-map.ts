/**
 * Google スプレッドシートのヘッダー名 → DB カラム名マッピング
 *
 * スキーマのコメント（日本語ラベル）をキーに、DB カラム名（camelCase）を値に持つ。
 * スプレッドシートの 1 行目ヘッダーを自動認識するためのラベルベースマッチング。
 */

/** ヘッダー名 → projects テーブルの camelCase カラム名 */
export const HEADER_TO_COLUMN: Record<string, string> = {
  // 基本情報
  "管理番号": "managementNumber",
  "担当": "manager",
  "販売先": "client",
  "販売店 案件番号": "projectNumber",
  "販売店案件番号": "projectNumber",
  "案件番号": "projectNumber",
  "可否": "availability",
  "業務": "businessType",
  "設計/電力": "designPower",
  "設計／電力": "designPower",
  "営業": "sales",
  "筆数": "parcelCount",
  "都道府県": "prefecture",
  "リンク": "link",
  "合意書 計上月": "agreementMonth",
  "合意書計上月": "agreementMonth",
  "案件提出 予定日": "projectSubmissionScheduled",
  "案件提出予定日": "projectSubmissionScheduled",
  "案件提出日": "projectSubmissionDate",
  "伐採/工事 承諾書依頼": "fellingConsentRequest",
  "伐採/工事承諾書依頼": "fellingConsentRequest",
  "伐採／工事 承諾書依頼": "fellingConsentRequest",
  "伐採/工事 承諾書揃う": "fellingConsentComplete",
  "伐採/工事承諾書揃う": "fellingConsentComplete",
  "伐採／工事 承諾書揃う": "fellingConsentComplete",
  "現調": "siteInvestigation",
  "レベル": "level",

  // 土地契約関連
  "土地売契 依頼予定日": "landContractRequestScheduled",
  "土地売契依頼予定日": "landContractRequestScheduled",
  "土地売契 依頼": "landContractRequest",
  "土地売契依頼": "landContractRequest",
  "土地契約 締結予定日": "landContractScheduled",
  "土地契約締結予定日": "landContractScheduled",
  "土地契約 締結日": "landContractDate",
  "土地契約締結日": "landContractDate",
  "土地代": "landPrice",

  // 地権者情報
  "地権者": "landowner",
  "地権者住所": "landownerAddress",
  "土地 ㎡数": "landAreaTotal",
  "土地㎡数": "landAreaTotal",
  "更正 有無": "correctionStatus",
  "更正有無": "correctionStatus",
  "相続 有無": "inheritanceStatus",
  "相続有無": "inheritanceStatus",
  "抵当権 有無": "mortgageStatus",
  "抵当権有無": "mortgageStatus",
  "ハザード（アットホーム）": "hazardAtHome",
  "ハザード": "hazardAtHome",
  "写真": "photo",
  "積雪": "snowfall",
  "風速": "windSpeedValue",
  "近隣伐採": "neighborhoodFelling",
  "土地備考": "landRemarks",
  "地目": "landCategory",

  // 農振関連
  "農振 有無": "nourinStatus",
  "農振有無": "nourinStatus",
  "農振 行政書士依頼": "nourinScrivenerRequest",
  "農振行政書士依頼": "nourinScrivenerRequest",
  "農振 申請予定日": "nourinApplicationScheduled",
  "農振申請予定日": "nourinApplicationScheduled",
  "農振 申請日": "nourinApplicationDate",
  "農振申請日": "nourinApplicationDate",
  "農振 完了予定日": "nourinCompletionScheduled",
  "農振完了予定日": "nourinCompletionScheduled",
  "農振 完了日": "nourinCompletionDate",
  "農振完了日": "nourinCompletionDate",

  // 農転関連
  "農転 有無": "noutenStatus",
  "農転有無": "noutenStatus",
  "地目変更 営業への依頼": "landCategoryChangeRequest",
  "地目変更営業への依頼": "landCategoryChangeRequest",
  "農転 行政書士依頼": "noutenScrivenerRequest",
  "農転行政書士依頼": "noutenScrivenerRequest",
  "農転/地目 申請予定日": "noutenApplicationScheduled",
  "農転/地目申請予定日": "noutenApplicationScheduled",
  "農転／地目 申請予定日": "noutenApplicationScheduled",
  "農転/地目 申請日": "noutenApplicationDate",
  "農転/地目申請日": "noutenApplicationDate",
  "農転／地目 申請日": "noutenApplicationDate",
  "農転/地目 完了予定日": "noutenCompletionScheduled",
  "農転/地目完了予定日": "noutenCompletionScheduled",
  "農転／地目 完了予定日": "noutenCompletionScheduled",
  "農転/地目 完了日": "noutenCompletionDate",
  "農転/地目完了日": "noutenCompletionDate",
  "農転／地目 完了日": "noutenCompletionDate",

  // 規制・造成関連
  "規制 区分": "regulationCategory",
  "規制区分": "regulationCategory",
  "造成 有無": "developmentStatus",
  "造成有無": "developmentStatus",
  "宅造法 申請予定日": "residentialDevApplicationScheduled",
  "宅造法申請予定日": "residentialDevApplicationScheduled",
  "宅造法 申請日": "residentialDevApplicationDate",
  "宅造法申請日": "residentialDevApplicationDate",
  "宅造法 完了予定日": "residentialDevCompletionScheduled",
  "宅造法完了予定日": "residentialDevCompletionScheduled",
  "宅造法 完了日": "residentialDevCompletionDate",
  "宅造法完了日": "residentialDevCompletionDate",

  // その他法令関連
  "その他 法令": "otherRegulations",
  "その他法令": "otherRegulations",
  "法令申請予定日": "regulationApplicationScheduled",
  "法令申請日 支払日": "regulationApplicationPaymentDate",
  "法令申請日": "regulationApplicationPaymentDate",
  "法令許可予定日": "regulationPermitScheduled",
  "法令許可日": "regulationPermitDate",
  "完了届": "completionNotification",
  "法令備考": "regulationRemarks",

  // モジュール・システム関連
  "ﾓｼﾞｭｰﾙ": "moduleType",
  "モジュール": "moduleType",
  "ﾓｼﾞｭｰﾙ 枚数": "moduleCount",
  "モジュール枚数": "moduleCount",
  "ﾓｼﾞｭｰﾙ 容量": "moduleCapacity",
  "モジュール容量": "moduleCapacity",
  "ｼｽﾃﾑ 容量": "systemCapacity",
  "システム容量": "systemCapacity",
  "発電シミュレーション": "powerSimulation",

  // 電力関連
  "電力 会社": "powerCompany",
  "電力会社": "powerCompany",
  "電力申請 申請先": "powerApplicationDestination",
  "電力申請申請先": "powerApplicationDestination",
  "電力 申請予定日": "powerApplicationScheduled",
  "電力申請予定日": "powerApplicationScheduled",
  "電力 申請日": "powerApplicationDate",
  "電力申請日": "powerApplicationDate",
  "電力 回答予定日": "powerResponseScheduled",
  "電力回答予定日": "powerResponseScheduled",
  "電力 回答日": "powerResponseDate",
  "電力回答日": "powerResponseDate",
  "概算 負担金額": "estimatedBurden",
  "概算負担金額": "estimatedBurden",
  "追加 負担金額": "additionalBurden",
  "追加負担金額": "additionalBurden",
  "負担金 支払日": "burdenPaymentDate",
  "負担金支払日": "burdenPaymentDate",
  "連系可否": "interconnectionStatus",
  "連系詳細": "interconnectionDetails",
  "電力備考": "powerRemarks",

  // 土地決済関連
  "土地決済書類回収予定": "landSettlementDocScheduled",
  "土地決済書類回収": "landSettlementDocCollection",
  "土地決済予定日": "landSettlementScheduled",
  "土地 決済日": "landSettlementDate",
  "土地決済日": "landSettlementDate",

  // 所有権移転登記関連
  "所有権移転登記申請予定": "ownershipTransferAppScheduled",
  "所有権移転登記申請": "ownershipTransferApplication",
  "所有権移転登記完了予定": "ownershipTransferCompScheduled",
  "所有権移転登記完了": "ownershipTransferCompletion",

  // 費用関連
  "造成費用": "developmentCost",
  "測量費用": "surveyingCost",
  "行政費用": "administrativeCost",
  "その他 費用合計": "otherCostTotal",
  "その他費用合計": "otherCostTotal",

  // 近隣挨拶関連
  "近隣挨拶 依頼予定日": "neighborGreetingRequestScheduled",
  "近隣挨拶依頼予定日": "neighborGreetingRequestScheduled",
  "近隣挨拶 依頼日": "neighborGreetingRequestDate",
  "近隣挨拶依頼日": "neighborGreetingRequestDate",
  "近隣挨拶 予定日": "neighborGreetingScheduled",
  "近隣挨拶予定日": "neighborGreetingScheduled",
  "近隣挨拶 実施日": "neighborGreetingDate",
  "近隣挨拶実施日": "neighborGreetingDate",

  // SS関連
  "SS 依頼予定日": "ssRequestScheduled",
  "SS依頼予定日": "ssRequestScheduled",
  "SS 依頼日": "ssRequestDate",
  "SS依頼日": "ssRequestDate",
  "SS 予定日": "ssScheduled",
  "SS予定日": "ssScheduled",
  "SS 実施日": "ssDate",
  "SS実施日": "ssDate",

  // 注文・発注関連
  "注文書作成依頼予定": "orderCreationRequestScheduled",
  "注文書作成依頼": "orderCreationRequest",
  "発注予定日": "orderScheduled",
  "発注日": "orderDate",
  "納品日": "deliveryDate",

  // 工事関連
  "着工可能日": "constructionAvailableDate",
  "着工 予定日": "constructionStartScheduled",
  "着工予定日": "constructionStartScheduled",
  "着工日": "constructionStartDate",
  "完工 予定日": "constructionEndScheduled",
  "完工予定日": "constructionEndScheduled",
  "完工日": "constructionEndDate",
  "外線 工事日": "externalLineWorkDate",
  "外線工事日": "externalLineWorkDate",
  "引込 工事日": "leadInWorkDate",
  "引込工事日": "leadInWorkDate",
  "連系 予定日": "interconnectionScheduled",
  "連系予定日": "interconnectionScheduled",
  "連系日": "interconnectionDate",

  // その他
  "負担金土地 その他": "burdenLandOther",
  "負担金土地その他": "burdenLandOther",
  "確認事項": "confirmationItems",
  "完成月": "completionMonth",
  "完工": "constructionComplete",

  // 既存フィールド（互換性維持）
  "現地住所": "address",
  "座標": "coordinates",
};

/**
 * DB カラム名の Set（projects テーブルに存在するカラム）
 * マッピングの値が有効なカラムかどうかの検証に使用
 */
export const VALID_DB_COLUMNS = new Set(Object.values(HEADER_TO_COLUMN));

/**
 * ヘッダー行からカラムインデックスマッピングを構築
 * @param headers スプレッドシートの1行目ヘッダー配列
 * @returns { columnIndex: dbColumnName } のマッピング
 */
export function buildColumnIndexMap(headers: string[]): Map<number, string> {
  const indexMap = new Map<number, string>();

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]?.trim();
    if (!header) continue;

    // 完全一致を試みる
    if (HEADER_TO_COLUMN[header]) {
      indexMap.set(i, HEADER_TO_COLUMN[header]);
      continue;
    }

    // 改行・半角/全角スペース・半角全角記号を正規化して再試行
    const normalized = header
      .replace(/[\r\n]+/g, "")  // 改行を除去
      .replace(/\u3000/g, " ")  // 全角スペース → 半角
      .replace(/\s+/g, " ")    // 連続スペースを1つに
      .replace(/／/g, "/")     // 全角スラッシュ → 半角
      .trim();

    if (HEADER_TO_COLUMN[normalized]) {
      indexMap.set(i, HEADER_TO_COLUMN[normalized]);
      continue;
    }

    // スペースなしでも試す
    const noSpace = normalized.replace(/\s/g, "");
    if (HEADER_TO_COLUMN[noSpace]) {
      indexMap.set(i, HEADER_TO_COLUMN[noSpace]);
    }
  }

  return indexMap;
}
