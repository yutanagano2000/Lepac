import useSWR from "swr";
import type { SearchResult } from "./types";

const fetcher = async (url: string): Promise<SearchResult[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as SearchResult[]) : [];
};

export function useSearchQuery(debouncedQuery: string) {
  const trimmed = debouncedQuery.trim();
  const key = trimmed ? `/api/search?q=${encodeURIComponent(trimmed)}` : null;

  const { data, error, isLoading, isValidating } = useSWR<SearchResult[]>(
    key,
    fetcher,
    {
      keepPreviousData: true,
      dedupingInterval: 2000,
      revalidateOnFocus: false,
    }
  );

  return {
    results: data ?? [],
    isSearching: isLoading || isValidating,
    searchError: error ? "検索に失敗しました" : null,
  };
}
