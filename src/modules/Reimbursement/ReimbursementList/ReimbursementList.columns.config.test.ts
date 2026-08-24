import { describe, it, expect } from "vitest";
import { getReimbursementListColumns } from "./ReimbursementList.columns.config";
import { Reimbursement } from "api/services/reimbursements/reimbursements.types";

const t = (key: string) => key;

const buildItem = (overrides: Partial<Reimbursement> = {}): Reimbursement => ({
  reimbursementId: "R1",
  ascId: "asc-1",
  ascName: "ASC Name",
  claimCount: 3,
  creditAmount: 100,
  status: "APPROVED",
  countryCode: "string",
  materialCount: 0,
  periodEndDate: new Date("2026-01-31T00:00:00Z"),
  periodStartDate: new Date("2026-01-01T00:00:00Z"),
  periodType: "MONTHLY",
  totalAmount: 150.5,
  claims: [],
  claimIds: [],
  customerCode: "CUST-1",
  paymentSummaries: [],
  ...overrides,
});

describe("getReimbursementListColumns", () => {
  const columns = getReimbursementListColumns(t);

  it("returns all expected column keys", () => {
    expect(columns.map((col) => col.key)).toEqual([
      "reimbursementId",
      "ascName",
      "periodType",
      "period",
      "claimCount",
      "totalAmount",
      "status",
    ]);
  });

  it("renders reimbursementId fallback to dash when missing", () => {
    const col = columns.find((col) => col.key === "reimbursementId")!;
    expect(col.render(buildItem({ reimbursementId: "" }))).toBe("-");
    expect(col.render(buildItem())).toBe("R1");
  });

  it("renders ascName fallback to dash when missing", () => {
    const col = columns.find((col) => col.key === "ascName")!;
    expect(col.render(buildItem({ ascName: "" }))).toBe("-");
    expect(col.render(buildItem())).toBe("ASC Name");
  });

  it("renders translated periodType", () => {
    const col = columns.find((col) => col.key === "periodType")!;
    expect(col.render(buildItem({ periodType: "MONTHLY" }))).toBe("MONTHLY");
  });

  it("renders formatted period range", () => {
    const col = columns.find((col) => col.key === "period")!;
    expect(col.render(buildItem())).toBe("01.01.2026 - 31.01.2026");
  });

  it("renders claimCount as string, defaulting to 0", () => {
    const col = columns.find((col) => col.key === "claimCount")!;
    expect(col.render(buildItem({ claimCount: 3 }))).toBe("3");
    expect(col.render(buildItem({ claimCount: 0 }))).toBe("0");
  });

  it("renders totalAmount formatted to two decimals, defaulting to 0.00", () => {
    const col = columns.find((col) => col.key === "totalAmount")!;
    expect(col.render(buildItem({ totalAmount: 150.5 }))).toBe("150.50");
    expect(col.render(buildItem({ totalAmount: 0 }))).toBe("0.00");
  });

  it("renders translated status, fallback to dash when missing", () => {
    const col = columns.find((col) => col.key === "status")!;
    expect(col.render(buildItem({ status: "APPROVED" }))).toBe("APPROVED");
    expect(col.render(buildItem({ status: "" }))).toBe("-");
  });
});
