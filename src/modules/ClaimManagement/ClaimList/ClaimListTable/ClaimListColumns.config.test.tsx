import { describe, it, expect, vi } from "vitest";
import React from "react";

vi.mock("components/ui/StatusIndicator/StatusIndicator", () => ({
  default: ({ status }: { status: string }) => React.createElement("span", null, status),
}));

import { getClaimColumns } from "./ClaimListColumns.config";

const t = (key: string) => key;
const columns = getClaimColumns(t);

const mockClaim = {
  claimId: "C001",
  createdOn: "2023-06-01T10:00:00Z",
  ascName: "Bosch ASC",
  toolModelName: "Drill X",
  baretoolNumber: "BT001",
  jobAction: "REPAIR",
  jobType: "WARRANTY",
  totalCost: 120.5,
  status: "PENDING",
} as never;

describe("getClaimColumns", () => {
  it("returns claimId", () => {
    expect(columns.claimId.getValue(mockClaim)).toBe("C001");
  });

  it("returns formatted createdOn date", () => {
    expect(typeof columns.createdOn.getValue(mockClaim)).toBe("string");
  });

  it("returns ascName", () => {
    expect(columns.ascName.getValue(mockClaim)).toBe("Bosch ASC");
  });

  it("returns toolModelName", () => {
    expect(columns.toolModelName.getValue(mockClaim)).toBe("Drill X");
  });

  it("returns baretoolNumber", () => {
    expect(columns.baretoolNumber.getValue(mockClaim)).toBe("BT001");
  });

  it("returns jobAction translated", () => {
    expect(columns.jobAction.getValue(mockClaim)).toBe("REPAIR");
  });

  it("returns jobType translated", () => {
    expect(columns.jobType.getValue(mockClaim)).toBe("WARRANTY");
  });

  it("returns totalCost formatted to 2 decimals", () => {
    expect(columns.totalCost.getValue(mockClaim)).toBe("120.50");
  });

  it("returns '-' when totalCost is null", () => {
    expect(columns.totalCost.getValue({ ...(mockClaim as object), totalCost: null } as never)).toBe(
      "-",
    );
  });

  it("returns '-' when toolModelName is null", () => {
    expect(
      columns.toolModelName.getValue({ ...(mockClaim as object), toolModelName: null } as never),
    ).toBe("-");
  });

  it("renders status as StatusIndicator", () => {
    const node = columns.status.getValue(mockClaim);
    expect(node).toBeTruthy();
  });
});
