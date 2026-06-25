import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("formik", () => ({
  useFormikContext: vi.fn(),
}));

vi.mock("react-dom", () => ({
  flushSync: (fn: () => void) => fn(),
}));

vi.mock("./DatePicker.utils", () => ({
  formatDateForBackend: vi.fn((d: Date, start?: string, end?: string) => {
    const mode = start ? "start" : end ? "end" : "plain";
    return `${mode}:${d.toISOString()}`;
  }),
}));

import { useFormikContext } from "formik";
import { useSingleDateSelection } from "./useSingleDateSelection";

describe("useSingleDateSelection", () => {
  const setFieldValue = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFormikContext).mockReturnValue({
      setFieldValue,
      values: { date: "2024-01-03T00:00:00.000Z" },
    } as never);
  });

  it("ignores invalid day clicks", () => {
    const { result } = renderHook(() =>
      useSingleDateSelection({
        name: "date",
        calendar: undefined,
        isDateValid: () => false,
        selectedDate: null,
      }),
    );

    act(() => {
      result.current.handleDateClick(new Date("2024-01-10"));
    });

    expect(result.current.tempDate).toBeNull();
    expect(setFieldValue).not.toHaveBeenCalled();
  });

  it("sets temp date and Formik field on valid click", () => {
    const { result } = renderHook(() =>
      useSingleDateSelection({
        name: "date",
        calendar: undefined,
        isDateValid: () => true,
        selectedDate: null,
      }),
    );

    act(() => {
      result.current.handleDateClick(new Date("2024-01-10"));
    });

    expect(result.current.tempDate).toBe("2024-01-10");
    expect(setFieldValue).toHaveBeenCalledWith("date", expect.stringContaining("2024-01-10"));
  });

  it("updates date on month/year change", () => {
    const { result } = renderHook(() =>
      useSingleDateSelection({
        name: "date",
        calendar: { startOfTheDay: "00:00" } as never,
        isDateValid: () => true,
        selectedDate: null,
      }),
    );

    act(() => {
      result.current.updateDateOnMonthYearChange(new Date("2024-02-05"));
    });

    expect(result.current.tempDate).toBe("2024-02-05");
    expect(setFieldValue).toHaveBeenCalledWith("date", expect.stringContaining("2024-02-05"));
  });

  it("confirm persists temp date, clears temp, and closes", () => {
    const closeFn = vi.fn();
    const { result } = renderHook(() =>
      useSingleDateSelection({
        name: "date",
        calendar: undefined,
        isDateValid: () => true,
        selectedDate: null,
      }),
    );

    act(() => {
      result.current.handleDateClick(new Date("2024-01-15"));
    });

    act(() => {
      result.current.handleConfirm(closeFn);
    });

    expect(setFieldValue).toHaveBeenCalledWith("date", expect.stringContaining("2024-01-15"));
    expect(result.current.tempDate).toBeNull();
    expect(closeFn).toHaveBeenCalledTimes(1);
  });

  it("confirm without temp date only closes", () => {
    const closeFn = vi.fn();
    const { result } = renderHook(() =>
      useSingleDateSelection({
        name: "date",
        calendar: undefined,
        isDateValid: () => true,
        selectedDate: null,
      }),
    );

    act(() => {
      result.current.handleConfirm(closeFn);
    });

    expect(setFieldValue).not.toHaveBeenCalled();
    expect(closeFn).toHaveBeenCalledTimes(1);
  });

  it("cancel restores original value and closes", () => {
    const closeFn = vi.fn();
    const { result } = renderHook(() =>
      useSingleDateSelection({
        name: "date",
        calendar: undefined,
        isDateValid: () => true,
        selectedDate: null,
      }),
    );

    act(() => {
      result.current.saveOriginalValue();
    });

    act(() => {
      result.current.handleCancel(closeFn);
    });

    expect(setFieldValue).toHaveBeenCalledWith("date", "2024-01-03T00:00:00.000Z");
    expect(closeFn).toHaveBeenCalledTimes(1);
  });

  it("range helper functions are always false", () => {
    const { result } = renderHook(() =>
      useSingleDateSelection({
        name: "date",
        calendar: undefined,
        isDateValid: () => true,
        selectedDate: null,
      }),
    );

    expect(result.current.isRangeStart()).toBe(false);
    expect(result.current.isRangeEnd()).toBe(false);
  });
});
