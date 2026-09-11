import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { addMonths, subMonths, setMonth, setYear } from "date-fns";

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

  it("ignores keyboard navigation without a current date or for unhandled keys", () => {
    const noDateProps = buildProps({ displayDate: null, selectedDate: null });
    const { result: noDate } = renderHook(() => useCalendarState(noDateProps as never));
    const preventDefault = vi.fn();

    act(() => {
      noDate.current.handleKeyDown({ key: "ArrowRight", preventDefault } as never);
    });
    expect(noDateProps.setTempDate).not.toHaveBeenCalled();

    const props = buildProps();
    const { result } = renderHook(() => useCalendarState(props as never));

    act(() => {
      result.current.handleKeyDown({ key: "Escape", preventDefault } as never);
    });
    expect(props.setTempDate).not.toHaveBeenCalled();
  });

  it("does not set a temp date when the keyboard target date is invalid", () => {
    const props = buildProps({ isDateValid: () => false });
    const { result } = renderHook(() => useCalendarState(props as never));
    const preventDefault = vi.fn();

    act(() => {
      result.current.handleKeyDown({ key: "ArrowDown", preventDefault } as never);
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(props.setTempDate).not.toHaveBeenCalled();
  });

  it("navigates to the previous month and updates the display date", () => {
    const props = buildProps();
    const { result } = renderHook(() => useCalendarState(props as never));
    const startMonth = result.current.currentMonth;

    act(() => {
      result.current.handlePreviousMonth();
    });

    expect(result.current.currentMonth).toEqual(subMonths(startMonth, 1));
    expect(props.updateDateOnMonthYearChange).toHaveBeenCalledWith(
      setYear(
        setMonth(new Date("2024-01-10"), subMonths(startMonth, 1).getMonth()),
        subMonths(startMonth, 1).getFullYear(),
      ),
    );
  });

  it("navigates to the next month and updates the display date", () => {
    const props = buildProps();
    const { result } = renderHook(() => useCalendarState(props as never));
    const startMonth = result.current.currentMonth;

    act(() => {
      result.current.handleNextMonth();
    });

    expect(result.current.currentMonth).toEqual(addMonths(startMonth, 1));
    expect(props.updateDateOnMonthYearChange).toHaveBeenCalled();
  });

  it("navigates the month without updating an invalid display date", () => {
    const props = buildProps({ isDateValid: () => false });
    const { result } = renderHook(() => useCalendarState(props as never));
    const startMonth = result.current.currentMonth;

    act(() => {
      result.current.handleNextMonth();
    });

    expect(result.current.currentMonth).toEqual(addMonths(startMonth, 1));
    expect(props.updateDateOnMonthYearChange).not.toHaveBeenCalled();
  });

  it("only moves the visible month when no date is selected", () => {
    const props = buildProps({ displayDate: null, selectedDate: null });
    const { result } = renderHook(() => useCalendarState(props as never));

    act(() => {
      result.current.handlePreviousMonth();
    });
    act(() => {
      result.current.handleMonthChange(3);
    });
    act(() => {
      result.current.handleYearChange(2030);
    });

    expect(result.current.currentMonth.getMonth()).toBe(3);
    expect(result.current.currentMonth.getFullYear()).toBe(2030);
    expect(props.updateDateOnMonthYearChange).not.toHaveBeenCalled();
  });

  it("does not update the date when month/year change produces an invalid date", () => {
    const props = buildProps({ isDateValid: () => false });
    const { result } = renderHook(() => useCalendarState(props as never));

    act(() => {
      result.current.handleMonthChange(5);
      result.current.handleYearChange(2026);
    });

    expect(props.updateDateOnMonthYearChange).not.toHaveBeenCalled();
  });

  it("clears temp values when opening a range calendar with no stored range", () => {
    vi.mocked(useFormikContext).mockReturnValue({ values: { date: null } } as never);
    const props = buildProps({ calendar: { useDatePicker: true, allowDateRange: true } });
    const { result } = renderHook(() => useCalendarState(props as never));

    act(() => {
      result.current.toggleCalendar();
    });

    expect(props.setTempRangeStart).toHaveBeenCalledWith(null);
    expect(props.setTempRangeEnd).toHaveBeenCalledWith(null);
    expect(props.setTempDate).toHaveBeenCalledWith(null);
  });

  it("clears the temp date when opening a single calendar with an invalid stored value", () => {
    vi.mocked(useFormikContext).mockReturnValue({ values: { date: "not-a-date" } } as never);
    const props = buildProps();
    const { result } = renderHook(() => useCalendarState(props as never));

    act(() => {
      result.current.toggleCalendar();
    });

    expect(props.setTempDate).toHaveBeenCalledWith(null);
  });

  it("closes an open calendar without re-initialising temp values", () => {
    const props = buildProps();
    const { result } = renderHook(() => useCalendarState(props as never));

    act(() => {
      result.current.toggleCalendar();
    });
    expect(result.current.showCalendar).toBe(true);

    act(() => {
      result.current.toggleCalendar();
    });

    expect(result.current.showCalendar).toBe(false);
    expect(props.saveOriginalValue).toHaveBeenCalledTimes(1);
  });
});
