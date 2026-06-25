import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { enUS } from "date-fns/locale";

vi.mock("formik", () => ({
  useFormikContext: vi.fn(),
}));

vi.mock("./DatePicker.utils", () => ({
  formatFormikDateValue: vi.fn((value: string | null) => (value ? `formatted:${value}` : "")),
}));

import { useFormikContext } from "formik";
import { useCalendarComputedValues } from "./useCalendarComputedValues";

describe("useCalendarComputedValues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFormikContext).mockReturnValue({
      values: { serviceDate: "2024-05-10T00:00:00.000Z" },
    } as never);
  });

  it("uses temp date when calendar is open", () => {
    const { result } = renderHook(() =>
      useCalendarComputedValues({
        name: "serviceDate",
        locale: enUS,
        calendar: undefined,
        currentMonth: new Date("2024-05-01"),
        selectedDate: new Date("2024-05-03"),
        showCalendar: true,
        tempDate: "2024-05-20",
        inputValue: "",
        isEditing: false,
      }),
    );

    expect(result.current.displayDate?.toISOString()).toContain("2024-05-20");
  });

  it("uses selected date when temp date is absent", () => {
    const selected = new Date("2024-05-03");
    const { result } = renderHook(() =>
      useCalendarComputedValues({
        name: "serviceDate",
        locale: enUS,
        calendar: undefined,
        currentMonth: new Date("2024-05-01"),
        selectedDate: selected,
        showCalendar: false,
        tempDate: null,
        inputValue: "",
        isEditing: false,
      }),
    );

    expect(result.current.displayDate).toEqual(selected);
  });

  it("builds month options from provided bounds", () => {
    const { result } = renderHook(() =>
      useCalendarComputedValues({
        name: "serviceDate",
        locale: enUS,
        calendar: { startMonth: 2, endMonth: 4 } as never,
        currentMonth: new Date("2024-05-01"),
        selectedDate: null,
        showCalendar: false,
        tempDate: null,
        inputValue: "",
        isEditing: false,
      }),
    );

    expect(result.current.monthOptions).toHaveLength(3);
    expect(result.current.monthOptions.map((m) => m.value)).toEqual(["1", "2", "3"]);
  });

  it("builds default year options when bounds are absent", () => {
    const { result } = renderHook(() =>
      useCalendarComputedValues({
        name: "serviceDate",
        locale: enUS,
        calendar: undefined,
        currentMonth: new Date("2024-05-01"),
        selectedDate: null,
        showCalendar: false,
        tempDate: null,
        inputValue: "",
        isEditing: false,
      }),
    );

    expect(result.current.yearOptions).toHaveLength(201);
  });

  it("returns input value while editing", () => {
    const { result } = renderHook(() =>
      useCalendarComputedValues({
        name: "serviceDate",
        locale: enUS,
        calendar: { dateFormat: "dd.MM.yyyy" } as never,
        currentMonth: new Date("2024-05-01"),
        selectedDate: null,
        showCalendar: false,
        tempDate: null,
        inputValue: "10.05.2024",
        isEditing: true,
      }),
    );

    expect(result.current.displayValue).toBe("10.05.2024");
  });

  it("returns formatted formik value when not editing", () => {
    const { result } = renderHook(() =>
      useCalendarComputedValues({
        name: "serviceDate",
        locale: enUS,
        calendar: { dateFormat: "dd.MM.yyyy" } as never,
        currentMonth: new Date("2024-05-01"),
        selectedDate: null,
        showCalendar: false,
        tempDate: null,
        inputValue: "ignored",
        isEditing: false,
      }),
    );

    expect(result.current.displayValue).toBe("formatted:2024-05-10T00:00:00.000Z");
  });

  it("builds weekday labels and calendar day grid", () => {
    const { result } = renderHook(() =>
      useCalendarComputedValues({
        name: "serviceDate",
        locale: enUS,
        calendar: undefined,
        currentMonth: new Date("2024-05-01"),
        selectedDate: null,
        showCalendar: false,
        tempDate: null,
        inputValue: "",
        isEditing: false,
      }),
    );

    expect(result.current.weekDays).toHaveLength(7);
    expect(result.current.calendarDays.length).toBeGreaterThanOrEqual(35);
  });
});
