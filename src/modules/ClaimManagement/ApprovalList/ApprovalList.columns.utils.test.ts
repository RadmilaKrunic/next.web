import { describe, it, expect, vi } from "vitest";
import {
  getVisibleColumns,
  getSelectedCustomColumnsCount,
  isColumnDisabled,
  getDefaultFixedColumns,
  DEFAULT_COLUMN_CONFIGURATION,
  MAX_CUSTOM_COLUMNS,
} from "./ApprovalList.columns.utils";
import type { ApprovalColumnConfiguration } from "./ApprovalList.columns.utils";

vi.mock("api/services/approvals/action", () => ({
  saveApprovalListColumns: vi.fn().mockResolvedValue(undefined),
}));

const makeConfig = (
  overrides: Partial<ApprovalColumnConfiguration>[],
): ApprovalColumnConfiguration[] =>
  overrides.map((o) => ({
    key: "jobId",
    isFixed: false,
    isChecked: false,
    order: 0,
    ...o,
  })) as ApprovalColumnConfiguration[];

describe("getVisibleColumns", () => {
  it("returns only checked columns in display order", () => {
    const config = makeConfig([
      { key: "jobId", isFixed: true, isChecked: true, order: 0 },
      { key: "ascName", isFixed: true, isChecked: true, order: 1 },
      { key: "customer", isFixed: false, isChecked: true, order: 2 },
      { key: "assignee", isFixed: false, isChecked: false, order: 3 },
    ]);
    const result = getVisibleColumns(config);
    expect(result).toContain("jobId");
    expect(result).toContain("ascName");
    expect(result).not.toContain("customer");
    expect(result).not.toContain("assignee");
  });

  it("returns empty array when no columns checked", () => {
    const config = makeConfig([{ key: "jobId", isChecked: false }]);
    expect(getVisibleColumns(config)).toHaveLength(0);
  });
});

describe("getSelectedCustomColumnsCount", () => {
  it("counts checked non-fixed columns", () => {
    const config = makeConfig([
      { key: "jobId", isFixed: true, isChecked: true },
      { key: "customer", isFixed: false, isChecked: true },
      { key: "assignee", isFixed: false, isChecked: false },
    ]);
    expect(getSelectedCustomColumnsCount(config)).toBe(1);
  });
});

describe("isColumnDisabled", () => {
  it("returns true for fixed columns", () => {
    const config = makeConfig([{ key: "jobId", isFixed: true, isChecked: true }]);
    expect(isColumnDisabled("jobId" as any, config)).toBe(true);
  });

  it("returns false for unchecked column below max", () => {
    const config = makeConfig([
      { key: "customer", isFixed: false, isChecked: false },
      { key: "assignee", isFixed: false, isChecked: true },
    ]);
    expect(isColumnDisabled("customer" as any, config)).toBe(false);
  });

  it("returns true for unchecked column at MAX_CUSTOM_COLUMNS", () => {
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
  it("has same length as DEFAULT_COLUMN_CONFIGURATION", () => {
    expect(getDefaultFixedColumns()).toHaveLength(DEFAULT_COLUMN_CONFIGURATION.length);
  });

  it("sets isChecked to isFixed for each column", () => {
    getDefaultFixedColumns().forEach((col) => {
      expect(col.isChecked).toBe(col.isFixed);
    });
  });
});
