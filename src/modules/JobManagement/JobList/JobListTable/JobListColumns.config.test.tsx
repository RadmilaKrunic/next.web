import { describe, it, expect, vi } from "vitest";
import React from "react";

vi.mock("components/ui/StatusIndicator/StatusIndicator", () => ({
  default: ({ status }: { status: string }) => React.createElement("span", null, status),
}));
vi.mock("@bosch/react-frok", () => ({
  Icon: ({ iconName }: { iconName: string }) => React.createElement("span", null, iconName),
}));

import { getJobColumns } from "./JobListColumns.config";

const t = (key: string) => key;
const columns = getJobColumns(t);

const mockJob = {
  jobId: "J001",
  jobStatus: "DRAFT",
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

describe("getJobColumns", () => {
  it("returns jobId column with correct getValue", () => {
    expect(columns.jobId.getValue(mockJob)).toBe("J001");
    expect(columns.jobId.label).toBe("jobId");
  });

  it("returns createdAt formatted date", () => {
    const value = columns.createdAt.getValue(mockJob);
    expect(typeof value).toBe("string");
  });

  it("returns updatedAt formatted date", () => {
    const value = columns.updatedAt.getValue(mockJob);
    expect(typeof value).toBe("string");
  });

  it("returns assignee name", () => {
    expect(columns.assignee.getValue(mockJob)).toBe("Tech1");
  });

  it("renders customer column as ReactNode", () => {
    const node = columns.customer.getValue(mockJob);
    expect(node).toBeTruthy();
  });

  it("returns customerWish value", () => {
    expect(columns.customerWish.getValue(mockJob)).toBe("Repair");
  });

  it("returns pickupType value", () => {
    expect(columns.pickupType.getValue(mockJob)).toBe("STORE");
  });

  it("returns paymentType value", () => {
    const value = columns.paymentType.getValue(mockJob);
    // When t(key) === key (no translation), returns "-"
    expect(value).toBe("-");
  });

  it("returns source value", () => {
    expect(columns.source.getValue(mockJob)).toBe("WALK_IN");
  });

  it("returns toolModelName value", () => {
    expect(columns.toolModelName.getValue(mockJob)).toBe("Drill X");
  });

  it("returns serialNumber value", () => {
    expect(columns.serialNumber.getValue(mockJob)).toBe("SN123");
  });

  it("returns bareToolNumber value", () => {
    expect(columns.bareToolNumber.getValue(mockJob)).toBe("BT001");
  });

  it("renders jobStatus as StatusIndicator node", () => {
    const node = columns.jobStatus.getValue(mockJob);
    expect(node).toBeTruthy();
  });
});
