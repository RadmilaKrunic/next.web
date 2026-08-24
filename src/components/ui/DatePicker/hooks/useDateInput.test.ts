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
import { formatDateForBackend } from "./DatePicker.utils";

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

  it("does not parse incomplete single-date input on change", () => {
    const setFieldValue = vi.fn();
    const setCurrentMonth = vi.fn();

    vi.mocked(useFormikContext).mockReturnValue({
      setFieldValue,
      handleBlur: vi.fn(),
    } as never);

    const { result } = renderHook(() =>
      useDateInput({
        name: "date",
        calendar: { useDateInput: true, dateFormat: "dd.MM.yyyy" } as never,
        isDateValid: () => true,
        setCurrentMonth,
      }),
    );

    act(() => {
      result.current.handleInputChange(makeChangeEvent("10.01"));
    });

    expect(setCurrentMonth).not.toHaveBeenCalled();
    expect(setFieldValue).not.toHaveBeenCalledWith("date", expect.anything());
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

  it("clears range temp fields when input becomes empty", () => {
    const setFieldValue = vi.fn();
    const setTempRangeStart = vi.fn();
    const setTempRangeEnd = vi.fn();

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
        setTempRangeStart,
        setTempRangeEnd,
      }),
    );

    act(() => {
      result.current.handleInputChange(makeChangeEvent(""));
    });

    expect(setFieldValue).toHaveBeenCalledWith("date", null);
    expect(setTempRangeStart).toHaveBeenCalledWith(null);
    expect(setTempRangeEnd).toHaveBeenCalledWith(null);
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
    const setFieldValue = vi.fn();
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
      }),
    );

    act(() => {
      result.current.handleInputFocus(makeFocusEvent("05.01.2024"));
    });

    expect(result.current.isEditing).toBe(true);
    expect(result.current.inputValue).toBe("05.01.2024");
    expect(setFieldValue).not.toHaveBeenCalled();
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
    expect(formatDateForBackend).toHaveBeenCalled();

    const parsedArg = vi.mocked(formatDateForBackend).mock.calls.at(-1)?.[0];
    expect(parsedArg).toBeInstanceOf(Date);
    expect((parsedArg as Date).getUTCFullYear()).toBe(2024);
    expect((parsedArg as Date).getUTCMonth()).toBe(0);
    expect((parsedArg as Date).getUTCDate()).toBe(10);
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

  it("range input with valid end writes combined value on change", () => {
    const setFieldValue = vi.fn();
    const setTempRangeStart = vi.fn();
    const setTempRangeEnd = vi.fn();
    const setCurrentMonth = vi.fn();

    vi.mocked(useFormikContext).mockReturnValue({
      setFieldValue,
      handleBlur: vi.fn(),
    } as never);

    const { result } = renderHook(() =>
      useDateInput({
        name: "date",
        calendar: { useDateInput: true, allowDateRange: true, dateFormat: "dd.MM.yyyy" } as never,
        isDateValid: () => true,
        setCurrentMonth,
        setTempRangeStart,
        setTempRangeEnd,
      }),
    );

    act(() => {
      result.current.handleInputChange(makeChangeEvent("01.01.2024 - 10.01.2024"));
    });

    expect(setTempRangeStart).toHaveBeenCalledWith(expect.any(String));
    expect(setTempRangeEnd).toHaveBeenCalledWith(expect.any(String));
    expect(setFieldValue).toHaveBeenCalled();
    expect(setCurrentMonth).toHaveBeenCalled();
  });

  it("range input clears tempDate when range separator is present", () => {
    const setTempDate = vi.fn();
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
        setTempDate,
        setTempRangeStart: vi.fn(),
        setTempRangeEnd: vi.fn(),
      }),
    );

    act(() => {
      result.current.handleInputChange(makeChangeEvent("01.01.2024 - 10.01.2024"));
    });

    expect(setTempDate).toHaveBeenCalledWith(null);
  });

  it("range input with end before start clears temp end", () => {
    const setFieldValue = vi.fn();
    const setTempRangeEnd = vi.fn();
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
        setTempRangeEnd,
      }),
    );

    act(() => {
      result.current.handleInputChange(makeChangeEvent("10.01.2024 - 01.01.2024"));
    });

    expect(setTempRangeEnd).toHaveBeenCalledWith(null);
    expect(setFieldValue).not.toHaveBeenCalledWith("date", expect.stringContaining(","));
  });

  it("range input with incomplete start clears temp range", () => {
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
      result.current.handleInputChange(makeChangeEvent("01.01 - 10.01.2024"));
    });

    expect(setTempRangeStart).toHaveBeenCalledWith(null);
    expect(setTempRangeEnd).toHaveBeenCalledWith(null);
  });

  it("range mode without separator clears temp range candidates", () => {
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
      result.current.handleInputChange(makeChangeEvent("10.01.2024"));
    });

    expect(setTempRangeStart).toHaveBeenCalledWith(null);
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
    expect(formatDateForBackend).toHaveBeenCalled();

    const startCall = vi.mocked(formatDateForBackend).mock.calls.at(-2)?.[0];
    const endCall = vi.mocked(formatDateForBackend).mock.calls.at(-1)?.[0];
    expect(startCall).toBeInstanceOf(Date);
    expect(endCall).toBeInstanceOf(Date);
    expect((startCall as Date).getUTCDate()).toBe(1);
    expect((endCall as Date).getUTCDate()).toBe(10);
  });

  it("blur with complete but invalid single date clears field", () => {
    const setFieldValue = vi.fn();
    const setTempDate = vi.fn();
    vi.mocked(useFormikContext).mockReturnValue({
      setFieldValue,
      handleBlur: vi.fn(),
    } as never);

    const { result } = renderHook(() =>
      useDateInput({
        name: "date",
        calendar: { useDateInput: true, dateFormat: "dd.MM.yyyy" } as never,
        isDateValid: () => false,
        setCurrentMonth: vi.fn(),
        setTempDate,
      }),
    );

    act(() => {
      result.current.handleInputBlur(makeFocusEvent("10.01.2024"));
    });

    expect(setFieldValue).toHaveBeenCalledWith("date", null);
    expect(setTempDate).toHaveBeenCalledWith(null);
  });

  it("blur in range mode without separator clears field", () => {
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
      }),
    );

    act(() => {
      result.current.handleInputBlur(makeFocusEvent("10.01.2024"));
    });

    expect(setFieldValue).toHaveBeenCalledWith("date", null);
  });

  it("blur delegates to formik blur when useDateInput is false", () => {
    const handleBlur = vi.fn();
    const setFieldValue = vi.fn();

    vi.mocked(useFormikContext).mockReturnValue({
      setFieldValue,
      handleBlur,
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
      result.current.handleInputBlur(makeFocusEvent("10.01.2024"));
    });

    expect(handleBlur).toHaveBeenCalled();
    expect(setFieldValue).not.toHaveBeenCalled();
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

  it("applyInputValue commits valid single date while editing", () => {
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
      result.current.handleInputFocus(makeFocusEvent("10.01.2024"));
    });

    act(() => {
      result.current.applyInputValue();
    });

    expect(setFieldValue).toHaveBeenCalled();
  });

  it("applyInputValue clears range field when separator is missing", () => {
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
      }),
    );

    act(() => {
      result.current.handleInputFocus(makeFocusEvent("10.01.2024"));
    });

    act(() => {
      result.current.applyInputValue();
    });

    expect(setFieldValue).toHaveBeenCalledWith("date", null);
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
