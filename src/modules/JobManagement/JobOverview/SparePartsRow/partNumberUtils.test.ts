import { describe, it, expect } from "vitest";
import {
  normalizePartNumber,
  isSamePartNumber,
  resolvePartNumberChangeAction,
} from "./partNumberUtils";

describe("normalizePartNumber", () => {
  it("strips spaces", () => {
    expect(normalizePartNumber("160 9888887")).toBe("1609888887");
  });

  it("strips dots", () => {
    expect(normalizePartNumber("160.9888887")).toBe("1609888887");
  });

  it("strips hyphens, slashes, and other punctuation", () => {
    expect(normalizePartNumber("160-9888887")).toBe("1609888887");
    expect(normalizePartNumber("160/9888887")).toBe("1609888887");
    expect(normalizePartNumber("160_9888887")).toBe("1609888887");
    expect(normalizePartNumber("(160)9888887")).toBe("1609888887");
  });

  it("strips any mix of non-alphanumeric characters, in any position", () => {
    expect(normalizePartNumber("1.609-888 887")).toBe("1609888887");
    expect(normalizePartNumber(" 1609888887 ")).toBe("1609888887");
    expect(normalizePartNumber("16-09.8888/87")).toBe("1609888887");
  });

  it("leaves an already-clean part number unchanged", () => {
    expect(normalizePartNumber("1609888887")).toBe("1609888887");
  });

  it("returns empty string for null/undefined/empty", () => {
    expect(normalizePartNumber(null)).toBe("");
    expect(normalizePartNumber(undefined)).toBe("");
    expect(normalizePartNumber("")).toBe("");
  });

  it("is case-sensitive (does not alter letter casing)", () => {
    expect(normalizePartNumber("AB-12 34")).toBe("AB1234");
  });
});

describe("isSamePartNumber", () => {
  it("treats formatting-only differences as the same part number", () => {
    expect(isSamePartNumber("160 9888887", "1609888887")).toBe(true);
    expect(isSamePartNumber("160.9888887", "1609888887")).toBe(true);
    expect(isSamePartNumber("1.609 888887", "1609888887")).toBe(true);
    expect(isSamePartNumber("160-9888887", "1609888887")).toBe(true);
    expect(isSamePartNumber("160/9888887", "1609888887")).toBe(true);
  });

  it("treats a genuinely different alphanumeric value as different", () => {
    expect(isSamePartNumber("1609888887", "1609888888")).toBe(false);
  });

  it("treats null/undefined/empty as equal to each other but not to a real value", () => {
    expect(isSamePartNumber(null, undefined)).toBe(true);
    expect(isSamePartNumber("", null)).toBe(true);
    expect(isSamePartNumber("", "1609888887")).toBe(false);
  });
});

describe("resolvePartNumberChangeAction", () => {
  it("returns 'sync' on first render (prevPartNumber is null)", () => {
    expect(resolvePartNumberChangeAction(null, "1609888887", false)).toBe("sync");
    // isResyncing doesn't matter when prevPartNumber is null — mount always syncs.
    expect(resolvePartNumberChangeAction(null, "1609888887", true)).toBe("sync");
  });

  it("returns 'none' when the normalized value is unchanged (formatting-only edit)", () => {
    expect(resolvePartNumberChangeAction("1609888887", "160.988.8887", false)).toBe("none");
    expect(resolvePartNumberChangeAction("1609888887", "160 9888887", false)).toBe("none");
  });

  it("returns 'sync' for a genuine change while resyncing — protects initial-load API data from being nulled", () => {
    expect(resolvePartNumberChangeAction("1609888887", "9999999999", true)).toBe("sync");
  });

  it("returns 'reset' for a genuine, user-driven change", () => {
    expect(resolvePartNumberChangeAction("1609888887", "9999999999", false)).toBe("reset");
  });

  it("'none' takes priority over 'sync' when both the value is unchanged and resyncing is true", () => {
    // A formatting-only edit should never reset, even mid-resync.
    expect(resolvePartNumberChangeAction("1609888887", "160.988.8887", true)).toBe("none");
  });
});
