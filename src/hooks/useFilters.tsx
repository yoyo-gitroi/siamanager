import { useState } from "react";

export interface VideoFilters {
  search: string;
  dateRange: { start: Date | null; end: Date | null };
  videoLength: "all" | "shorts" | "medium" | "long";
  minViews: number;
  minCTR: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export const useFilters = () => {
  const [filters, setFilters] = useState<VideoFilters>({
    search: "",
    dateRange: { start: null, end: null },
    videoLength: "all",
    minViews: 0,
    minCTR: 0,
    sortBy: "totalViews",
    sortOrder: "desc",
  });

  const updateFilter = <K extends keyof VideoFilters>(
    key: K,
    value: VideoFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      dateRange: { start: null, end: null },
      videoLength: "all",
      minViews: 0,
      minCTR: 0,
      sortBy: "totalViews",
      sortOrder: "desc",
    });
  };

  return {
    filters,
    updateFilter,
    resetFilters,
  };
};
