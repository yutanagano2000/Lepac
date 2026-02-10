import type { PHOTO_CATEGORIES } from "@/app/construction/[projectId]/_constants";

// ConstructionView用の型定義
export type ConstructionProject = {
  id: number;
  managementNumber: string;
  client: string;
  projectNumber: string;
  prefecture: string;
  address: string;
  completionMonth: string | null;
  // 発注タブ用
  deliveryLocation: string | null;
  mountOrderVendor: string | null;
  mountOrderDate: string | null;
  mountDeliveryScheduled: string | null;
  mountDeliveryStatus: string | null;
  panelOrderVendor: string | null;
  panelOrderDate: string | null;
  panelDeliveryScheduled: string | null;
  panelDeliveryStatus: string | null;
  constructionAvailableDate: string | null;
  constructionRemarks: string | null;
  constructionNote: string | null;
  // 工程タブ用
  siteName: string | null;
  cityName: string | null;
  panelCount: string | null;
  panelLayout: string | null;
  loadTestStatus: string | null;
  loadTestDate: string | null;
  pileStatus: string | null;
  pileDate: string | null;
  framePanelStatus: string | null;
  framePanelDate: string | null;
  electricalStatus: string | null;
  electricalDate: string | null;
  fenceStatus: string | null;
  fenceDate: string | null;
  inspectionPhotoDate: string | null;
  processRemarks: string | null;
};

// PhotoMatrix用の型定義
export type PhotoMatrixProject = {
  id: number;
  managementNumber: string;
  siteName: string | null;
  cityName: string | null;
  prefecture: string | null;
  completionMonth: string | null;
  client: string | null;
};

export type PhotoDetail = {
  id: number;
  fileName: string;
  fileUrl: string;
  contractorName: string | null;
  note: string | null;
  takenAt: string | null;
  createdAt: string;
};

export type PhotoInfo = {
  count: number;
  latestAt: string | null;
  latestPhotos: PhotoDetail[];
};

export type PhotoMatrixData = Record<number, Record<string, PhotoInfo>>;

export type ConstructionPhoto = {
  id: number;
  projectId: number;
  category: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  contractorName: string | null;
  note: string | null;
  takenAt: string | null;
  createdAt: string;
};

export type CellStatus = "completed" | "new" | "missing" | "unreached";

export type SelectedCell = {
  project: PhotoMatrixProject;
  category: (typeof PHOTO_CATEGORIES)[number];
} | null;
