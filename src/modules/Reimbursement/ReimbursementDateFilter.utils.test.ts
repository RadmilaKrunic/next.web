import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  baseCalendarConfig,
  getDateRangeCalendarConfigs,
  getDefaultDateRange,
  useReimbursementDateRangeFilter,
  useReimbursementPagination,
} from "./ReimbursementDateFilter.utils";

const mockHandleToggleFilter = vi.fn();
let mockQuickFilters: { key: string; label: string; selected: boolean }[] = [
  { key: "lastMonth", label: "lastMonth", selected: false },
];

vi.mock("hooks/useReimbursementDateFilter", () => ({
  useReimbursementDateFilter: () => ({
    quickFilters: mockQuickFilters,
    handleToggleFilter: mockHandleToggleFilter,
  }),
}));

const pad = (n: number) => String(n).padStart(2, "0");

vi.mock("./Reimbursement.utils", () => ({
  formatDateDMY: (date: Date) =>
    `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`,
  convertDMYToISO: (dmy: string) => {
    const [day, month, year] = dmy.split(".");
    return `${year}-${month}-${day}`;
  },
}));

describe("getDateRangeCalendarConfigs", () => {
  it("returns fromCalendarConfig with startOfTheDay=true and endOfTheDay=false", () => {
    const { fromCalendarConfig } = getDateRangeCalendarConfigs();
    expect(fromCalendarConfig).toEqual({
      ...baseCalendarConfig,
      startOfTheDay: true,
      endOfTheDay: false,
    });
  });

  it("returns toCalendarConfig with startOfTheDay=false and endOfTheDay=true", () => {
    const { toCalendarConfig } = getDateRangeCalendarConfigs();
    expect(toCalendarConfig).toEqual({
      ...baseCalendarConfig,
      startOfTheDay: false,
      endOfTheDay: true,
    });
  });

  it("does not mutate baseCalendarConfig", () => {
    getDateRangeCalendarConfigs();
    expect(baseCalendarConfig).not.toHaveProperty("startOfTheDay");
    expect(baseCalendarConfig).not.toHaveProperty("endOfTheDay");
  });
});

describe("getDefaultDateRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 15)); // 15.03.2026
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses a range starting 2 months before today when useTwoMonths=true", () => {
    const { defaultFromDate, defaultToDate } = getDefaultDateRange(true);
    expect(defaultFromDate).toBe("15.01.2026");
    expect(defaultToDate).toBe("15.03.2026");
  });

  it("uses a range starting 14 days before today when useTwoMonths=false", () => {
    const { defaultFromDate, defaultToDate } = getDefaultDateRange(false);
    expect(defaultFromDate).toBe("01.03.2026");
    expect(defaultToDate).toBe("15.03.2026");
  });

  it("returns today as a Date instance", () => {
    const { today } = getDefaultDateRange(true);
    expect(today).toBeInstanceOf(Date);
    expect(today.getFullYear()).toBe(2026);
  });
});

describe("useReimbursementDateRangeFilter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 15)); // 15.03.2026
    mockHandleToggleFilter.mockClear();
    mockQuickFilters = [{ key: "lastMonth", label: "lastMonth", selected: false }];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes dateValues with the default ISO range", () => {
    const { result } = renderHook(() => useReimbursementDateRangeFilter(true));
    expect(result.current.dateValues).toEqual({
      fromDate: "2026-01-15",
      toDate: "2026-03-15",
    });
  });

  it("uses the 14-day default range when useTwoMonths=false", () => {
    const { result } = renderHook(() => useReimbursementDateRangeFilter(false));
    expect(result.current.dateValues).toEqual({
      fromDate: "2026-03-01",
      toDate: "2026-03-15",
    });
  });

  it("exposes quickFilters from the underlying hook", () => {
    const { result } = renderHook(() => useReimbursementDateRangeFilter(true));
    expect(result.current.quickFilters).toEqual(mockQuickFilters);
  });

  it("calls handleToggleFilter with the given key for non-lastMonth filters", () => {
    const { result } = renderHook(() => useReimbursementDateRangeFilter(true));
    act(() => {
      result.current.handleFilterToggle("someOtherFilter");
    });
    expect(mockHandleToggleFilter).toHaveBeenCalledWith("someOtherFilter");
    // dateValues unchanged
    expect(result.current.dateValues).toEqual({
      fromDate: "2026-01-15",
      toDate: "2026-03-15",
    });
  });

  it("sets dateValues to last month's range when lastMonth becomes selected", () => {
    const { result } = renderHook(() => useReimbursementDateRangeFilter(true));

    act(() => {
      result.current.handleFilterToggle("lastMonth");
    });

    expect(mockHandleToggleFilter).toHaveBeenCalledWith("lastMonth");
    expect(result.current.dateValues).toEqual({
      fromDate: "2026-02-01",
      toDate: "2026-02-28",
    });
  });

  it("resets dateValues to the default range when lastMonth becomes deselected", () => {
    const { result, rerender } = renderHook(
      ({ useTwoMonths }) => useReimbursementDateRangeFilter(useTwoMonths),
      { initialProps: { useTwoMonths: true } },
    );

    // simuliraj da je lastMonth trenutno selektovan (vanjski hook to sada javlja)
    mockQuickFilters = [{ key: "lastMonth", label: "lastMonth", selected: true }];
    rerender({ useTwoMonths: true });

    act(() => {
      result.current.handleFilterToggle("lastMonth");
    });

    expect(mockHandleToggleFilter).toHaveBeenCalledWith("lastMonth");
    expect(result.current.dateValues).toEqual({
      fromDate: "2026-01-15",
      toDate: "2026-03-15",
    });
  });

  it("allows manually overriding dateValues via setDateValues", () => {
    const { result } = renderHook(() => useReimbursementDateRangeFilter(true));

    act(() => {
      result.current.setDateValues({ fromDate: "2026-05-01", toDate: "2026-05-10" });
    });

    expect(result.current.dateValues).toEqual({
      fromDate: "2026-05-01",
      toDate: "2026-05-10",
    });
  });
});

describe("useReimbursementPagination", () => {
  it("initializes with page 1 and pageSize 10", () => {
    const { result } = renderHook(() => useReimbursementPagination());
    expect(result.current.pagination).toEqual({ page: 1, pageSize: 10 });
  });

  it("updates only the page on handlePageChange", () => {
    const { result } = renderHook(() => useReimbursementPagination());

    act(() => {
      result.current.handlePageChange(3);
    });

    expect(result.current.pagination).toEqual({ page: 3, pageSize: 10 });
  });

  it("resets page to 1 and sets pageSize on handlePageSizeChange", () => {
    const { result } = renderHook(() => useReimbursementPagination());

    act(() => {
      result.current.handlePageChange(4);
    });
    act(() => {
      result.current.handlePageSizeChange("25");
    });

    expect(result.current.pagination).toEqual({ page: 1, pageSize: 25 });
  });

  it("exposes setPagination for direct updates", () => {
    const { result } = renderHook(() => useReimbursementPagination());

    act(() => {
      result.current.setPagination({ page: 7, pageSize: 50 });
    });

    expect(result.current.pagination).toEqual({ page: 7, pageSize: 50 });
  });
});
