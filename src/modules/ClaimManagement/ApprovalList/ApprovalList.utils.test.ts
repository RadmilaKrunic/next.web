import { describe, it, expect } from "vitest";
import { getInitialFieldValues, filterApprovals } from "./ApprovalList.utils";
import type { GoodwillApproval } from "./ApprovalList.types";
import type { QuickFilter, Filter } from "components/ui/List/List.types";

const makeApproval = (overrides: Partial<GoodwillApproval> = {}): GoodwillApproval => ({
  jobId: "job-1",
  orderId: "ord-1",
  ascId: "asc-1",
  source: "WEB",
  pickupType: "PICKUP",
  paymentType: "CASH",
  customer: {
    firstName: "John",
    lastName: "Doe",
    customerType: "INDIVIDUAL_PRIVATE",
  },
  createdAt: "2024-06-15T10:00:00.000Z",
  updatedAt: "2024-06-20T10:00:00.000Z",
  assigneeName: "Tech",
  jobStatus: "BOSCH_APPROVAL_PENDING",
  attachments: [],
  ...overrides,
});

const noFilters: QuickFilter[] = [];
const noAdvanced: Filter[] = [];

describe("getInitialFieldValues", () => {
  it("creates empty string entries for each field name", () => {
    const result = getInitialFieldValues(["name", "email"]);
    expect(result).toEqual({ name: "", email: "" });
  });

  it("returns empty object for empty array", () => {
    expect(getInitialFieldValues([])).toEqual({});
  });
});

