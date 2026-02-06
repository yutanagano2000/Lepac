"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, AlertCircle, Search, Loader2, Filter, X, ChevronDown, Check, FolderInput, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Project, NewProject } from "@/db/schema";

const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

const MANAGER_OPTIONS = ["吉國", "刎本", "松下", "佐東", "川田", "近永", "その他"];

const PROJECT_SEARCH_RECENT_KEY = "geo_checker_recent_project_searches";
const MAX_RECENT_SEARCHES = 3;

// テーブルカラム定義
const TABLE_COLUMNS: { key: keyof Project | string; label: string; width?: string }[] = [
  { key: "managementNumber", label: "管理番号", width: "120px" },
  { key: "manager", label: "担当", width: "80px" },
  { key: "client", label: "販売先", width: "120px" },
  { key: "projectNumber", label: "販売店 案件番号", width: "140px" },
  { key: "availability", label: "可否", width: "60px" },
  { key: "businessType", label: "業務", width: "80px" },
  { key: "designPower", label: "設計/電力", width: "100px" },
  { key: "sales", label: "営業", width: "80px" },
  { key: "parcelCount", label: "筆数", width: "60px" },
  { key: "prefecture", label: "都道府県", width: "100px" },
  { key: "blank1", label: "(空白)", width: "60px" },
  { key: "link", label: "リンク", width: "80px" },
  { key: "agreementMonth", label: "合意書 計上月", width: "120px" },
  { key: "projectSubmissionScheduled", label: "案件提出 予定日", width: "130px" },
  { key: "projectSubmissionDate", label: "案件提出日", width: "110px" },
  { key: "fellingConsentRequest", label: "伐採/工事 承諾書依頼", width: "160px" },
  { key: "fellingConsentComplete", label: "伐採/工事 承諾書揃う", width: "160px" },
  { key: "siteInvestigation", label: "現調", width: "80px" },
  { key: "level", label: "レベル", width: "80px" },
  { key: "landContractRequestScheduled", label: "土地売契 依頼予定日", width: "150px" },
  { key: "landContractRequest", label: "土地売契 依頼", width: "120px" },
  { key: "landContractScheduled", label: "土地契約 締結予定日", width: "150px" },
  { key: "landContractDate", label: "土地契約 締結日", width: "130px" },
  { key: "landPrice", label: "土地代", width: "100px" },
  { key: "landowner", label: "地権者", width: "120px" },
  { key: "landownerAddress", label: "地権者住所", width: "200px" },
  { key: "landAreaTotal", label: "土地 ㎡数", width: "100px" },
  { key: "correctionStatus", label: "更正 有無", width: "90px" },
  { key: "inheritanceStatus", label: "相続 有無", width: "90px" },
  { key: "mortgageStatus", label: "抵当権 有無", width: "100px" },
  { key: "hazardAtHome", label: "ハザード（アットホーム）", width: "170px" },
  { key: "photo", label: "写真", width: "60px" },
  { key: "snowfall", label: "積雪", width: "60px" },
  { key: "windSpeedValue", label: "風速", width: "60px" },
  { key: "neighborhoodFelling", label: "近隣伐採", width: "90px" },
  { key: "landRemarks", label: "土地備考", width: "150px" },
  { key: "landCategory", label: "地目", width: "80px" },
  { key: "nourinStatus", label: "農振 有無", width: "90px" },
  { key: "nourinScrivenerRequest", label: "農振 行政書士依頼", width: "150px" },
  { key: "nourinApplicationScheduled", label: "農振 申請予定日", width: "130px" },
  { key: "nourinApplicationDate", label: "農振 申請日", width: "110px" },
  { key: "nourinCompletionScheduled", label: "農振 完了予定日", width: "130px" },
  { key: "nourinCompletionDate", label: "農振 完了日", width: "110px" },
  { key: "noutenStatus", label: "農転 有無", width: "90px" },
  { key: "landCategoryChangeRequest", label: "地目変更 営業への依頼", width: "170px" },
  { key: "noutenScrivenerRequest", label: "農転 行政書士依頼", width: "150px" },
  { key: "noutenApplicationScheduled", label: "農転/地目 申請予定日", width: "160px" },
  { key: "noutenApplicationDate", label: "農転/地目 申請日", width: "130px" },
  { key: "noutenCompletionScheduled", label: "農転/地目 完了予定日", width: "160px" },
  { key: "noutenCompletionDate", label: "農転/地目 完了日", width: "130px" },
  { key: "regulationCategory", label: "規制 区分", width: "100px" },
  { key: "developmentStatus", label: "造成 有無", width: "90px" },
  { key: "residentialDevApplicationScheduled", label: "宅造法 申請予定日", width: "140px" },
  { key: "residentialDevApplicationDate", label: "宅造法 申請日", width: "120px" },
  { key: "residentialDevCompletionScheduled", label: "宅造法 完了予定日", width: "140px" },
  { key: "residentialDevCompletionDate", label: "宅造法 完了日", width: "120px" },
  { key: "otherRegulations", label: "その他 法令", width: "120px" },
  { key: "regulationApplicationScheduled", label: "法令申請予定日", width: "130px" },
  { key: "regulationApplicationPaymentDate", label: "法令申請日 支払日", width: "150px" },
  { key: "regulationPermitScheduled", label: "法令許可予定日", width: "130px" },
  { key: "regulationPermitDate", label: "法令許可日", width: "110px" },
  { key: "completionNotification", label: "完了届", width: "80px" },
  { key: "regulationRemarks", label: "法令備考", width: "150px" },
  { key: "moduleType", label: "ﾓｼﾞｭｰﾙ", width: "100px" },
  { key: "moduleCount", label: "ﾓｼﾞｭｰﾙ 枚数", width: "110px" },
  { key: "moduleCapacity", label: "ﾓｼﾞｭｰﾙ 容量", width: "110px" },
  { key: "systemCapacity", label: "ｼｽﾃﾑ 容量", width: "100px" },
  { key: "powerSimulation", label: "発電シミュレーション", width: "160px" },
  { key: "powerCompany", label: "電力 会社", width: "100px" },
  { key: "powerApplicationDestination", label: "電力申請 申請先", width: "130px" },
  { key: "powerApplicationScheduled", label: "電力 申請予定日", width: "130px" },
  { key: "powerApplicationDate", label: "電力 申請日", width: "110px" },
  { key: "powerResponseScheduled", label: "電力 回答予定日", width: "130px" },
  { key: "powerResponseDate", label: "電力 回答日", width: "110px" },
  { key: "estimatedBurden", label: "概算 負担金額", width: "120px" },
  { key: "additionalBurden", label: "追加 負担金額", width: "120px" },
  { key: "burdenPaymentDate", label: "負担金 支払日", width: "120px" },
  { key: "interconnectionStatus", label: "連系可否", width: "90px" },
  { key: "interconnectionDetails", label: "連系詳細", width: "150px" },
  { key: "powerRemarks", label: "電力備考", width: "150px" },
  { key: "landSettlementDocScheduled", label: "土地決済書類回収予定", width: "170px" },
  { key: "landSettlementDocCollection", label: "土地決済書類回収", width: "150px" },
  { key: "landSettlementScheduled", label: "土地決済予定日", width: "130px" },
  { key: "landSettlementDate", label: "土地 決済日", width: "110px" },
  { key: "ownershipTransferAppScheduled", label: "所有権移転登記申請予定", width: "180px" },
  { key: "ownershipTransferApplication", label: "所有権移転登記申請", width: "160px" },
  { key: "ownershipTransferCompScheduled", label: "所有権移転登記完了予定", width: "180px" },
  { key: "ownershipTransferCompletion", label: "所有権移転登記完了", width: "160px" },
  { key: "developmentCost", label: "造成費用", width: "100px" },
  { key: "surveyingCost", label: "測量費用", width: "100px" },
  { key: "administrativeCost", label: "行政費用", width: "100px" },
  { key: "otherCostTotal", label: "その他 費用合計", width: "140px" },
  { key: "neighborGreetingRequestScheduled", label: "近隣挨拶 依頼予定日", width: "160px" },
  { key: "neighborGreetingRequestDate", label: "近隣挨拶 依頼日", width: "130px" },
  { key: "neighborGreetingScheduled", label: "近隣挨拶 予定日", width: "130px" },
  { key: "neighborGreetingDate", label: "近隣挨拶 実施日", width: "130px" },
  { key: "ssRequestScheduled", label: "SS 依頼予定日", width: "120px" },
  { key: "ssRequestDate", label: "SS 依頼日", width: "100px" },
  { key: "ssScheduled", label: "SS 予定日", width: "100px" },
  { key: "ssDate", label: "SS 実施日", width: "100px" },
  { key: "orderCreationRequestScheduled", label: "注文書作成依頼予定", width: "160px" },
  { key: "orderCreationRequest", label: "注文書作成依頼", width: "130px" },
  { key: "orderScheduled", label: "発注予定日", width: "110px" },
  { key: "orderDate", label: "発注日", width: "90px" },
  { key: "deliveryDate", label: "納品日", width: "90px" },
  { key: "constructionStartScheduled", label: "着工 予定日", width: "110px" },
  { key: "constructionStartDate", label: "着工日", width: "90px" },
  { key: "constructionEndScheduled", label: "完工 予定日", width: "110px" },
  { key: "constructionEndDate", label: "完工日", width: "90px" },
  { key: "externalLineWorkDate", label: "外線 工事日", width: "110px" },
  { key: "leadInWorkDate", label: "引込 工事日", width: "110px" },
  { key: "interconnectionScheduled", label: "連系 予定日", width: "110px" },
  { key: "interconnectionDate", label: "連系日", width: "90px" },
  { key: "burdenLandOther", label: "負担金土地 その他", width: "150px" },
  { key: "confirmationItems", label: "確認事項", width: "150px" },
  { key: "completionMonth", label: "完成月", width: "100px" },
  { key: "constructionComplete", label: "完工", width: "60px" },
];

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROJECT_SEARCH_RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr)
      ? arr.filter((x): x is string => typeof x === "string").slice(0, MAX_RECENT_SEARCHES)
      : [];
  } catch {
    return [];
  }
}

