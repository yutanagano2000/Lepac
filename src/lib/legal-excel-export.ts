import ExcelJS from "exceljs";

// 法令ステータスの型（page.tsxと同じ）
interface LegalStatusInfo {
  status: "該当" | "非該当" | "要確認";
  note?: string;
  confirmationSource?: string;
  contactInfo?: string;
  confirmationMethod?: string;
  confirmationDate?: string;
  confirmedBy?: string;
  department?: string;
}

type LegalStatuses = Record<string, LegalStatusInfo>;

interface ExportParams {
  clientName: string; // 貴社名
  projectNumber: string; // 案件番号
  projectAddress: string; // 案件所在地
  legalStatuses: LegalStatuses;
  laws: { id: number; name: string }[];
}

// ステータス変換: アプリ内表現 → Excel表現
function convertStatus(status?: string): string {
  if (!status) return "";
  switch (status) {
    case "該当": return "該当あり";
    case "非該当": return "該当なし";
    case "要確認": return "要確認";
    default: return status;
  }
}

// 確認日フォーマット: YYYY-MM-DD → YYYY/MM/DD
function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  return dateStr.replace(/-/g, "/");
}

// 薄罫線スタイル
const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

const font10: Partial<ExcelJS.Font> = { name: "ＭＳ Ｐゴシック", size: 10 };
const font10Bold: Partial<ExcelJS.Font> = { name: "ＭＳ Ｐゴシック", size: 10, bold: true };

