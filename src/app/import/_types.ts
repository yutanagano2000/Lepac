export interface FolderInfo {
  folderName: string;
  managementNumber: string | null;
  manager: string | null;
  projectNumber: string | null;
  note: string | null;
}

export interface ImportResult {
  success: boolean;
  folderName: string;
  error?: string;
}