function addRecentSearch(query: string): string[] {
  const q = query.trim();
  if (!q) return getRecentSearches();
  const prev = getRecentSearches();
  const next = [q, ...prev.filter((x) => x !== q)].slice(0, MAX_RECENT_SEARCHES);
  try {
    localStorage.setItem(PROJECT_SEARCH_RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

// 超過情報・コメント・TODO検索用テキストを含む案件型
type ProjectWithOverdue = Project & { hasOverdue: boolean; commentSearchText?: string; todoSearchText?: string };

interface ProjectsViewProps {
  initialProjects: ProjectWithOverdue[];
}

// フィルター用のヘルパー関数
function formatCompletionMonthForFilter(value: string | null | undefined): string {
  if (!value) return "未設定";
  const [year, month] = value.split("-");
  return `${year}年${parseInt(month, 10)}月`;
}

// 固定カラム数（管理番号、担当、販売先、販売店案件番号）
const FIXED_COLUMNS_COUNT = 4;

export default function ProjectsView({ initialProjects }: ProjectsViewProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithOverdue[]>(initialProjects);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState<NewProject>({
    managementNumber: "",
    manager: "",
    client: "",
    projectNumber: "",
    completionMonth: "",
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [editCalendarOpen, setEditCalendarOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 編集モード関連
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCell, setEditingCell] = useState<{ projectId: number; columnKey: string } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // フィルター機能用のstate
  const [filterOpen, setFilterOpen] = useState<string | null>(null);
  const [selectedManagementNumbers, setSelectedManagementNumbers] = useState<Set<string>>(new Set());
  const [selectedManagers, setSelectedManagers] = useState<Set<string>>(new Set());
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [selectedProjectNumbers, setSelectedProjectNumbers] = useState<Set<string>>(new Set());
  const [selectedCompletionMonths, setSelectedCompletionMonths] = useState<Set<string>>(new Set());
  const [selectedInterconnectionMonths, setSelectedInterconnectionMonths] = useState<Set<string>>(new Set());
  const [filterSearchQuery, setFilterSearchQuery] = useState("");

  // インポート機能用のstate
  const [importOpen, setImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [importableFolders, setImportableFolders] = useState<{ folderName: string; managementNumber: string; manager: string; projectNumber: string }[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());

  // 各フィルターの選択肢を取得
  const uniqueManagementNumbers = useMemo(() =>
    [...new Set(projects.map(p => p.managementNumber))].sort(), [projects]);
  const uniqueManagers = useMemo(() =>
    [...new Set(projects.map(p => p.manager))].sort(), [projects]);
  const uniqueClients = useMemo(() =>
    [...new Set(projects.map(p => p.client))].sort(), [projects]);
  const uniqueProjectNumbers = useMemo(() =>
    [...new Set(projects.map(p => p.projectNumber))].sort(), [projects]);
  const uniqueCompletionMonths = useMemo(() =>
    [...new Set(projects.map(p => p.completionMonth || "未設定"))].sort(), [projects]);

  // 連系予定月の選択肢（YYYY-MM形式から「YYYY年M月」形式に変換）
  const uniqueInterconnectionMonths = useMemo(() => {
    const months = projects.map(p => {
      const date = p.interconnectionScheduled || p.interconnectionDate;
      if (!date) return "未設定";
      // YYYY-MM-DD または YYYY/MM/DD 形式から YYYY年M月 に変換
      const match = date.match(/^(\d{4})[-/](\d{1,2})/);
      if (match) {
        return `${match[1]}年${parseInt(match[2], 10)}月`;
      }
      return date;
    });
    return [...new Set(months)].sort();
  }, [projects]);

  // フィルター内検索で絞り込んだ選択肢
  const getFilteredOptions = (options: string[], searchQuery: string) => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(opt => opt.toLowerCase().includes(q));
  };

  // チェックボックスの選択/解除
  const toggleSelection = (
    value: string,
    selectedSet: Set<string>,
    setSelectedSet: React.Dispatch<React.SetStateAction<Set<string>>>
  ) => {
    setSelectedSet(prev => {
      const newSet = new Set(prev);
      if (newSet.has(value)) {
        newSet.delete(value);
      } else {
        newSet.add(value);
      }
      return newSet;
    });
  };

  // 全選択/全解除
  const selectAll = (
    options: string[],
    setSelectedSet: React.Dispatch<React.SetStateAction<Set<string>>>
  ) => {
    setSelectedSet(new Set(options));
  };

  const clearAll = (
    setSelectedSet: React.Dispatch<React.SetStateAction<Set<string>>>
  ) => {
    setSelectedSet(new Set());
  };

  // 全フィルターをクリア
  const clearAllFilters = () => {
    setSelectedManagementNumbers(new Set());
    setSelectedManagers(new Set());
    setSelectedClients(new Set());
    setSelectedProjectNumbers(new Set());
    setSelectedCompletionMonths(new Set());
    setSelectedInterconnectionMonths(new Set());
    setFilterSearchQuery("");
  };

  // フィルターが適用されているか
  const isFiltered = selectedManagementNumbers.size > 0 ||
    selectedManagers.size > 0 ||
    selectedClients.size > 0 ||
    selectedProjectNumbers.size > 0 ||
    selectedCompletionMonths.size > 0 ||
    selectedInterconnectionMonths.size > 0;

  // 検索フィルタリング（管理番号・案件番号・地権者・現地住所・コメント・TODO内容）+ チェックボックスフィルタ
  const filteredProjects = useMemo(() => {
    let result = projects;

    // テキスト検索フィルター
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((project) => {
        const addr = (project.address ?? "").toLowerCase();
        const l1 = (project.landowner1 ?? "").toLowerCase();
        const l2 = (project.landowner2 ?? "").toLowerCase();
        const l3 = (project.landowner3 ?? "").toLowerCase();
        const commentText = (project.commentSearchText ?? "").toLowerCase();
        const todoText = (project.todoSearchText ?? "").toLowerCase();
        return (
          project.managementNumber.toLowerCase().includes(query) ||
          project.projectNumber.toLowerCase().includes(query) ||
          addr.includes(query) ||
          l1.includes(query) ||
          l2.includes(query) ||
          l3.includes(query) ||
          commentText.includes(query) ||
          todoText.includes(query)
        );
      });
    }

    // チェックボックスフィルター
    if (selectedManagementNumbers.size > 0) {
      result = result.filter(p => selectedManagementNumbers.has(p.managementNumber));
    }
    if (selectedManagers.size > 0) {
      result = result.filter(p => selectedManagers.has(p.manager));
    }
    if (selectedClients.size > 0) {
      result = result.filter(p => selectedClients.has(p.client));
    }
    if (selectedProjectNumbers.size > 0) {
      result = result.filter(p => selectedProjectNumbers.has(p.projectNumber));
    }
    if (selectedCompletionMonths.size > 0) {
      result = result.filter(p => selectedCompletionMonths.has(p.completionMonth || "未設定"));
    }
    if (selectedInterconnectionMonths.size > 0) {
      result = result.filter(p => {
        const date = p.interconnectionScheduled || p.interconnectionDate;
        if (!date) return selectedInterconnectionMonths.has("未設定");
        const match = date.match(/^(\d{4})[-/](\d{1,2})/);
        if (match) {
          const monthStr = `${match[1]}年${parseInt(match[2], 10)}月`;
          return selectedInterconnectionMonths.has(monthStr);
        }
        return selectedInterconnectionMonths.has(date);
      });
    }

    return result;
  }, [projects, searchQuery, selectedManagementNumbers, selectedManagers, selectedClients, selectedProjectNumbers, selectedCompletionMonths, selectedInterconnectionMonths]);

  const fetchProjects = () => {
    fetch("/api/projects", { cache: "no-store" })
      .then((res) => res.json())
      .then(setProjects)
      .catch((err) => {
        console.error("案件一覧の取得に失敗しました:", err);
      });
  };

  // 直近の検索履歴をローカルから読み込み
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const handleSearchFocus = () => setShowSuggestions(true);
  const handleSearchBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
    const q = searchQuery.trim();
    if (q) setRecentSearches(addRecentSearch(q));
  };
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const q = searchQuery.trim();
      if (q) setRecentSearches(addRecentSearch(q));
    }
  };
  const handleSuggestionClick = (text: string) => {
    setSearchQuery(text);
    setRecentSearches(addRecentSearch(text));
    setShowSuggestions(false);
  };

  // インポート機能: フォルダ一覧を取得
  const fetchImportableFolders = async () => {
    setImportLoading(true);
    try {
      const res = await fetch("/api/projects/import");
      if (res.ok) {
        const data = await res.json();
        setImportableFolders(data.importable || []);
        setSelectedFolders(new Set()); // 選択をリセット
      }
    } catch (error) {
      console.error("Failed to fetch importable folders:", error);
    } finally {
      setImportLoading(false);
    }
  };

  // インポート機能: 選択した案件を登録
  const handleImport = async () => {
    if (selectedFolders.size === 0) return;

    const foldersToImport = importableFolders.filter(f => selectedFolders.has(f.folderName));

    setImportSubmitting(true);
    try {
      const res = await fetch("/api/projects/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folders: foldersToImport }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        setImportOpen(false);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "インポートに失敗しました");
      }
    } catch (error) {
      console.error("Import error:", error);
      alert("インポートに失敗しました");
    } finally {
      setImportSubmitting(false);
    }
  };

  // インポートダイアログを開く
  const openImportDialog = () => {
    setImportOpen(true);
    fetchImportableFolders();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.manager?.trim()) {
      alert("担当を選択してください");
      return;
    }
    setIsSubmitting(true);
    try {
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setForm({ managementNumber: "", manager: "", client: "", projectNumber: "", completionMonth: "" });
      setOpen(false);
      fetchProjects();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    await fetch(`/api/projects/${editingProject.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingProject),
    });
    setEditOpen(false);
    setEditingProject(null);
    fetchProjects();
  };

  const openEditDialog = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject({ ...project });
    setEditOpen(true);
    if (project.completionMonth) {
      const [year] = project.completionMonth.split("-");
      setCalendarYear(parseInt(year, 10));
    } else {
      setCalendarYear(new Date().getFullYear());
    }
  };

  const openDeleteDialog = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingProject(project);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingProject) return;
    await fetch(`/api/projects/${deletingProject.id}`, {
      method: "DELETE",
    });
    setDeleteOpen(false);
    setDeletingProject(null);
    fetchProjects();
  };

  const selectMonth = (monthIndex: number) => {
    const monthStr = `${calendarYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    setForm({ ...form, completionMonth: monthStr });
    setCalendarOpen(false);
  };

  const selectEditMonth = (monthIndex: number) => {
    if (!editingProject) return;
    const monthStr = `${calendarYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    setEditingProject({ ...editingProject, completionMonth: monthStr });
    setEditCalendarOpen(false);
  };

  const formatCompletionMonth = (value: string | null | undefined) => {
    if (!value) return "";
    const [year, month] = value.split("-");
    return `${year}年${parseInt(month, 10)}月`;
  };

  // セル値を取得するヘルパー
  const getCellValue = (project: ProjectWithOverdue, key: string): string => {
    const value = (project as Record<string, unknown>)[key];
    if (value === null || value === undefined) return "-";
    if (key === "completionMonth") return formatCompletionMonth(value as string) || "-";
    return String(value);
  };

  // セル値を取得するヘルパー（編集用 - 生の値を返す）
  const getRawCellValue = (project: ProjectWithOverdue, key: string): string => {
    const value = (project as Record<string, unknown>)[key];
    if (value === null || value === undefined) return "";
    return String(value);
  };

  // セル編集開始
  const startEditCell = useCallback((projectId: number, columnKey: string, currentValue: string) => {
    if (!isEditMode) return;
    setEditingCell({ projectId, columnKey });
    setEditingValue(currentValue === "-" ? "" : currentValue);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [isEditMode]);

  // セル編集保存
  const saveEditCell = useCallback(async () => {
    if (!editingCell) return;

    setIsSaving(true);
    try {
      const project = projects.find(p => p.id === editingCell.projectId);
      if (!project) return;

      const updateData = {
        ...project,
        [editingCell.columnKey]: editingValue || null,
      };

      const res = await fetch(`/api/projects/${editingCell.projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        // ローカルステートを更新
        setProjects(prev => prev.map(p =>
          p.id === editingCell.projectId
            ? { ...p, [editingCell.columnKey]: editingValue || null }
            : p
        ));
      }
    } catch (error) {
      console.error("Failed to save cell:", error);
    } finally {
      setIsSaving(false);
      setEditingCell(null);
      setEditingValue("");
    }
  }, [editingCell, editingValue, projects]);

  // セル編集キャンセル
  const cancelEditCell = useCallback(() => {
    setEditingCell(null);
    setEditingValue("");
  }, []);

  // キーボードイベント処理
  const handleCellKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEditCell();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditCell();
    } else if (e.key === "Tab") {
      e.preventDefault();
      saveEditCell();
    }
  }, [saveEditCell, cancelEditCell]);

  // 編集モード切り替え
  const toggleEditMode = useCallback(() => {
    if (isEditMode) {
      // 編集モード終了時に未保存の編集をキャンセル
      cancelEditCell();
    }
    setIsEditMode(prev => !prev);
  }, [isEditMode, cancelEditCell]);

  // フィルター付きヘッダーを生成するコンポーネント
  const FilterableHeader = ({
    columnKey,
    label,
    options,
    selected,
    setSelected,
  }: {
    columnKey: string;
    label: string;
    options: string[];
    selected: Set<string>;
    setSelected: React.Dispatch<React.SetStateAction<Set<string>>>;
  }) => (
    <Popover open={filterOpen === columnKey} onOpenChange={(open) => {
      setFilterOpen(open ? columnKey : null);
      if (!open) setFilterSearchQuery("");
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto p-1 text-xs font-semibold hover:text-foreground justify-start gap-1 whitespace-nowrap",
            selected.size > 0 && "text-primary"
          )}
        >
          <Filter className={cn("h-3 w-3", selected.size > 0 && "text-primary")} />
          {label}
          <ChevronDown className="h-2 w-2" />
          {selected.size > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[9px]">
              {selected.size}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-2 border-b">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="検索..."
              value={filterSearchQuery}
              onChange={(e) => setFilterSearchQuery(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => selectAll(getFilteredOptions(options, filterSearchQuery), setSelected)} className="h-6 text-xs flex-1">
              全選択
            </Button>
            <Button variant="outline" size="sm" onClick={() => clearAll(setSelected)} className="h-6 text-xs flex-1">
              全解除
            </Button>
          </div>
        </div>
        <ScrollArea className="h-[200px]">
          <div className="p-1">
            {getFilteredOptions(options, filterSearchQuery).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">見つかりません</p>
            ) : (
              getFilteredOptions(options, filterSearchQuery).map((value) => (
                <div key={value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer" onClick={() => toggleSelection(value, selected, setSelected)}>
                  <Checkbox checked={selected.has(value)} onCheckedChange={() => toggleSelection(value, selected, setSelected)} className="h-3 w-3" />
                  <span className="text-xs truncate">{columnKey === "completionMonth" && value !== "未設定" ? formatCompletionMonthForFilter(value) : value}</span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <div className="p-2 border-t">
          <Button variant="default" size="sm" onClick={() => { setFilterOpen(null); setFilterSearchQuery(""); }} className="w-full h-7 text-xs">
            適用 ({selected.size}件選択中)
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6">
      <div className="py-6 sm:py-10">
        <div className="space-y-4 sm:space-y-6">
          {/* ヘッダー: モバイルで縦積み */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="space-y-1 shrink-0">
              <h1 className="text-lg sm:text-2xl font-semibold">案件一覧</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                担当する案件を確認できます
              </p>
            </div>

            {/* 検索欄（直近3件のサジェスト付き） */}
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
              <Input
                placeholder="管理番号・案件番号・地権者・住所で検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-10 h-9 sm:h-10 text-sm bg-muted/50 border-0 focus-visible:ring-2 rounded-lg"
              />
              {showSuggestions && recentSearches.length > 0 && (
                <div
                  className="absolute left-0 right-0 top-full mt-1 z-20 rounded-lg border border-border bg-card shadow-lg overflow-hidden"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <p className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border bg-muted/30">
                    最近の検索
                  </p>
                  <ul className="py-1">
                    {recentSearches.map((text) => (
                      <li key={text}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
                          onMouseDown={() => handleSuggestionClick(text)}
                        >
                          {text}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 編集ボタン */}
            <Button
              size="sm"
              variant={isEditMode ? "default" : "outline"}
              onClick={toggleEditMode}
              className={cn(isEditMode && "bg-primary text-primary-foreground")}
            >
              {isEditMode ? (
                <>
                  <Check className="h-4 w-4" />
                  編集完了
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4" />
                  編集
                </>
              )}
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  新規登録
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>案件を新規登録</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="managementNumber">管理番号</Label>
                    <Input
                      id="managementNumber"
                      value={form.managementNumber}
                      onChange={(e) => setForm({ ...form, managementNumber: e.target.value })}
                      placeholder="例: P-001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manager">担当</Label>
                    <Select
                      value={form.manager || undefined}
                      onValueChange={(value) => setForm({ ...form, manager: value })}
                    >
                      <SelectTrigger id="manager" className="w-full">
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        {MANAGER_OPTIONS.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client">販売先</Label>
                    <Input
                      id="client"
                      value={form.client}
                      onChange={(e) => setForm({ ...form, client: e.target.value })}
                      placeholder="例: 〇〇不動産"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projectNumber">案件番号</Label>
                    <Input
                      id="projectNumber"
                      value={form.projectNumber}
                      onChange={(e) => setForm({ ...form, projectNumber: e.target.value })}
                      placeholder="例: 2026-0001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>完成月</Label>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.completionMonth ? formatCompletionMonth(form.completionMonth) : "選択してください"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3">
                        <div className="flex items-center justify-between mb-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setCalendarYear(calendarYear - 1)}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="font-medium">{calendarYear}年</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setCalendarYear(calendarYear + 1)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {MONTHS.map((month, index) => (
                            <Button
                              key={month}
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-9"
                              onClick={() => selectMonth(index)}
                            >
                              {month}
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                      キャンセル
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          登録中...
                        </>
                      ) : (
                        "登録"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* フォルダからインポートボタン */}
            <Button size="sm" variant="outline" onClick={openImportDialog}>
              <FolderInput className="h-4 w-4" />
              一括取込
            </Button>
          </div>

          {/* インポートダイアログ */}
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>フォルダから案件を取込</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {importLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">読み込み中...</span>
                  </div>
                ) : importableFolders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p>すべての案件が登録済みです</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>未登録の案件フォルダ: {importableFolders.length}件</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (selectedFolders.size === importableFolders.length) {
                            setSelectedFolders(new Set());
                          } else {
                            setSelectedFolders(new Set(importableFolders.map(f => f.folderName)));
                          }
                        }}
                      >
                        {selectedFolders.size === importableFolders.length ? "全解除" : "全選択"}
                      </Button>
                    </div>
                    <ScrollArea className="h-[300px] border rounded-lg">
                      <div className="p-2 space-y-1">
                        {importableFolders.map((folder) => (
                          <label
                            key={folder.folderName}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                              selectedFolders.has(folder.folderName)
                                ? "bg-primary/10 border border-primary"
                                : "hover:bg-muted border border-transparent"
                            )}
                          >
                            <Checkbox
                              checked={selectedFolders.has(folder.folderName)}
                              onCheckedChange={(checked) => {
                                const newSet = new Set(selectedFolders);
                                if (checked) {
                                  newSet.add(folder.folderName);
                                } else {
                                  newSet.delete(folder.folderName);
                                }
                                setSelectedFolders(newSet);
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {folder.managementNumber}
                                </Badge>
                                <span className="text-sm font-medium">{folder.manager}</span>
                                <span className="text-sm text-muted-foreground">{folder.projectNumber}</span>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  </>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setImportOpen(false)}>
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={selectedFolders.size === 0 || importSubmitting}
                  >
                    {importSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        取込中...
                      </>
                    ) : (
                      `${selectedFolders.size}件を取込`
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* 編集ダイアログ */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>案件を編集</DialogTitle>
              </DialogHeader>
              {editingProject && (
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-managementNumber">管理番号</Label>
                    <Input
                      id="edit-managementNumber"
                      value={editingProject.managementNumber}
                      onChange={(e) => setEditingProject({ ...editingProject, managementNumber: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-manager">担当</Label>
                    <Select
                      value={editingProject.manager}
                      onValueChange={(value) => setEditingProject({ ...editingProject, manager: value })}
                    >
                      <SelectTrigger id="edit-manager" className="w-full">
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        {MANAGER_OPTIONS.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                        {editingProject.manager && !MANAGER_OPTIONS.includes(editingProject.manager) && (
                          <SelectItem value={editingProject.manager}>{editingProject.manager}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-client">販売先</Label>
                    <Input
                      id="edit-client"
                      value={editingProject.client}
                      onChange={(e) => setEditingProject({ ...editingProject, client: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-projectNumber">案件番号</Label>
                    <Input
                      id="edit-projectNumber"
                      value={editingProject.projectNumber}
                      onChange={(e) => setEditingProject({ ...editingProject, projectNumber: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>完成月</Label>
                    <Popover open={editCalendarOpen} onOpenChange={setEditCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editingProject.completionMonth ? formatCompletionMonth(editingProject.completionMonth) : "選択してください"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3">
                        <div className="flex items-center justify-between mb-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setCalendarYear(calendarYear - 1)}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="font-medium">{calendarYear}年</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setCalendarYear(calendarYear + 1)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {MONTHS.map((month, index) => (
                            <Button
                              key={month}
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-9"
                              onClick={() => selectEditMonth(index)}
                            >
                              {month}
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                      キャンセル
                    </Button>
                    <Button type="submit">保存</Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>

          {/* 削除確認ダイアログ */}
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>案件を削除</AlertDialogTitle>
                <AlertDialogDescription>
                  「{deletingProject?.managementNumber}」を削除しますか？
                  <br />
                  関連する進捗もすべて削除されます。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  削除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* クイックフィルタ（連系予定月・完成月） */}
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
            <span className="text-xs font-medium text-muted-foreground">クイックフィルタ:</span>

            {/* 連系予定月フィルタ */}
            <FilterableHeader
              columnKey="interconnectionMonth"
              label="連系予定月"
              options={uniqueInterconnectionMonths}
              selected={selectedInterconnectionMonths}
              setSelected={setSelectedInterconnectionMonths}
            />

            {/* 完成月フィルタ */}
            <FilterableHeader
              columnKey="completionMonth"
              label="完成月"
              options={uniqueCompletionMonths}
              selected={selectedCompletionMonths}
              setSelected={setSelectedCompletionMonths}
            />

            {/* フィルター数表示 */}
            {isFiltered && (
              <div className="flex items-center gap-2 ml-auto">
                <Badge variant="secondary" className="gap-1">
                  <Filter className="h-3 w-3" />
                  {filteredProjects.length}件
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-7 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  解除
                </Button>
              </div>
            )}
          </div>

          {/* 編集モード時のヘルプテキスト */}
          {isEditMode && (
            <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Pencil className="h-4 w-4 text-primary" />
              <span className="text-primary font-medium">編集モード:</span>
              <span className="text-muted-foreground">セルをクリックして編集 | Enter で保存 | Escape でキャンセル</span>
            </div>
          )}

          {/* 横スクロールのヒント */}
          <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <ChevronRight className="h-4 w-4 text-blue-500 animate-pulse" />
            <span className="text-blue-700 dark:text-blue-300">
              <span className="font-medium">横スクロール:</span>
              {" "}右側にもデータがあります。テーブル上で <span className="font-medium">Shift + マウスホイール</span> または <span className="font-medium">横スクロール</span> で確認できます。
            </span>
          </div>

          {/* 横スクロール対応テーブル - 固定カラムとスクロール可能カラムを分離 */}
          <div className="relative">
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex">
              {/* 固定カラム部分（管理番号、担当、販売先、販売店案件番号） */}
              <div className="flex-shrink-0 border-r border-border bg-background z-10">
                <Table>
                  <TableHeader>
                    <TableRow className="h-12 bg-muted/30">
                      <TableHead className="px-1 bg-muted/30" style={{ minWidth: "120px" }}>
                        <FilterableHeader
                          columnKey="managementNumber"
                          label="管理番号"
                          options={uniqueManagementNumbers}
                          selected={selectedManagementNumbers}
                          setSelected={setSelectedManagementNumbers}
                        />
                      </TableHead>
                      <TableHead className="px-1 bg-muted/30" style={{ minWidth: "80px" }}>
                        <FilterableHeader
                          columnKey="manager"
                          label="担当"
                          options={uniqueManagers}
                          selected={selectedManagers}
                          setSelected={setSelectedManagers}
                        />
                      </TableHead>
                      <TableHead className="px-1 bg-muted/30" style={{ minWidth: "120px" }}>
                        <FilterableHeader
                          columnKey="client"
                          label="販売先"
                          options={uniqueClients}
                          selected={selectedClients}
                          setSelected={setSelectedClients}
                        />
                      </TableHead>
                      <TableHead className="px-1 bg-muted/30" style={{ minWidth: "140px" }}>
                        <FilterableHeader
                          columnKey="projectNumber"
                          label="販売店 案件番号"
                          options={uniqueProjectNumbers}
                          selected={selectedProjectNumbers}
                          setSelected={setSelectedProjectNumbers}
                        />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.length === 0 ? (
                      <TableRow className="h-16">
                        <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-8">
                          {searchQuery ? "検索結果がありません" : "案件がありません"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProjects.map((project) => (
                        <TableRow
                          key={project.id}
                          className={cn(
                            "h-12",
                            !isEditMode && "cursor-pointer hover:bg-muted/50"
                          )}
                          onClick={() => {
                            if (!isEditMode) {
                              router.push(`/projects/${project.id}`);
                            }
                          }}
                        >
                          {/* 管理番号 */}
                          <TableCell className="font-medium text-sm py-2 px-2 bg-background">
                            {editingCell?.projectId === project.id && editingCell?.columnKey === "managementNumber" ? (
                              <Input
                                ref={inputRef}
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={handleCellKeyDown}
                                onBlur={saveEditCell}
                                className="h-8 text-sm"
                                disabled={isSaving}
                              />
                            ) : (
                              <div
                                className={cn(
                                  "flex items-center gap-2",
                                  isEditMode && "cursor-text hover:bg-muted/50 px-1 py-0.5 rounded"
                                )}
                                onClick={(e) => {
                                  if (isEditMode) {
                                    e.stopPropagation();
                                    startEditCell(project.id, "managementNumber", getRawCellValue(project, "managementNumber"));
                                  }
                                }}
                              >
                                {project.hasOverdue && (
                                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                                )}
                                <span className="truncate">{project.managementNumber}</span>
                              </div>
                            )}
                          </TableCell>
                          {/* 担当 */}
                          <TableCell className="text-sm py-2 px-2 bg-background">
                            {editingCell?.projectId === project.id && editingCell?.columnKey === "manager" ? (
                              <Input
                                ref={inputRef}
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={handleCellKeyDown}
                                onBlur={saveEditCell}
                                className="h-8 text-sm"
                                disabled={isSaving}
                              />
                            ) : (
                              <div
                                className={cn(
                                  isEditMode && "cursor-text hover:bg-muted/50 px-1 py-0.5 rounded"
                                )}
                                onClick={(e) => {
                                  if (isEditMode) {
                                    e.stopPropagation();
                                    startEditCell(project.id, "manager", getRawCellValue(project, "manager"));
                                  }
                                }}
                              >
                                {getCellValue(project, "manager")}
                              </div>
                            )}
                          </TableCell>
                          {/* 販売先 */}
                          <TableCell className="text-sm py-2 px-2 bg-background">
                            {editingCell?.projectId === project.id && editingCell?.columnKey === "client" ? (
                              <Input
                                ref={inputRef}
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={handleCellKeyDown}
                                onBlur={saveEditCell}
                                className="h-8 text-sm"
                                disabled={isSaving}
                              />
                            ) : (
                              <div
                                className={cn(
                                  isEditMode && "cursor-text hover:bg-muted/50 px-1 py-0.5 rounded"
                                )}
                                onClick={(e) => {
                                  if (isEditMode) {
                                    e.stopPropagation();
                                    startEditCell(project.id, "client", getRawCellValue(project, "client"));
                                  }
                                }}
                              >
                                {getCellValue(project, "client")}
                              </div>
                            )}
                          </TableCell>
                          {/* 販売店 案件番号 */}
                          <TableCell className="text-sm py-2 px-2 bg-background">
                            {editingCell?.projectId === project.id && editingCell?.columnKey === "projectNumber" ? (
                              <Input
                                ref={inputRef}
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={handleCellKeyDown}
                                onBlur={saveEditCell}
                                className="h-8 text-sm"
                                disabled={isSaving}
                              />
                            ) : (
                              <div
                                className={cn(
                                  isEditMode && "cursor-text hover:bg-muted/50 px-1 py-0.5 rounded"
                                )}
                                onClick={(e) => {
                                  if (isEditMode) {
                                    e.stopPropagation();
                                    startEditCell(project.id, "projectNumber", getRawCellValue(project, "projectNumber"));
                                  }
                                }}
                              >
                                {getCellValue(project, "projectNumber")}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* スクロール可能カラム部分 */}
              <ScrollArea className="flex-1">
                <div className="min-w-max">
                  <Table>
                    <TableHeader>
                      <TableRow className="h-12 bg-muted/30">
                        {/* 残りのカラム（フィルターなし） */}
                        {TABLE_COLUMNS.slice(4, -1).map((col) => (
                          <TableHead
                            key={col.key}
                            className="px-2 whitespace-nowrap text-xs font-semibold bg-muted/30"
                            style={{ minWidth: col.width }}
                          >
                            {col.label}
                          </TableHead>
                        ))}
                        {/* 完成月（フィルター付き） */}
                        <TableHead className="px-1 bg-muted/30" style={{ minWidth: "100px" }}>
                          <FilterableHeader
                            columnKey="completionMonth"
                            label="完成月"
                            options={uniqueCompletionMonths}
                            selected={selectedCompletionMonths}
                            setSelected={setSelectedCompletionMonths}
                          />
                        </TableHead>
                        {/* 完工 */}
                        <TableHead className="px-2 whitespace-nowrap text-xs font-semibold bg-muted/30" style={{ minWidth: "60px" }}>
                          完工
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProjects.length === 0 ? (
                        <TableRow className="h-16">
                          <TableCell colSpan={TABLE_COLUMNS.length - 4} className="text-center text-muted-foreground text-sm py-8">
                            &nbsp;
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProjects.map((project) => (
                          <TableRow
                            key={project.id}
                            className="h-12 hover:bg-muted/50"
                          >
                            {/* 残りのカラム（クリックしても詳細画面には遷移しない） */}
                            {TABLE_COLUMNS.slice(4).map((col) => (
                              <TableCell
                                key={col.key}
                                className="text-sm py-2 px-2 whitespace-nowrap"
                              >
                                {editingCell?.projectId === project.id && editingCell?.columnKey === col.key ? (
                                  <Input
                                    ref={inputRef}
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    onKeyDown={handleCellKeyDown}
                                    onBlur={saveEditCell}
                                    className="h-8 text-sm min-w-[100px]"
                                    disabled={isSaving}
                                  />
                                ) : (
                                  <div
                                    className={cn(
                                      isEditMode && "cursor-text hover:bg-muted/50 px-1 py-0.5 rounded min-h-[24px]"
                                    )}
                                    onClick={(e) => {
                                      if (isEditMode) {
                                        e.stopPropagation();
                                        startEditCell(project.id, col.key, getRawCellValue(project, col.key));
                                      }
                                    }}
                                  >
                                    {getCellValue(project, col.key)}
                                  </div>
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
