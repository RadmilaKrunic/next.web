import { useState } from "react";
import { QuickFilter } from "components/ui/List/List.types";

interface UseReimbursementDateFilterResult {
  quickFilters: QuickFilter[];
  handleToggleFilter: (key: string) => void;
}

// Quick filter selection is intentionally not persisted (sessionStorage/localStorage):
// it must always reset to the default (unselected) state on page refresh/navigation.
export function useReimbursementDateFilter(): UseReimbursementDateFilterResult {
  const [quickFilters, setQuickFilters] = useState<QuickFilter[]>([
    { key: "lastMonth", label: "lastMonth", selected: false },
  ]);

  const handleToggleFilter = (key: string) => {
    setQuickFilters((prev) =>
      prev.map((f) => (f.key === key ? { ...f, selected: !f.selected } : f)),
    );
  };

  return {
    quickFilters,
    handleToggleFilter,
  };
}
