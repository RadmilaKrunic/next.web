import { describe, it, expect, vi } from "vitest";
import React from "react";

vi.mock("components/ui/StatusIndicator/StatusIndicator", () => ({
  default: ({ status }: { status: string }) => React.createElement("span", null, status),
}));
vi.mock("@bosch/react-frok", () => ({
  Icon: ({ iconName }: { iconName: string }) => React.createElement("span", null, iconName),
}));

import { getApprovalColumns } from "./ApprovalListColumns.config";

const t = (key: string) => key;
const columns = getApprovalColumns(t);

const mockJob = {
  jobId: "J001",
  jobStatus: "WAITING_FOR_APPROVAL",
  createdAt: "2023-01-15T10:00:00Z",
  updatedAt: "2023-02-20T12:00:00Z",
  assigneeName: "Tech1",
  customer: {
    customerType: "INDIVIDUAL_PRIVATE",
    firstName: "John",
    lastName: "Doe",
    companyName: null,
  },
  customerWish: "Repair",
  pickupType: "STORE",
  paymentType: "CASH",
  source: "WALK_IN",
  asset: {
    toolModelName: "Drill X",
    serialNumber: "SN123",
    bareToolNumber: "BT001",
  },
} as never;

describe("getApprovalColumns", () => {
  it("returns jobId", () => {
    expect(columns.jobId.getValue(mockJob)).toBe("J001");
  });

  it("returns formatted createdAt", () => {
    expect(typeof columns.createdAt.getValue(mockJob)).toBe("string");
  });

  it("returns assignee name", () => {
    expect(columns.assignee.getValue(mockJob)).toBe("Tech1");
  });

  it("returns un-assigned label when assigneeName is un-assigned", () => {
    expect(
      columns.assignee.getValue({ ...(mockJob as object), assigneeName: "un-assigned" } as never),
    ).toBe("unassigned");
  });

  it("returns '-' when no customer", () => {
    expect(columns.customer.getValue({ ...(mockJob as object), customer: null } as never)).toBe(
      "-",
    );
  });

  it("renders customer with icon when customer exists", () => {
    const node = columns.customer.getValue(mockJob);
    expect(node).toBeTruthy();
  });

  it("renders jobStatus as StatusIndicator", () => {
    const node = columns.jobStatus.getValue(mockJob);
    expect(node).toBeTruthy();
  });

  it("returns customerWish translated", () => {
    expect(columns.customerWish.getValue(mockJob)).toBe("Repair");
  });

  it("returns '-' when customerWish is empty", () => {
    expect(
      columns.customerWish.getValue({ ...(mockJob as object), customerWish: "" } as never),
    ).toBe("-");
  });
});
