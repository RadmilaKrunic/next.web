import { describe, it, expect, vi } from "vitest";
import {
  getVisibleColumns,
  getSelectedCustomColumnsCount,
  isColumnDisabled,
  getDefaultFixedColumns,
  DEFAULT_COLUMN_CONFIGURATION,
  MAX_CUSTOM_COLUMNS,
} from "./JobList.columns.utils";
import type { JobColumnConfiguration } from "./JobList.columns.utils";

// Mock the API save function to avoid network calls
vi.mock("api/services/jobs/action", () => ({
  saveJobListColumns: vi.fn().mockResolvedValue(undefined),
}));

const makeConfig = (overrides: Partial<JobColumnConfiguration>[]): JobColumnConfiguration[] =>
  overrides.map((o) => ({
    key: "jobId",
    isFixed: false,
    isChecked: false,
    order: 0,
    ...o,
  })) as JobColumnConfiguration[];

describe("getVisibleColumns", () => {
  it("returns only checked columns in display order", () => {
    const config = makeConfig([
      { key: "jobId", isFixed: true, isChecked: true, order: 0 },
      { key: "customer", isFixed: false, isChecked: true, order: 1 },
      { key: "assignee", isFixed: false, isChecked: false, order: 2 },
    ]);
    const result = getVisibleColumns(config);
    expect(result).toContain("jobId");
    expect(result).toContain("customer");
    expect(result).not.toContain("assignee");
  });

  it("returns empty array when no columns are checked", () => {
    const config = makeConfig([{ key: "jobId", isFixed: true, isChecked: false, order: 0 }]);
    expect(getVisibleColumns(config)).toHaveLength(0);
  });
});

describe("getSelectedCustomColumnsCount", () => {
  it("counts checked non-fixed columns", () => {
    const config = makeConfig([
      { key: "jobId", isFixed: true, isChecked: true, order: 0 },
      { key: "customer", isFixed: false, isChecked: true, order: 1 },
      { key: "assignee", isFixed: false, isChecked: true, order: 2 },
      { key: "serialNumber", isFixed: false, isChecked: false, order: 3 },
    ]);
    expect(getSelectedCustomColumnsCount(config)).toBe(2);
  });

  it("returns 0 when no custom columns are checked", () => {
    const config = makeConfig([{ key: "jobId", isFixed: true, isChecked: true, order: 0 }]);
    expect(getSelectedCustomColumnsCount(config)).toBe(0);
  });
});

describe("isColumnDisabled", () => {
  it("returns false for unknown column key", () => {
    const config = makeConfig([{ key: "jobId", isFixed: false, isChecked: false, order: 0 }]);
    expect(isColumnDisabled("customer" as any, config)).toBe(false);
  });

  it("returns true for fixed columns", () => {
    const config = makeConfig([{ key: "jobId", isFixed: true, isChecked: true, order: 0 }]);
    expect(isColumnDisabled("jobId" as any, config)).toBe(true);
  });

  it("returns false for checked non-fixed columns", () => {
    const config = makeConfig([{ key: "customer", isFixed: false, isChecked: true, order: 0 }]);
    expect(isColumnDisabled("customer" as any, config)).toBe(false);
  });

  it("returns false for unchecked column when custom count is below MAX", () => {
    const config = makeConfig([
      { key: "customer", isFixed: false, isChecked: false, order: 0 },
      { key: "assignee", isFixed: false, isChecked: true, order: 1 },
    ]);
    expect(isColumnDisabled("customer" as any, config)).toBe(false);
  });

  it("returns true for unchecked column when MAX_CUSTOM_COLUMNS is reached", () => {
    const custom = Array.from({ length: MAX_CUSTOM_COLUMNS }, (_, i) => ({
      key: `col${i}` as any,
      isFixed: false,
      isChecked: true,
      order: i,
    }));
    const config = makeConfig([
      ...custom,
      { key: "customer", isFixed: false, isChecked: false, order: MAX_CUSTOM_COLUMNS },
    ]);
    expect(isColumnDisabled("customer" as any, config)).toBe(true);
  });
});

describe("getDefaultFixedColumns", () => {
  it("returns same length as DEFAULT_COLUMN_CONFIGURATION", () => {
    const result = getDefaultFixedColumns();
    expect(result).toHaveLength(DEFAULT_COLUMN_CONFIGURATION.length);
  });

  it("sets isChecked=true only for fixed columns", () => {
    const result = getDefaultFixedColumns();
    result.forEach((col) => {
      expect(col.isChecked).toBe(col.isFixed);
    });
  });
});
