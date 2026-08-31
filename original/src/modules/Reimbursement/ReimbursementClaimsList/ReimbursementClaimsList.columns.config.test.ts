import { describe, it, expect } from "vitest";
import { getReimbursementClaimsColumns } from "./ReimbursementClaimsList.columns.config";
import { ReimbursementClaim } from "api/services/reimbursements/reimbursements.types";

const t = (key: string) => key;

const buildClaim = (overrides: Partial<ReimbursementClaim> = {}): ReimbursementClaim => ({
  claimId: "claim-1",
  jobId: "job-1",
  created: "2026-01-01",
  assetName: "Drill",
  bareToolNumber: "BT-1",
  actionType: "REPAIR",
  jobType: "WARRANTY",
  createdOn: "2026-01-01T00:00:00Z",
  creditNoteAmount: 12.5,
  ...overrides,
});

describe("getReimbursementClaimsColumns", () => {
  const columns = getReimbursementClaimsColumns(t);

  it("returns all expected column keys", () => {
    expect(columns.map((col) => col.key)).toEqual([
      "claimId",
      "created",
      "assetName",
      "bareToolNumber",
      "actionType",
      "jobId",
      "jobType",
      "creditNoteAmount",
    ]);
  });

  it("renders claimId fallback to dash when missing", () => {
    const col = columns.find((col) => col.key === "claimId")!;
    expect(col.render(buildClaim({ claimId: "" }))).toBe("-");
    expect(col.render(buildClaim())).toBe("claim-1");
  });

  it("renders created date formatted", () => {
    const col = columns.find((col) => col.key === "created")!;
    expect(col.render(buildClaim({ createdOn: "" }))).toBe("-");
    expect(col.render(buildClaim())).not.toBe("-");
  });

  it("renders assetName fallback to dash when missing", () => {
    const col = columns.find((col) => col.key === "assetName")!;
    expect(col.render(buildClaim({ assetName: "" }))).toBe("-");
    expect(col.render(buildClaim())).toBe("Drill");
  });

  it("renders bareToolNumber fallback to dash when missing", () => {
    const col = columns.find((col) => col.key === "bareToolNumber")!;
    expect(col.render(buildClaim({ bareToolNumber: "" }))).toBe("-");
    expect(col.render(buildClaim())).toBe("BT-1");
  });

  it("renders translated actionType", () => {
    const col = columns.find((col) => col.key === "actionType")!;
    expect(col.render(buildClaim({ actionType: "REPAIR" }))).toBe("REPAIR");
  });

  it("renders jobId fallback to dash when missing", () => {
    const col = columns.find((col) => col.key === "jobId")!;
    expect(col.render(buildClaim({ jobId: "" }))).toBe("-");
    expect(col.render(buildClaim())).toBe("job-1");
  });

  it("renders translated jobType", () => {
    const col = columns.find((col) => col.key === "jobType")!;
    expect(col.render(buildClaim({ jobType: "WARRANTY" }))).toBe("WARRANTY");
  });

  it("renders creditNoteAmount formatted to two decimals", () => {
    const col = columns.find((col) => col.key === "creditNoteAmount")!;
    expect(col.render(buildClaim({ creditNoteAmount: 12.5 }))).toBe("12.50");
  });

  it("renders 0.00 when creditNoteAmount is falsy", () => {
    const col = columns.find((col) => col.key === "creditNoteAmount")!;
    expect(col.render(buildClaim({ creditNoteAmount: 0 }))).toBe("0.00");
  });
});
