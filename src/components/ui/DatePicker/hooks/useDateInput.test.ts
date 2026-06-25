import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("formik", () => ({
  useFormikContext: vi.fn(),
}));

vi.mock("react-dom", () => ({
  flushSync: (fn: () => void) => fn(),
}));

vi.mock("./DatePicker.utils", () => ({
  formatDateForBackend: vi.fn(() => "2024-01-10T00:00:00.000Z"),
}));

import { useFormikContext } from "formik";
import { useDateInput } from "./useDateInput";

function makeFocusEvent(value: string) {
  return {
    target: { value, name: "date" },
  } as React.FocusEvent<HTMLInputElement>;
}

function makeChangeEvent(value: string) {
  return {
    target: { value, name: "date" },
  } as React.ChangeEvent<HTMLInputElement>;
}

describe("useDateInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ignores change when useDateInput is false", () => {
    const setFieldValue = vi.fn();
    vi.mocked(useFormikContext).mockReturnValue({
      setFieldValue,
      handleBlur: vi.fn(),
    } as never);

    const { result } = renderHook(() =>
      useDateInput({
        name: "date",
        calendar: { useDateInput: false } as never,
        isDateValid: () => true,
        setCurrentMonth: vi.fn(),
      }),
    );

    act(() => {
      result.current.handleInputChange(makeChangeEvent("10.01.2024"));
    });

    expect(setFieldValue).not.toHaveBeenCalled();
  });

  it("filters invalid characters during input", () => {
    vi.mocked(useFormikContext).mockReturnValue({
      setFieldValue: vi.fn(),
      handleBlur: vi.fn(),
    } as never);

    const { result } = renderHook(() =>
      useDateInput({
        name: "date",
        calendar: { useDateInput: true } as never,
        isDateValid: () => true,
        setCurrentMonth: vi.fn(),
      }),
    );

    act(() => {
      result.current.handleInputChange(makeChangeEvent("10.01.2024abc!"));
    });

    expect(result.current.inputValue).toBe("10.01.2024");
  });

  it("clears form field when input becomes empty", () => {
    const setFieldValue = vi.fn();
    const setTempDate = vi.fn();
    vi.mocked(useFormikContext).mockReturnValue({
      setFieldValue,
      handleBlur: vi.fn(),
    } as never);

    const { result } = renderHook(() =>
      useDateInput({
        name: "date",
        calendar: { useDateInput: true } as never,
        isDateValid: () => true,
        setCurrentMonth: vi.fn(),
        setTempDate,
      }),
    );

    act(() => {
      result.current.handleInputChange(makeChangeEvent(""));
    });

    expect(setFieldValue).toHaveBeenCalledWith("date", null);
    expect(setTempDate).toHaveBeenCalledWith(null);
  });

  it("parses and writes valid single date on complete input", () => {
    const setFieldValue = vi.fn();
    const setCurrentMonth = vi.fn();
    const setTempDate = vi.fn();

    vi.mocked(useFormikContext).mockReturnValue({
      setFieldValue,
      handleBlur: vi.fn(),
    } as never);

    const { result } = renderHook(() =>
      useDateInput({
        name: "date",
        calendar: {
          useDateInput: true,
          dateFormat: "dd.MM.yyyy",
          startOfTheDay: true,
          endOfTheDay: false,
        } as never,
        isDateValid: () => true,
        setCurrentMonth,
        setTempDate,
      }),
    );

    act(() => {
      result.current.handleInputChange(makeChangeEvent("10.01.2024"));
    });

    expect(setTempDate).toHaveBeenCalled();
    expect(setFieldValue).toHaveBeenCalled();
    expect(setCurrentMonth).toHaveBeenCalled();
  });

  it("focus updates editing state and input value", () => {
    vi.mocked(useFormikContext).mockReturnValue({
      setFieldValue: vi.fn(),
      handleBlur: vi.fn(),
    } as never);

    const { result } = renderHook(() =>
      useDateInput({
        name: "date",
        calendar: { useDateInput: true } as never,
        isDateValid: () => true,
        setCurrentMonth: vi.fn(),
      }),
    );

    act(() => {
      result.current.handleInputFocus(makeFocusEvent("05.01.2024"));
    });

    expect(result.current.isEditing).toBe(true);
    expect(result.current.inputValue).toBe("05.01.2024");
  });

  it("blur with invalid partial date clears field", () => {
    const setFieldValue = vi.fn();
    vi.mocked(useFormikContext).mockReturnValue({
      setFieldValue,
      handleBlur: vi.fn(),
    } as never);

    const { result } = renderHook(() =>
      useDateInput({
        name: "date",
        calendar: { useDateInput: true, dateFormat: "dd.MM.yyyy" } as never,
        isDateValid: () => true,
        setCurrentMonth: vi.fn(),
      }),
    );

    act(() => {
      result.current.handleInputBlur(makeFocusEvent("10.01"));
    });

    expect(setFieldValue).toHaveBeenCalledWith("date", null);
  });

  it("blur with valid single date writes backend value", () => {
    const setFieldValue = vi.fn();
    vi.mocked(useFormikContext).mockReturnValue({
      setFieldValue,
      handleBlur: vi.fn(),
    } as never);

    const { result } = renderHook(() =>
      useDateInput({
        name: "date",
        calendar: { useDateInput: true, dateFormat: "dd.MM.yyyy" } as never,
        isDateValid: () => true,
        setCurrentMonth: vi.fn(),
      }),
    );

    act(() => {
      result.current.handleInputBlur(makeFocusEvent("10.01.2024"));
    });

    expect(setFieldValue).toHaveBeenCalled();
  });

  it("range input with invalid end clears temp end", () => {
    const setTempRangeStart = vi.fn();
    const setTempRangeEnd = vi.fn();
    vi.mocked(useFormikContext).mockReturnValue({
      setFieldValue: vi.fn(),
      handleBlur: vi.fn(),
    } as never);

    const { result } = renderHook(() =>
      useDateInput({
        name: "date",
        calendar: { useDateInput: true, allowDateRange: true, dateFormat: "dd.MM.yyyy" } as never,
        isDateValid: () => true,
        setCurrentMonth: vi.fn(),
        setTempRangeStart,
        setTempRangeEnd,
      }),
    );

    act(() => {
      result.current.handleInputChange(makeChangeEvent("10.01.2024 - 01.01"));
    });

    expect(setTempRangeStart).toHaveBeenCalled();
    expect(setTempRangeEnd).toHaveBeenCalledWith(null);
  });

  it("blur with valid date range writes combined value", () => {
    const setFieldValue = vi.fn();
    vi.mocked(useFormikContext).mockReturnValue({
      setFieldValue,
      handleBlur: vi.fn(),
    } as never);

    const { result } = renderHook(() =>
      useDateInput({
        name: "date",
        calendar: { useDateInput: true, allowDateRange: true, dateFormat: "dd.MM.yyyy" } as never,
        isDateValid: () => true,
        setCurrentMonth: vi.fn(),
        setTempRangeStart: vi.fn(),
        setTempRangeEnd: vi.fn(),
      }),
    );

    act(() => {
      result.current.handleInputBlur(makeFocusEvent("01.01.2024 - 10.01.2024"));
    });

    expect(setFieldValue).toHaveBeenCalled();
  });

  it("applyInputValue no-ops when not editing", () => {
    vi.mocked(useFormikContext).mockReturnValue({
      setFieldValue: vi.fn(),
      handleBlur: vi.fn(),
    } as never);

    const { result } = renderHook(() =>
      useDateInput({
        name: "date",
        calendar: { useDateInput: true } as never,
        isDateValid: () => true,
        setCurrentMonth: vi.fn(),
      }),
    );

    act(() => {
      result.current.applyInputValue();
    });

    expect(result.current.inputValue).toBe("");
  });

  it("resetEditing resets state", () => {
    vi.mocked(useFormikContext).mockReturnValue({
      setFieldValue: vi.fn(),
      handleBlur: vi.fn(),
    } as never);

    const { result } = renderHook(() =>
      useDateInput({
        name: "date",
        calendar: { useDateInput: true } as never,
        isDateValid: () => true,
        setCurrentMonth: vi.fn(),
      }),
    );

    act(() => {
      result.current.handleInputFocus(makeFocusEvent("10.01.2024"));
      result.current.resetEditing();
    });

    expect(result.current.isEditing).toBe(false);
    expect(result.current.inputValue).toBe("");
  });
});
