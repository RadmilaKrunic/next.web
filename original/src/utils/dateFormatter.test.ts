import { describe, it, expect } from "vitest";
import { formatDateToDisplay, formatTime } from "./dateFormatter";

describe("formatDateToDisplay", () => {
  it("formats ISO date string to dd.MM.yyyy", () => {
    expect(formatDateToDisplay("2024-03-15")).toBe("15.03.2024");
  });

  it("formats ISO datetime string to dd.MM.yyyy", () => {
    expect(formatDateToDisplay("2024-12-01T10:30:00.000Z")).toBe("01.12.2024");
  });

  it("formats dd-MM-yyyy string (fallback path) to dd.MM.yyyy", () => {
    // "31-01-2023" is invalid as ISO so triggers the fallback dd-MM-yyyy parse
    // day=31, month=01, year=2023 → 31.01.2023
    expect(formatDateToDisplay("31-01-2023")).toBe("31.01.2023");
  });

  it("returns empty string for empty input", () => {
    expect(formatDateToDisplay("")).toBe("");
  });

  it("returns empty string for invalid date string", () => {
    expect(formatDateToDisplay("not-a-date")).toBe("");
  });

  it("formats year boundary date correctly", () => {
    expect(formatDateToDisplay("2000-01-01")).toBe("01.01.2000");
  });
});

describe("formatTime", () => {
  it("formats ISO datetime string to HH:mm", () => {
    expect(formatTime("2024-03-15T14:30:00.000Z")).toMatch(/^\d{2}:\d{2}$/);
  });

  it("returns empty string for empty input", () => {
    expect(formatTime("")).toBe("");
  });

  it("returns empty string for invalid date string", () => {
    expect(formatTime("not-a-date")).toBe("");
  });

  it("formats time correctly for midnight UTC", () => {
    // Just verify format shape — exact value depends on local timezone
    const result = formatTime("2024-01-01T00:00:00.000Z");
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });
});
