import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("formik", () => ({
  useFormikContext: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "en" } }),
}));

vi.mock("./DatePicker.utils", () => ({
  getLocale: vi.fn(() => ({ code: "en" })),
  parseDate: vi.fn((value?: string | null) => (value ? new Date(value) : null)),
}));

vi.mock("./useDateInput", () => ({
  useDateInput: vi.fn(),
}));

vi.mock("./useCalendarState", () => ({
  useCalendarState: vi.fn(),
}));

vi.mock("./useRangeSelection", () => ({
  useRangeSelection: vi.fn(),
}));

vi.mock("./useSingleDateSelection", () => ({
  useSingleDateSelection: vi.fn(),
}));

vi.mock("./useCalendarComputedValues", () => ({
  useCalendarComputedValues: vi.fn(),
}));

import { useFormikContext } from "formik";
import { useDateInput } from "./useDateInput";
import { useCalendarState } from "./useCalendarState";
import { useRangeSelection } from "./useRangeSelection";
import { useSingleDateSelection } from "./useSingleDateSelection";
import { useCalendarComputedValues } from "./useCalendarComputedValues";
import { useDatePicker } from "./useDatePicker";

function setupMocks(overrides?: { values?: Record<string, string | null> }) {
  const setFieldValue = vi.fn();
  const handleBlur = vi.fn();

  vi.mocked(useFormikContext).mockReturnValue({
    values: overrides?.values ?? { date: null },
    setFieldValue,
    handleBlur,
  } as never);

  const setTempDate = vi.fn();
  const setTempRangeStart = vi.fn();
  const setTempRangeEnd = vi.fn();

  vi.mocked(useSingleDateSelection).mockReturnValue({
    tempDate: null,
    setTempDate,
    saveOriginalValue: vi.fn(),
    updateDateOnMonthYearChange: vi.fn(),
    handleCancel: vi.fn((closeFlyout: () => void) => closeFlyout()),
    handleConfirm: vi.fn((closeFlyout: () => void) => closeFlyout()),
    handleDateClick: vi.fn(),
    isRangeStart: vi.fn(() => false),
    isRangeEnd: vi.fn(() => false),
  } as never);

  vi.mocked(useRangeSelection).mockReturnValue({
    tempRangeStart: null,
    tempRangeEnd: null,
    setTempRangeStart,
    setTempRangeEnd,
    saveOriginalValue: vi.fn(),
    handleCancel: vi.fn((closeFlyout: () => void) => closeFlyout()),
    handleConfirm: vi.fn((closeFlyout: () => void) => closeFlyout()),
    handleDateClick: vi.fn(),
    isInRange: vi.fn(() => false),
    isRangeStart: vi.fn(() => false),
    isRangeEnd: vi.fn(() => false),
  } as never);

  vi.mocked(useCalendarState).mockReturnValue({
    showCalendar: false,
    currentMonth: new Date("2024-01-01"),
    setCurrentMonth: vi.fn(),
    setShowCalendar: vi.fn(),
    toggleCalendar: vi.fn(),
    handleMonthChange: vi.fn(),
    handleYearChange: vi.fn(),
    handleKeyDown: vi.fn(),
  } as never);

  vi.mocked(useDateInput).mockReturnValue({
    inputValue: "",
    isEditing: false,
    handleInputChange: vi.fn(),
    handleInputFocus: vi.fn(),
    handleInputBlur: vi.fn(),
    applyInputValue: vi.fn(),
    resetEditing: vi.fn(),
  } as never);

  vi.mocked(useCalendarComputedValues).mockReturnValue({
    displayDate: new Date("2024-01-01"),
    displayValue: "01.01.2024",
    monthOptions: [],
    yearOptions: [],
    calendarDays: [],
    weekDays: ["Mo", "Tu"],
  } as never);

  return { setFieldValue, handleBlur, setTempDate, setTempRangeStart, setTempRangeEnd };
}

