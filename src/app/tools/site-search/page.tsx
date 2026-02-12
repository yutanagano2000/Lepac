"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Search, Star, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { SiteAddDialog } from "./_components/SiteAddDialog";
import { SiteListItem } from "./_components/SiteListItem";
import { SITE_STATUS_OPTIONS } from "@/lib/site-scoring";
import type { SavedSite } from "@/db/schema";

export default function SiteSearchPage() {
  const [sites, setSites] = useState<SavedSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStars, setFilterStars] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [csrfToken, setCsrfToken] = useState("");

  // CSRF取得
  useEffect(() => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) setCsrfToken(meta.getAttribute("content") || "");
  }, []);

  const fetchSites = useCallback(async () => {
    try {
      const res = await fetch("/api/sites");
      if (res.ok) {
        const data = await res.json();
        setSites(data.sites);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSites(); }, [fetchSites]);

  const handleAdd = async (data: Record<string, unknown>) => {
    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify(data),
    });
    if (res.ok) await fetchSites();
  };

  const handleStatusChange = async (id: number, status: string) => {
    await fetch(`/api/sites/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify({ status }),
    });
    setSites(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleDelete = async (id: number) => {
    if (!confirm("この候補地を削除しますか？")) return;
    await fetch(`/api/sites/${id}`, {
      method: "DELETE",
      headers: { "x-csrf-token": csrfToken },
    });
    setSites(prev => prev.filter(s => s.id !== id));
  };

  const handleExportCSV = () => {
    const headers = ["☆", "住所", "地目", "面積㎡", "農振区分", "都市計画", "所有者意向", "ステータス", "スコア", "メモ"];
    const rows = filtered.map(s => [
      s.stars, s.address || "", s.landCategory || "", s.areaSqm || "",
      s.noushinClass || "", s.cityPlanningClass || "", s.ownerIntention || "",
      SITE_STATUS_OPTIONS.find(o => o.value === s.status)?.label || s.status,
      s.score, s.memo || "",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `候補地リスト_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // フィルタリング
  const filtered = sites.filter(s => {
    if (filterStars !== "all" && s.stars !== Number(filterStars)) return false;
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (searchText) {
      const q = searchText.toLowerCase();
      return (s.address?.toLowerCase().includes(q)) || (s.memo?.toLowerCase().includes(q));
    }
    return true;
  });

  // 統計
  const starCounts = [5, 4, 3, 2, 1].map(s => ({
    stars: s,
    count: sites.filter(site => site.stars === s).length,
  }));

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6">
      <div className="mx-auto max-w-4xl py-6 sm:py-10 space-y-4">
        {/* ヘッダー */}
        <div className="flex items-center gap-3">
          <Link href="/tools">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">候補地探索</h1>
            <p className="text-sm text-muted-foreground">太陽光発電の候補地をランク付きで管理</p>
          </div>
          <SiteAddDialog onAdd={handleAdd} csrfToken={csrfToken} />
        </div>

        {/* 統計サマリー */}
        <div className="flex gap-2 flex-wrap">
          {starCounts.map(({ stars, count }) => (
            <Badge key={stars} variant={count > 0 ? "default" : "outline"} className="text-xs cursor-pointer"
              onClick={() => setFilterStars(filterStars === String(stars) ? "all" : String(stars))}>
              {"★".repeat(stars)} {count}件
            </Badge>
          ))}
          <Badge variant="secondary" className="text-xs">計 {sites.length}件</Badge>
        </div>

        {/* フィルター */}
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="住所・メモで検索" className="pl-8 h-9"
              value={searchText} onChange={e => setSearchText(e.target.value)} />
          </div>
          <Select value={filterStars} onValueChange={setFilterStars}>
            <SelectTrigger className="w-28 h-9"><SelectValue placeholder="☆" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全て</SelectItem>
              {[5, 4, 3, 2, 1].map(s => <SelectItem key={s} value={String(s)}>☆{s}以上</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-28 h-9"><SelectValue placeholder="ステータス" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全て</SelectItem>
              {SITE_STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9" onClick={handleExportCSV} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-1" />CSV
          </Button>
        </div>

        {/* リスト */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {sites.length === 0
              ? "候補地がまだありません。「候補地を追加」から登録してください。"
              : "条件に一致する候補地がありません。"}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(site => (
              <SiteListItem key={site.id} site={site}
                onStatusChange={handleStatusChange} onDelete={handleDelete} />
            ))}
          </div>
        )}

        {/* 免責 */}
        <div className="text-[11px] text-muted-foreground bg-muted/50 rounded p-3 space-y-1">
          <p>⚠️ <strong>一次判定</strong>：最終的な農振除外の可否は農業委員会窓口でご確認ください。</p>
          <p>⚠️ 農地種別（第1種/第2種/第3種）はデータで取得できないため、個別に農業委員会へお問い合わせください。</p>
          <p>参考リンク：
            <a href="https://map.maff.go.jp/" target="_blank" rel="noopener noreferrer" className="underline ml-1">eMAFF農地ナビ</a>
            <a href="https://disaportal.gsi.go.jp/" target="_blank" rel="noopener noreferrer" className="underline ml-1">ハザードマップ</a>
            <a href="https://www.renewable-energy-potential.env.go.jp/RenewableEnergy/" target="_blank" rel="noopener noreferrer" className="underline ml-1">REPOS</a>
          </p>
        </div>
      </div>
    </div>
  );
}
