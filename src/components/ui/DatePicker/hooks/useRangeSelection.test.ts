import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("formik", () => ({
  useFormikContext: vi.fn(),
}));

vi.mock("react-dom", () => ({
  flushSync: (fn: () => void) => fn(),
}));

vi.mock("./DatePicker.utils", () => ({
  formatDateForBackend: vi.fn((d: Date) => d.toISOString()),
}));

import { useFormikContext } from "formik";
import { useRangeSelection } from "./useRangeSelection";

describe("useRangeSelection", () => {
  const setFieldValue = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFormikContext).mockReturnValue({
      setFieldValue,
      values: { date: "2024-01-01T00:00:00.000Z,2024-01-02T00:00:00.000Z" },
    } as never);
  });

  it("starts range on first valid click", () => {
    const { result } = renderHook(() =>
      useRangeSelection({ name: "date", isDateValid: () => true }),
    );

    act(() => {
      result.current.handleDateClick(new Date("2024-01-10"));
    });

    expect(result.current.tempRangeStart).toBe("2024-01-10");
    expect(setFieldValue).toHaveBeenCalled();
  });

  it("completes range on second click", () => {
    const { result } = renderHook(() =>
      useRangeSelection({ name: "date", isDateValid: () => true }),
    );

    act(() => {
      result.current.handleDateClick(new Date("2024-01-10"));
    });

    act(() => {
      result.current.handleDateClick(new Date("2024-01-12"));
    });

    expect(setFieldValue).toHaveBeenCalled();
  });

  it("ignores invalid date click", () => {
    const { result } = renderHook(() =>
      useRangeSelection({ name: "date", isDateValid: () => false }),
    );

    act(() => {
      result.current.handleDateClick(new Date("2024-01-10"));
    });

    expect(result.current.tempRangeStart).toBeNull();
  });

  it("confirm writes final value and resets temp state", () => {
    const closeFn = vi.fn();
    const { result } = renderHook(() =>
      useRangeSelection({ name: "date", isDateValid: () => true }),
    );

    act(() => {
      result.current.handleDateClick(new Date("2024-01-10"));
    });

    act(() => {
      result.current.handleDateClick(new Date("2024-01-12"));
    });

    act(() => {
      result.current.handleConfirm(closeFn);
    });

    expect(setFieldValue).toHaveBeenCalled();
    expect(result.current.tempRangeStart).toBeNull();
    expect(result.current.tempRangeEnd).toBeNull();
    expect(closeFn).toHaveBeenCalled();
  });

  it("cancel restores original value", () => {
    const closeFn = vi.fn();
    const { result } = renderHook(() =>
      useRangeSelection({ name: "date", isDateValid: () => true }),
    );

    act(() => {
      result.current.saveOriginalValue();
    });

    act(() => {
      result.current.setTempRangeStart("2024-01-10");
    });

    act(() => {
      result.current.handleCancel(closeFn);
    });

    expect(setFieldValue).toHaveBeenCalled();
    expect(closeFn).toHaveBeenCalled();
  });

  it("range helper flags work", () => {
    const { result } = renderHook(() =>
      useRangeSelection({ name: "date", isDateValid: () => true }),
    );

    act(() => {
      result.current.setTempRangeStart("2024-01-10");
      result.current.setTempRangeEnd("2024-01-12");
    });

    expect(result.current.isInRange(new Date("2024-01-11"))).toBe(true);
    expect(result.current.isRangeStart(new Date("2024-01-10"))).toBe(true);
    expect(result.current.isRangeEnd(new Date("2024-01-12"))).toBe(true);
  });
});