export async function generateLegalExcel(params: ExportParams): Promise<Blob> {
  const { clientName, projectNumber, projectAddress, legalStatuses, laws } = params;

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("関係法令一覧", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
    },
  });

  // 列幅設定（B~G）
  ws.getColumn(2).width = 6.14;
  ws.getColumn(3).width = 24.86;
  ws.getColumn(4).width = 11.29;
  ws.getColumn(5).width = 11.29;
  ws.getColumn(6).width = 17;
  ws.getColumn(7).width = 39;

  // === ヘッダー部（行1~7） ===
  // 行2: タイトル
  const titleCell = ws.getCell("B2");
  titleCell.value = "関係法令チェックリスト";
  titleCell.font = { name: "ＭＳ Ｐゴシック", size: 14, bold: true };

  // 行3: 貴社名
  ws.getCell("C3").value = "貴社名：";
  ws.getCell("C3").font = font10Bold;
  ws.mergeCells("D3:G3");
  ws.getCell("D3").value = clientName;
  ws.getCell("D3").font = font10;
  ws.getCell("D3").border = { bottom: { style: "thin" } };

  // 行4: 案件番号
  ws.getCell("C4").value = "案件番号：";
  ws.getCell("C4").font = font10Bold;
  ws.mergeCells("D4:G4");
  ws.getCell("D4").value = projectNumber;
  ws.getCell("D4").font = font10;
  ws.getCell("D4").border = { bottom: { style: "thin" } };

  // 行5: 案件所在地
  ws.getCell("C5").value = "案件所在地：";
  ws.getCell("C5").font = font10Bold;
  ws.mergeCells("D5:G5");
  ws.getCell("D5").value = projectAddress;
  ws.getCell("D5").font = font10;
  ws.getCell("D5").border = { bottom: { style: "thin" } };

  // 行6~7: 注釈
  ws.getCell("B6").value = "※1 農振法の除外等が行われている場合でも「該当あり」として記載してください。（手続状況は確認内容欄に記載）";
  ws.getCell("B6").font = { ...font10, color: { argb: "FFFF0000" } };
  ws.getCell("B7").value = "※2 農地法の転用許可等が行われている場合でも「該当あり」として記載してください。（手続状況は確認内容欄に記載）";
  ws.getCell("B7").font = { ...font10, color: { argb: "FFFF0000" } };

  // === テーブルヘッダー（行8） ===
  const headerRow = 8;
  const headerBg: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFCCFFCC" } };
  const headerStyle = { font: font10Bold, border: thinBorder, fill: headerBg, alignment: { horizontal: "center" as const, vertical: "middle" as const } };

  const headers: [string, string][] = [
    ["B", "Ｎo."],
    ["C", "法令"],
    ["D", "確認日"],
    ["E", "該当有無"],
  ];
  for (const [col, val] of headers) {
    const cell = ws.getCell(`${col}${headerRow}`);
    cell.value = val;
    Object.assign(cell, headerStyle);
  }
  // F-G はマージ
  ws.mergeCells(`F${headerRow}:G${headerRow}`);
  const fgCell = ws.getCell(`F${headerRow}`);
  fgCell.value = "確認先・連絡先・担当者名・確認方法・確認内容";
  Object.assign(fgCell, headerStyle);

  // === データ行 ===
  const subLabels = ["確認先：", "連絡先：", "担当者名：", "確認方法：", "確認内容："];

  // 法令のリストを作成（23法令 + 都道府県条例×3 + 市区町村条例×3 + その他×1 = 30行）
  interface LawEntry {
    no: number;
    name: string;
    isEditable: boolean; // 条例名など入力可能か
    prefix?: string; // 「都道府県条例（条例名：」など
  }

  const allLaws: LawEntry[] = laws.map((law, i) => ({
    no: i + 1,
    name: law.name,
    isEditable: false,
  }));

  // 都道府県条例 × 3
  for (let i = 0; i < 3; i++) {
    allLaws.push({
      no: allLaws.length + 1,
      name: `都道府県条例（条例名：　　　　　　　　　　　　　　）`,
      isEditable: true,
    });
  }

  // 市区町村条例 × 3
  for (let i = 0; i < 3; i++) {
    allLaws.push({
      no: allLaws.length + 1,
      name: `市区町村条例（条例名：　　　　　　　　　　　　　　）`,
      isEditable: true,
    });
  }

  // その他
  allLaws.push({
    no: allLaws.length + 1,
    name: `その他（　　　　　　　　　　　　　　　　　　　　　）`,
    isEditable: true,
  });

  let currentRow = headerRow + 1; // 9

  for (const law of allLaws) {
    const startRow = currentRow;
    const endRow = currentRow + 4;
    const info = legalStatuses[law.name];

    // B列: No.（5行マージ）
    ws.mergeCells(`B${startRow}:B${endRow}`);
    const bCell = ws.getCell(`B${startRow}`);
    bCell.value = law.no;
    bCell.font = font10;
    bCell.alignment = { horizontal: "center", vertical: "middle" };
    bCell.border = thinBorder;

    // C列: 法令名（5行マージ）
    ws.mergeCells(`C${startRow}:C${endRow}`);
    const cCell = ws.getCell(`C${startRow}`);
    cCell.value = law.name;
    cCell.font = font10;
    cCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    cCell.border = thinBorder;

    // D列: 確認日（5行マージ）
    ws.mergeCells(`D${startRow}:D${endRow}`);
    const dCell = ws.getCell(`D${startRow}`);
    dCell.value = formatDate(info?.confirmationDate);
    dCell.font = font10;
    dCell.alignment = { horizontal: "center", vertical: "middle" };
    dCell.border = thinBorder;

    // E列: 該当有無（5行マージ）
    ws.mergeCells(`E${startRow}:E${endRow}`);
    const eCell = ws.getCell(`E${startRow}`);
    eCell.value = convertStatus(info?.status);
    eCell.font = font10;
    eCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    eCell.border = thinBorder;
    // 該当ありは赤文字
    if (info?.status === "該当") {
      eCell.font = { ...font10, color: { argb: "FFFF0000" }, bold: true };
    }

    // F-G列: サブ項目（5行）
    const subValues = [
      info?.confirmationSource || "",
      info?.contactInfo || "",
      info?.confirmedBy ? `${info.confirmedBy}${info.department ? `（${info.department}）` : ""}` : (info?.department || ""),
      info?.confirmationMethod || "",
      info?.note || "",
    ];

    for (let i = 0; i < 5; i++) {
      const row = startRow + i;
      const fCell = ws.getCell(`F${row}`);
      fCell.value = subLabels[i];
      fCell.font = font10;
      fCell.alignment = { horizontal: "left", vertical: "top" };
      fCell.border = thinBorder;

      const gCell = ws.getCell(`G${row}`);
      gCell.value = subValues[i];
      gCell.font = font10;
      gCell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
      gCell.border = thinBorder;
    }

    // マージセルの罫線をサブ行にも適用（ExcelJSではマージ先にもborder設定が必要）
    for (let i = 1; i < 5; i++) {
      const row = startRow + i;
      for (const col of ["B", "C", "D", "E"]) {
        ws.getCell(`${col}${row}`).border = thinBorder;
      }
    }

    currentRow = endRow + 1;
  }

  // バッファ生成 → Blob
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
