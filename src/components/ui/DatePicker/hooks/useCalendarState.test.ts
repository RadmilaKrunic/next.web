import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("formik", () => ({
  useFormikContext: vi.fn(),
}));

vi.mock("./DatePicker.utils", () => ({
  parseDate: vi.fn((value: string) => (value ? new Date(value) : null)),
}));

import { useFormikContext } from "formik";
import { useCalendarState } from "./useCalendarState";

function buildProps(overrides?: Record<string, unknown>) {
  return {
    name: "date",
    calendar: { useDatePicker: true, allowDateRange: false },
    isDateValid: () => true,
    displayDate: new Date("2024-01-10"),
    selectedDate: new Date("2024-01-10"),
    setTempDate: vi.fn(),
    setTempRangeStart: vi.fn(),
    setTempRangeEnd: vi.fn(),
    updateDateOnMonthYearChange: vi.fn(),
    saveOriginalValue: vi.fn(),
    saveOriginalRangeValue: vi.fn(),
    ...overrides,
  };
}

describe("useCalendarState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFormikContext).mockReturnValue({
      values: { date: "2024-01-10T00:00:00.000Z" },
    } as never);
  });

  it("does not open when useDatePicker is false", () => {
    const props = buildProps({ calendar: { useDatePicker: false } });
    const { result } = renderHook(() => useCalendarState(props as never));

    act(() => {
      result.current.toggleCalendar();
    });

    expect(result.current.showCalendar).toBe(false);
  });

  it("opens single date calendar and sets temp date", () => {
    const props = buildProps();
    const { result } = renderHook(() => useCalendarState(props as never));

    act(() => {
      result.current.toggleCalendar();
    });

    expect(props.saveOriginalValue).toHaveBeenCalled();
    expect(props.setTempDate).toHaveBeenCalled();
    expect(result.current.showCalendar).toBe(true);
  });

  it("opens range calendar and sets range values", () => {
    vi.mocked(useFormikContext).mockReturnValue({
      values: { date: "2024-01-01T00:00:00.000Z,2024-01-05T00:00:00.000Z" },
    } as never);
    const props = buildProps({ calendar: { useDatePicker: true, allowDateRange: true } });
    const { result } = renderHook(() => useCalendarState(props as never));

    act(() => {
      result.current.toggleCalendar();
    });

    expect(props.saveOriginalRangeValue).toHaveBeenCalled();
    expect(props.setTempRangeStart).toHaveBeenCalled();
    expect(props.setTempRangeEnd).toHaveBeenCalled();
    expect(result.current.showCalendar).toBe(true);
  });

  it("changes month and updates display date", () => {
    const props = buildProps();
    const { result } = renderHook(() => useCalendarState(props as never));

    act(() => {
      result.current.handleMonthChange(5);
    });

    expect(props.updateDateOnMonthYearChange).toHaveBeenCalled();
  });

  it("changes year and updates display date", () => {
    const props = buildProps();
    const { result } = renderHook(() => useCalendarState(props as never));

    act(() => {
      result.current.handleYearChange(2026);
    });

    expect(props.updateDateOnMonthYearChange).toHaveBeenCalled();
  });

  it("handles keyboard navigation", () => {
    const props = buildProps();
    const { result } = renderHook(() => useCalendarState(props as never));
    const preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyDown({ key: "ArrowRight", preventDefault } as never);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(props.setTempDate).toHaveBeenCalled();
  });
});
