import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { QuickFilter, Filter } from "components/ui/List/List.types";
import { hasFilterValue } from "components/ui/List/List.utils";

export function useListFilterHandlers(
  setQuickFilters: Dispatch<SetStateAction<QuickFilter[]>>,
  setAdvancedFilters: Dispatch<SetStateAction<Filter[]>>,
  setPagination: Dispatch<SetStateAction<{ page: number; pageSize: number }>>,
  type?: "job" | "claim" | "approval",
) {
  const handleToggleFilter = (key: string) => {
    setQuickFilters((prev) => {
      const quickFilters = prev.map((f) => (f.key === key ? { ...f, selected: !f.selected } : f));
      if (type) {
        sessionStorage.setItem(`${type}-quickFilters`, JSON.stringify(quickFilters));
      }
      return quickFilters;
    });
  };

  const applyAdvancedFilters = useCallback(
    (filters: Filter[]) => {
      setAdvancedFilters(filters.filter(hasFilterValue));
      setPagination((prev) => ({ ...prev, page: 1 }));
    },
    [setAdvancedFilters, setPagination],
  );

  const resetAdvancedFilters = useCallback(() => {
    setAdvancedFilters([]);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [setAdvancedFilters, setPagination]);

  return { handleToggleFilter, applyAdvancedFilters, resetAdvancedFilters };
}