describe("filterApprovals", () => {
  it("returns all approvals when no filters applied", () => {
    const approvals = [makeApproval(), makeApproval({ jobId: "job-2" })];
    expect(filterApprovals(approvals, noFilters, "", noAdvanced)).toHaveLength(2);
  });

  describe("search", () => {
    it("filters case-insensitively by any string in approval", () => {
      const approvals = [makeApproval({ jobId: "abc999" }), makeApproval({ jobId: "xyz111" })];
      expect(filterApprovals(approvals, noFilters, "ABC", noAdvanced)).toHaveLength(1);
    });

    it("returns empty when no match", () => {
      expect(filterApprovals([makeApproval()], noFilters, "zzznomatch", noAdvanced)).toHaveLength(
        0,
      );
    });
  });

  describe("quick filters", () => {
    it("filters by pendingApprovals quick filter", () => {
      const approvals = [
        makeApproval({ jobId: "j1", jobStatus: "BOSCH_APPROVAL_PENDING" }),
        makeApproval({ jobId: "j2", jobStatus: "IN_DIAGNOSTICS" }),
      ];
      const qf: QuickFilter[] = [{ key: "pendingApprovals", label: "Pending", selected: true }];
      const result = filterApprovals(approvals, qf, "", noAdvanced);
      expect(result).toHaveLength(1);
      expect(result[0].jobId).toBe("j1");
    });

    it("does not filter when quick filter not selected", () => {
      const approvals = [makeApproval(), makeApproval({ jobId: "j2" })];
      const qf: QuickFilter[] = [{ key: "pendingApprovals", label: "Pending", selected: false }];
      expect(filterApprovals(approvals, qf, "", noAdvanced)).toHaveLength(2);
    });
  });

  describe("advanced filters", () => {
    it("filters by jobStatus", () => {
      const approvals = [
        makeApproval({ jobId: "j1", jobStatus: "BOSCH_APPROVAL_PENDING" }),
        makeApproval({ jobId: "j2", jobStatus: "IN_DIAGNOSTICS" }),
      ];
      const af: Filter[] = [{ name: "jobStatus", value: "BOSCH_APPROVAL_PENDING" }];
      expect(filterApprovals(approvals, noFilters, "", af)).toHaveLength(1);
    });

    it("filters by customerType", () => {
      const approvals = [
        makeApproval({ customer: { firstName: "A", lastName: "B", customerType: "COMPANY" } }),
        makeApproval({
          jobId: "j2",
          customer: { firstName: "C", lastName: "D", customerType: "INDIVIDUAL_PRIVATE" },
        }),
      ];
      const af: Filter[] = [{ name: "customerType", value: "COMPANY" }];
      expect(filterApprovals(approvals, noFilters, "", af)).toHaveLength(1);
    });

    it("filters by createdAt date range", () => {
      const approvals = [
        makeApproval({ jobId: "j1", createdAt: "2024-06-15T00:00:00.000Z" }),
        makeApproval({ jobId: "j2", createdAt: "2023-01-01T00:00:00.000Z" }),
      ];
      const af: Filter[] = [
        { name: "createdAt", value: "2024-01-01T00:00:00.000Z,2024-12-31T00:00:00.000Z" },
      ];
      expect(filterApprovals(approvals, noFilters, "", af)).toHaveLength(1);
    });

    it("filters by updatedAt date range", () => {
      const approvals = [
        makeApproval({ jobId: "j1", updatedAt: "2024-09-01T00:00:00.000Z" }),
        makeApproval({ jobId: "j2", updatedAt: "2023-01-01T00:00:00.000Z" }),
      ];
      const af: Filter[] = [
        { name: "updatedAt", value: "2024-01-01T00:00:00.000Z,2024-12-31T00:00:00.000Z" },
      ];
      expect(filterApprovals(approvals, noFilters, "", af)).toHaveLength(1);
    });

    it("skips filter when value is empty", () => {
      const af: Filter[] = [{ name: "jobStatus", value: "" }];
      const approvals = [makeApproval(), makeApproval({ jobId: "j2" })];
      expect(filterApprovals(approvals, noFilters, "", af)).toHaveLength(2);
    });

    it("filters by customerWish", () => {
      const approvals = [
        makeApproval({ jobId: "j1", customerWish: "REPAIR" }),
        makeApproval({ jobId: "j2", customerWish: "serviceGoodwill" }),
      ];
      const af: Filter[] = [{ name: "customerWish", value: "REPAIR" }];
      expect(filterApprovals(approvals, noFilters, "", af)).toHaveLength(1);
    });

    it("filters by pickupType", () => {
      const approvals = [
        makeApproval({ jobId: "j1", pickupType: "PICKUP" }),
        makeApproval({ jobId: "j2", pickupType: "DELIVERY" }),
      ];
      const af: Filter[] = [{ name: "pickupType", value: "PICKUP" }];
      expect(filterApprovals(approvals, noFilters, "", af)).toHaveLength(1);
    });

    it("filters by paymentType", () => {
      const approvals = [
        makeApproval({ jobId: "j1", paymentType: "CASH" }),
        makeApproval({ jobId: "j2", paymentType: "CARD" }),
      ];
      const af: Filter[] = [{ name: "paymentType", value: "CASH" }];
      expect(filterApprovals(approvals, noFilters, "", af)).toHaveLength(1);
    });

    it("filters by ascName (single value)", () => {
      const approvals = [
        makeApproval({ jobId: "j1", ascId: "ASC8" }),
        makeApproval({ jobId: "j2", ascId: "ASC9" }),
      ];
      const af: Filter[] = [{ name: "ascName", value: "ASC8" }];
      expect(filterApprovals(approvals, noFilters, "", af)).toHaveLength(1);
    });

    it("filters by ascName (multi-select array)", () => {
      const approvals = [
        makeApproval({ jobId: "j1", ascId: "ASC8" }),
        makeApproval({ jobId: "j2", ascId: "ASC9" }),
        makeApproval({ jobId: "j3", ascId: "ASC12" }),
      ];
      const af: Filter[] = [{ name: "ascName", value: ["ASC8", "ASC12"] }];
      expect(filterApprovals(approvals, noFilters, "", af)).toHaveLength(2);
    });

    it("returns all for unknown filter name", () => {
      const af: Filter[] = [{ name: "unknownField", value: "xyz" }];
      const approvals = [makeApproval(), makeApproval({ jobId: "j2" })];
      expect(filterApprovals(approvals, noFilters, "", af)).toHaveLength(2);
    });
  });
});
