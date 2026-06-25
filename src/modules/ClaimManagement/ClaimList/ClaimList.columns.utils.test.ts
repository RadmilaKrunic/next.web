import { describe, it, expect, vi } from "vitest";
import React from "react";

vi.mock("./ClaimListTable/ClaimListColumns.config", () => ({
  getClaimColumns: vi.fn((t: (key: string) => string) => ({
    claimId: { key: "claimId", label: t("claimId"), getValue: () => "C001" },
    createdOn: { key: "createdOn", label: t("createdOn"), getValue: () => "2023-01-01" },
    ascName: { key: "ascName", label: t("ascName"), getValue: () => "ASC" },
    toolModelName: { key: "toolModelName", label: t("toolModelName"), getValue: () => "Drill" },
    baretoolNumber: { key: "baretoolNumber", label: t("baretoolNumber"), getValue: () => "BT1" },
    jobAction: { key: "jobAction", label: t("jobAction"), getValue: () => "REPAIR" },
    jobType: { key: "jobType", label: t("jobType"), getValue: () => "WARRANTY" },
    totalCost: { key: "totalCost", label: t("totalCost"), getValue: () => "100.00" },
    status: {
      key: "status",
      label: t("status"),
      getValue: () => React.createElement("span", null, "PENDING"),
    },
  })),
}));

import { getClaimListColumns } from "./ClaimList.columns.utils";

describe("getClaimListColumns", () => {
  it("returns 9 columns in correct order", () => {
    const columns = getClaimListColumns((key) => key);
    expect(columns).toHaveLength(9);
    expect(columns[0].key).toBe("claimId");
    expect(columns[8].key).toBe("status");
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
