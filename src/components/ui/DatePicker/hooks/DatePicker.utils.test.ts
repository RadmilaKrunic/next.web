import { describe, it, expect } from "vitest";
import { enUS } from "date-fns/locale/en-US";
import {
  getLocale,
  parseDate,
  formatDateForBackend,
  formatFormikDateValue,
} from "./DatePicker.utils";

describe("getLocale", () => {
  it("returns enUS by default when no locale given", () => {
    expect(getLocale()).toBe(enUS);
  });

  it("returns enUS for undefined", () => {
    expect(getLocale(undefined)).toBe(enUS);
  });

  it("returns mapped locale for string code", () => {
    const locale = getLocale("de-DE");
    expect(locale).toBeDefined();
    expect(locale).not.toBe(enUS);
  });

  it("returns enUS for unknown string code", () => {
    expect(getLocale("xx-XX")).toBe(enUS);
  });

  it("returns Locale object if Locale passed directly", () => {
    expect(getLocale(enUS)).toBe(enUS);
  });
});

describe("parseDate", () => {
  it("returns undefined for empty string", () => {
    expect(parseDate("")).toBeUndefined();
  });

  it("returns undefined for undefined input", () => {
    expect(parseDate(undefined)).toBeUndefined();
  });

  it("returns undefined for invalid date string", () => {
    expect(parseDate("not-a-date")).toBeUndefined();
  });

  it("returns UTC Date for valid ISO string", () => {
    const result = parseDate("2024-03-15T12:00:00.000Z");
    expect(result).toBeInstanceOf(Date);
    expect(result!.getUTCFullYear()).toBe(2024);
    expect(result!.getUTCMonth()).toBe(2); // March = 2
    expect(result!.getUTCDate()).toBe(15);
  });
});

describe("formatDateForBackend", () => {
  it("returns null for undefined", () => {
    expect(formatDateForBackend(undefined)).toBeNull();
  });

  it("returns null for invalid date string", () => {
    expect(formatDateForBackend("not-a-date")).toBeNull();
  });

  it("returns ISO string for valid date", () => {
    const result = formatDateForBackend("2024-06-01");
    expect(result).toMatch(/2024-06-01/);
  });

  it("sets start of day (UTC midnight) with startOfTheDayFlag", () => {
    const result = formatDateForBackend("2024-06-01T12:00:00Z", true, false);
    expect(result).toBe("2024-06-01T00:00:00.000Z");
  });

  it("sets end of day (UTC 23:59:59.999) with endOfTheDayFlag", () => {
    const result = formatDateForBackend("2024-06-01T12:00:00Z", false, true);
    expect(result).toBe("2024-06-01T23:59:59.999Z");
  });

  it("accepts a Date object", () => {
    const date = new Date("2024-06-01T00:00:00.000Z");
    const result = formatDateForBackend(date, true);
    expect(result).toBe("2024-06-01T00:00:00.000Z");
  });
});

describe("formatFormikDateValue", () => {
  const fmt = "dd.MM.yyyy";
  const locale = enUS;

  it("returns empty string for null", () => {
    expect(formatFormikDateValue(null, fmt, locale)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatFormikDateValue(undefined, fmt, locale)).toBe("");
  });

  it("formats single ISO date string", () => {
    const result = formatFormikDateValue("2024-03-15T00:00:00.000Z", fmt, locale);
    expect(result).toBe("15.03.2024");
  });

  it("formats Date object", () => {
    const date = new Date("2024-03-15T00:00:00.000Z");
    const result = formatFormikDateValue(date, fmt, locale);
    expect(result).toBe("15.03.2024");
  });

  it("formats range string (start and end)", () => {
    const result = formatFormikDateValue(
      "2024-03-01T00:00:00.000Z,2024-03-15T00:00:00.000Z",
      fmt,
      locale,
    );
    expect(result).toBe("01.03.2024 - 15.03.2024");
  });

  it("formats range string with only start date", () => {
    const result = formatFormikDateValue("2024-03-01T00:00:00.000Z,invalid", fmt, locale);
    expect(result).toBe("01.03.2024 - ");
  });
});
