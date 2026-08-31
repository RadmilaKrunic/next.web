import { describe, it, expect } from "vitest";
import { formatLocalDayOfWeek, formatLocalTimeHour } from "./time";

describe("formatLocalTimeHour", () => {
  it("formats the hour as a 2-digit 12-hour value with AM/PM", () => {
    expect(formatLocalTimeHour(new Date(2026, 0, 5, 0, 0))).toBe("12AM");
    expect(formatLocalTimeHour(new Date(2026, 0, 5, 9, 30))).toBe("09AM");
    expect(formatLocalTimeHour(new Date(2026, 0, 5, 11, 59))).toBe("11AM");
    expect(formatLocalTimeHour(new Date(2026, 0, 5, 12, 0))).toBe("12PM");
    expect(formatLocalTimeHour(new Date(2026, 0, 5, 13, 15))).toBe("01PM");
    expect(formatLocalTimeHour(new Date(2026, 0, 5, 23, 45))).toBe("11PM");
  });
});

describe("formatLocalDayOfWeek", () => {
  it("formats the weekday as an English long name", () => {
    expect(formatLocalDayOfWeek(new Date(2026, 0, 5))).toBe("Monday");
    expect(formatLocalDayOfWeek(new Date(2026, 0, 6))).toBe("Tuesday");
    expect(formatLocalDayOfWeek(new Date(2026, 0, 11))).toBe("Sunday");
  });
});