describe("useDatePicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns expected shape with computed values", () => {
    setupMocks({ values: { date: "2024-01-10T00:00:00.000Z" } });

    const { result } = renderHook(() =>
      useDatePicker({
        name: "date",
        calendar: { useDateInput: true, useDatePicker: true, dateFormat: "dd.MM.yyyy" } as never,
      }),
    );

    expect(result.current.displayValue).toBe("01.01.2024");
    expect(result.current.weekDays).toEqual(["Mo", "Tu"]);
    expect(result.current.selectedDate).toBeInstanceOf(Date);
  });

  it("sets default today when setDefaultToday=true and no value", () => {
    const { setFieldValue } = setupMocks({ values: { date: null } });

    renderHook(() =>
      useDatePicker({
        name: "date",
        calendar: { setDefaultToday: true, allowDateRange: false } as never,
      }),
    );

    expect(setFieldValue).toHaveBeenCalled();
  });

  it("sets defaultDate when provided and no value", () => {
    const { setFieldValue } = setupMocks({ values: { date: null } });

    renderHook(() =>
      useDatePicker({
        name: "date",
        calendar: { defaultDate: "2024-01-20T00:00:00.000Z" } as never,
      }),
    );

    expect(setFieldValue).toHaveBeenCalledWith("date", "2024-01-20T00:00:00.000Z");
  });

  it("handleCloseFlyout resets temp values and calls formik blur", () => {
    const { handleBlur, setTempDate, setTempRangeStart, setTempRangeEnd } = setupMocks();

    const { result } = renderHook(() =>
      useDatePicker({
        name: "date",
        calendar: { allowDateRange: false } as never,
      }),
    );

    act(() => {
      result.current.handleCloseFlyout();
    });

    expect(setTempDate).toHaveBeenCalledWith(null);
    expect(setTempRangeStart).toHaveBeenCalledWith(null);
    expect(setTempRangeEnd).toHaveBeenCalledWith(null);
    expect(handleBlur).toHaveBeenCalled();
  });

  it("delegates handleCancel to rangeSelection in range mode", () => {
    const rangeCancel = vi.fn((closeFlyout: () => void) => closeFlyout());
    setupMocks();
    vi.mocked(useRangeSelection).mockReturnValue({
      tempRangeStart: null,
      tempRangeEnd: null,
      setTempRangeStart: vi.fn(),
      setTempRangeEnd: vi.fn(),
      saveOriginalValue: vi.fn(),
      handleCancel: rangeCancel,
      handleConfirm: vi.fn(),
      handleDateClick: vi.fn(),
      isInRange: vi.fn(() => false),
      isRangeStart: vi.fn(() => false),
      isRangeEnd: vi.fn(() => false),
    } as never);

    const { result } = renderHook(() =>
      useDatePicker({
        name: "date",
        calendar: { allowDateRange: true } as never,
      }),
    );

    act(() => {
      result.current.handleCancel();
    });

    expect(rangeCancel).toHaveBeenCalled();
  });

  it("delegates handleConfirm to singleDateSelection in single mode", () => {
    const singleConfirm = vi.fn((closeFlyout: () => void) => closeFlyout());
    setupMocks();
    vi.mocked(useSingleDateSelection).mockReturnValue({
      tempDate: null,
      setTempDate: vi.fn(),
      saveOriginalValue: vi.fn(),
      updateDateOnMonthYearChange: vi.fn(),
      handleCancel: vi.fn(),
      handleConfirm: singleConfirm,
      handleDateClick: vi.fn(),
      isRangeStart: vi.fn(() => false),
      isRangeEnd: vi.fn(() => false),
    } as never);

    const { result } = renderHook(() =>
      useDatePicker({
        name: "date",
        calendar: { allowDateRange: false } as never,
      }),
    );

    act(() => {
      result.current.handleConfirm();
    });

    expect(singleConfirm).toHaveBeenCalled();
  });

  it("calls dateInput.applyInputValue when confirming during editing", () => {
    const applyInputValue = vi.fn();
    setupMocks();
    vi.mocked(useDateInput).mockReturnValue({
      ...(vi.mocked(useDateInput).mock.results[0]?.value as object),
      isEditing: true,
      applyInputValue,
    } as never);

    const { result } = renderHook(() =>
      useDatePicker({
        name: "date",
        calendar: { allowDateRange: false } as never,
      }),
    );

    act(() => {
      result.current.handleConfirm();
    });

    expect(applyInputValue).toHaveBeenCalled();
  });

  it("handleDateClick resets editing and routes to range selection in range mode", () => {
    const resetEditing = vi.fn();
    const rangeClick = vi.fn();
    const setTempDate = vi.fn();

    setupMocks();
    vi.mocked(useDateInput).mockReturnValue({
      ...(vi.mocked(useDateInput).mock.results[0]?.value as object),
      resetEditing,
    } as never);
    vi.mocked(useRangeSelection).mockReturnValue({
      ...(vi.mocked(useRangeSelection).mock.results[0]?.value as object),
      handleDateClick: rangeClick,
    } as never);
    vi.mocked(useSingleDateSelection).mockReturnValue({
      ...(vi.mocked(useSingleDateSelection).mock.results[0]?.value as object),
      setTempDate,
    } as never);

    const { result } = renderHook(() =>
      useDatePicker({
        name: "date",
        calendar: { allowDateRange: true } as never,
      }),
    );

    act(() => {
      result.current.handleDateClick(new Date("2024-02-01"));
    });

    expect(resetEditing).toHaveBeenCalled();
    expect(setTempDate).toHaveBeenCalledWith(null);
    expect(rangeClick).toHaveBeenCalled();
  });
});
