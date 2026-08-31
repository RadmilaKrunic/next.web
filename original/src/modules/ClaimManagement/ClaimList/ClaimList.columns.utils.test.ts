import { describe, expect, it, vi } from "vitest";
import React from "react";

vi.mock("./ClaimListTable/ClaimListColumns.config", () => ({
  getClaimColumns: vi.fn((t: (key: string) => string) => ({
    claimId: { key: "claimId", label: t("claimId"), getValue: () => "C001" },
    invoiceNumber: {
      key: "invoiceNumber",
      label: t("invoiceNumber"),
      getValue: () => "INV-001",
    },
    jobId: { key: "jobId", label: t("jobId"), getValue: () => "J-001" },
    internalReferenceNumber: {
      key: "internalReferenceNumber",
      label: t("internalReferenceNumber"),
      getValue: () => "IRN-001",
    },
    mobileNumber: {
      key: "mobileNumber",
      label: t("mobileNumber"),
      getValue: () => "+90555",
    },
    phoneNumber: {
      key: "phoneNumber",
      label: t("phoneNumber"),
      getValue: () => "+90444",
    },
    createdOn: {
      key: "createdOn",
      label: t("createdOn"),
      getValue: () => "2023-01-01",
    },
    ascName: {
      key: "ascName",
      label: t("ascName"),
      getValue: () => "ASC",
    },
    toolModelName: {
      key: "toolModelName",
      label: t("toolModelName"),
      getValue: () => "Drill",
    },
    baretoolNumber: {
      key: "baretoolNumber",
      label: t("baretoolNumber"),
      getValue: () => "BT1",
    },
    jobAction: {
      key: "jobAction",
      label: t("jobAction"),
      getValue: () => "REPAIR",
    },
    jobType: {
      key: "jobType",
      label: t("jobType"),
      getValue: () => "WARRANTY",
    },
    totalCost: {
      key: "totalCost",
      label: t("totalCost"),
      getValue: () => "100.00",
    },
    status: {
      key: "status",
      label: t("status"),
      getValue: () => React.createElement("span", null, "PENDING"),
    },
  })),
}));

vi.mock("api/services/claims/action", () => ({
  saveClaimListColumns: vi.fn().mockResolvedValue(undefined),
}));

import {
  DEFAULT_COLUMN_CONFIGURATION,
  MAX_VISIBLE_COLUMNS,
  MIN_VISIBLE_COLUMNS,
  getClaimListColumns,
  getDefaultFixedColumns,
  getSelectedColumnsCount,
  getVisibleColumns,
  isColumnDisabled,
} from "./ClaimList.columns.utils";
import type { ClaimColumnConfiguration } from "./ClaimList.columns.utils";

const makeConfig = (overrides: Partial<ClaimColumnConfiguration>[]): ClaimColumnConfiguration[] =>
  overrides.map((o) => ({
    key: "claimId",
    isFixed: false,
    isChecked: false,
    order: 0,
    ...o,
  })) as ClaimColumnConfiguration[];

describe("getClaimListColumns", () => {
  it("returns 14 columns in correct order", () => {
    const columns = getClaimListColumns((key) => key);

    expect(columns).toHaveLength(14);
    expect(columns[0].key).toBe("claimId");
    expect(columns[1].key).toBe("jobId");
    expect(columns[2].key).toBe("ascName");
    expect(columns[3].key).toBe("jobType");
    expect(columns[4].key).toBe("status");
    expect(columns[13].key).toBe("totalCost");
  });

  it("each column has key, label, render", () => {
    const columns = getClaimListColumns((key) => key);

    columns.forEach((col) => {
      expect(col.key).toBeTruthy();
      expect(col.label).toBeTruthy();
      expect(typeof col.render).toBe("function");
    });
  });
});

describe("getVisibleColumns", () => {
  it("returns checked columns in display order", () => {
    const config = makeConfig([
      { key: "claimId", isChecked: true, order: 0 },
      { key: "jobId", isChecked: true, order: 2 },
      { key: "invoiceNumber", isChecked: false, order: 1 },
    ]);

    expect(getVisibleColumns(config)).toEqual(["claimId", "jobId"]);
  });
});

describe("getSelectedColumnsCount", () => {
  it("counts selected columns", () => {
    const config = makeConfig([
      { key: "claimId", isChecked: true },
      { key: "invoiceNumber", isChecked: true },
      { key: "jobId", isChecked: false },
    ]);

    expect(getSelectedColumnsCount(config)).toBe(2);
  });
});

describe("isColumnDisabled", () => {
  it("returns true for fixed columns", () => {
    const config = makeConfig([{ key: "claimId", isFixed: true, isChecked: true }]);

    expect(isColumnDisabled("claimId", config)).toBe(true);
  });

  it("disables checked non-fixed columns when at minimum selection", () => {
    const config = makeConfig([
      { key: "claimId", isFixed: true, isChecked: true },
      { key: "jobId", isFixed: true, isChecked: true },
      { key: "ascName", isFixed: true, isChecked: true },
      { key: "jobType", isFixed: true, isChecked: true },
      { key: "status", isFixed: true, isChecked: true },
      { key: "mobileNumber", isFixed: false, isChecked: false },
    ]);

    expect(getSelectedColumnsCount(config)).toBe(MIN_VISIBLE_COLUMNS);
    expect(isColumnDisabled("mobileNumber", config)).toBe(false);
  });

  it("disables unchecked columns when at maximum selection", () => {
    const config = makeConfig([
      { key: "claimId", isFixed: true, isChecked: true },
      { key: "invoiceNumber", isFixed: true, isChecked: true },
      { key: "jobId", isFixed: true, isChecked: true },
      { key: "internalReferenceNumber", isFixed: true, isChecked: true },
      { key: "mobileNumber", isFixed: false, isChecked: true },
      { key: "createdOn", isFixed: false, isChecked: true },
      { key: "ascName", isFixed: false, isChecked: true },
      { key: "toolModelName", isFixed: false, isChecked: true },
      { key: "baretoolNumber", isFixed: false, isChecked: false },
    ]);

    expect(getSelectedColumnsCount(config)).toBe(MAX_VISIBLE_COLUMNS);
    expect(isColumnDisabled("baretoolNumber", config)).toBe(true);
  });
});

describe("getDefaultFixedColumns", () => {
  it("keeps only fixed columns selected", () => {
    const result = getDefaultFixedColumns();

    expect(result).toHaveLength(DEFAULT_COLUMN_CONFIGURATION.length);
    expect(result.filter((col) => col.isChecked)).toHaveLength(MIN_VISIBLE_COLUMNS);
    expect(result.filter((col) => col.isFixed && col.isChecked)).toHaveLength(MIN_VISIBLE_COLUMNS);
  });
});
