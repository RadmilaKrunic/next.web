import { describe, it, expect } from "vitest";
import { hasFilterValue, matchesFilter } from "./List.utils";
import type { Filter } from "./List.types";

describe("hasFilterValue", () => {
  it("returns false for empty string value", () => {
    const filter: Filter = { name: "status", value: "" };
    expect(hasFilterValue(filter)).toBe(false);
  });

  it("returns false for null value", () => {
    const filter: Filter = { name: "status", value: null as unknown as string };
    expect(hasFilterValue(filter)).toBe(false);
  });

  it("returns true for non-empty string value", () => {
    const filter: Filter = { name: "status", value: "ACTIVE" };
    expect(hasFilterValue(filter)).toBe(true);
  });

  it("returns false for empty array value", () => {
    const filter: Filter = { name: "types", value: [] };
    expect(hasFilterValue(filter)).toBe(false);
  });

  it("returns true for non-empty array value", () => {
    const filter: Filter = { name: "types", value: ["DRAFT", "ACTIVE"] };
    expect(hasFilterValue(filter)).toBe(true);
  });
});

describe("matchesFilter", () => {
  it("returns true when actual equals filterValue string", () => {
    expect(matchesFilter("DRAFT", "DRAFT")).toBe(true);
  });

  it("returns false when actual does not equal filterValue string", () => {
    expect(matchesFilter("ACTIVE", "DRAFT")).toBe(false);
  });

  it("returns true when array filterValue includes actual", () => {
    expect(matchesFilter(["DRAFT", "ACTIVE"], "DRAFT")).toBe(true);
  });

  it("returns false when array filterValue does not include actual", () => {
    expect(matchesFilter(["ACTIVE", "DONE"], "DRAFT")).toBe(false);
  });

  it("handles null actual with empty string fallback in array check", () => {
    expect(matchesFilter([""], null)).toBe(true);
    expect(matchesFilter(["DRAFT"], null)).toBe(false);
  });

  it("handles undefined actual", () => {
    expect(matchesFilter("DRAFT", undefined)).toBe(false);
  });
});
