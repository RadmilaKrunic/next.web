import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useListFilterHandlers } from "./useListFilterHandlers";
import type { QuickFilter, Filter } from "components/ui/List/List.types";

describe("useListFilterHandlers", () => {
  function setup() {
    const setQuickFilters = vi.fn();
    const setAdvancedFilters = vi.fn();
    const setPagination = vi.fn();
    const { result } = renderHook(() =>
      useListFilterHandlers(setQuickFilters, setAdvancedFilters, setPagination),
    );
    return { result, setQuickFilters, setAdvancedFilters, setPagination };
  }

  it("handleToggleFilter toggles selected on matching key", () => {
    const { result, setQuickFilters } = setup();

    act(() => {
      result.current.handleToggleFilter("status");
    });

    expect(setQuickFilters).toHaveBeenCalled();

    // Simulate the updater function behavior
    const updater = vi.mocked(setQuickFilters).mock.calls[0][0] as (
      prev: QuickFilter[],
    ) => QuickFilter[];
    const prev: QuickFilter[] = [
      { key: "status", label: "Status", selected: false },
      { key: "other", label: "Other", selected: false },
    ];
    const next = updater(prev);
    expect(next[0].selected).toBe(true);
    expect(next[1].selected).toBe(false);
  });

  it("applyAdvancedFilters filters out empty values and resets page", () => {
    const { result, setAdvancedFilters, setPagination } = setup();

    const filters: Filter[] = [
      { name: "status", value: "DRAFT" },
      { name: "empty", value: "" },
    ];

    act(() => {
      result.current.applyAdvancedFilters(filters);
    });

    expect(setAdvancedFilters).toHaveBeenCalledWith([{ name: "status", value: "DRAFT" }]);
    expect(setPagination).toHaveBeenCalled();
  });

  it("resetAdvancedFilters clears filters and resets page to 1", () => {
    const { result, setAdvancedFilters, setPagination } = setup();

    act(() => {
      result.current.resetAdvancedFilters();
    });

    expect(setAdvancedFilters).toHaveBeenCalledWith([]);
    expect(setPagination).toHaveBeenCalled();
  });
});
