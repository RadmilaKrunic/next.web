import { describe, it, expect } from "vitest";
import { flattenClaimForSearch, filterClaims, getClaimNavigationPath } from "./ClaimList.utils";
import type { Claim } from "./ClaimList.types";
import type { QuickFilter, Filter } from "components/ui/List/List.types";

const makeClaim = (overrides: Partial<Claim> = {}): Claim => ({
  claimId: "claim-1",
  jobId: "job-1",
  createdOn: "2024-06-15T10:00:00.000Z",
  countryCode: "DE",
  ascId: "ASC1",
  ascName: "Service Center",
  toolModelName: "Drill X",
  baretoolNumber: "BT-001",
  jobAction: "REPAIR",
  jobType: "WARRANTY",
  totalCost: 150,
  status: "PENDING",
  ...overrides,
});

const noFilters: QuickFilter[] = [];
const noAdvanced: Filter[] = [];

describe("flattenClaimForSearch", () => {
  it("extracts all string values from a claim", () => {
    const claim = makeClaim({ claimId: "abc123", status: "APPROVED" });
    const result = flattenClaimForSearch(claim);
    expect(result).toContain("abc123");
    expect(result).toContain("APPROVED");
  });

  it("converts number values to strings", () => {
    const claim = makeClaim({ totalCost: 99.99 });
    const result = flattenClaimForSearch(claim);
    expect(result).toContain("99.99");
  });
});

describe("filterClaims", () => {
  it("returns all claims when no filters applied", () => {
    const claims = [makeClaim(), makeClaim({ claimId: "claim-2" })];
    expect(filterClaims(claims, noFilters, "", noAdvanced)).toHaveLength(2);
  });

  describe("search", () => {
    it("filters by case-insensitive search value", () => {
      const claims = [makeClaim({ claimId: "abc123" }), makeClaim({ claimId: "xyz789" })];
      expect(filterClaims(claims, noFilters, "ABC", noAdvanced)).toHaveLength(1);
    });

    it("returns empty when no match", () => {
      const claims = [makeClaim({ claimId: "job-1" })];
      expect(filterClaims(claims, noFilters, "zzznomatch", noAdvanced)).toHaveLength(0);
    });
  });

  describe("quick filters", () => {
    it("filters by PENDING quick filter", () => {
      const claims = [
        makeClaim({ claimId: "c1", status: "PENDING" }),
        makeClaim({ claimId: "c2", status: "APPROVED" }),
      ];
      const qf: QuickFilter[] = [{ key: "PENDING", label: "Pending", selected: true }];
      expect(filterClaims(claims, qf, "", noAdvanced)).toHaveLength(1);
    });

    it("does not filter when quick filter is not selected", () => {
      const claims = [makeClaim(), makeClaim({ claimId: "c2" })];
      const qf: QuickFilter[] = [{ key: "PENDING", label: "Pending", selected: false }];
      expect(filterClaims(claims, qf, "", noAdvanced)).toHaveLength(2);
    });
  });

  describe("advanced filters", () => {
    it("filters by status", () => {
      const claims = [
        makeClaim({ claimId: "c1", status: "APPROVED" }),
        makeClaim({ claimId: "c2", status: "PENDING" }),
      ];
      const af: Filter[] = [{ name: "status", value: "APPROVED" }];
      const result = filterClaims(claims, noFilters, "", af);
      expect(result).toHaveLength(1);
      expect(result[0].claimId).toBe("c1");
    });

    it("filters by jobType", () => {
      const claims = [
        makeClaim({ claimId: "c1", jobType: "WARRANTY" }),
        makeClaim({ claimId: "c2", jobType: "CHARGEABLE" }),
      ];
      const af: Filter[] = [{ name: "jobType", value: "WARRANTY" }];
      expect(filterClaims(claims, noFilters, "", af)).toHaveLength(1);
    });

    it("filters by jobAction", () => {
      const claims = [
        makeClaim({ claimId: "c1", jobAction: "REPAIR" }),
        makeClaim({ claimId: "c2", jobAction: "EXCHANGE" }),
      ];
      const af: Filter[] = [{ name: "jobAction", value: "REPAIR" }];
      expect(filterClaims(claims, noFilters, "", af)).toHaveLength(1);
    });

    it("filters by createdOn date range", () => {
      const claims = [
        makeClaim({ claimId: "c1", createdOn: "2024-06-15T00:00:00.000Z" }),
        makeClaim({ claimId: "c2", createdOn: "2023-01-01T00:00:00.000Z" }),
      ];
      const af: Filter[] = [
        { name: "createdOn", value: "2024-01-01T00:00:00.000Z,2024-12-31T00:00:00.000Z" },
      ];
      expect(filterClaims(claims, noFilters, "", af)).toHaveLength(1);
    });

    it("skips filter when value is empty", () => {
      const af: Filter[] = [{ name: "status", value: "" }];
      const claims = [makeClaim(), makeClaim({ claimId: "c2" })];
      expect(filterClaims(claims, noFilters, "", af)).toHaveLength(2);
    });

    it("returns all for unknown filter name", () => {
      const af: Filter[] = [{ name: "unknownField", value: "xyz" }];
      const claims = [makeClaim(), makeClaim({ claimId: "c2" })];
      expect(filterClaims(claims, noFilters, "", af)).toHaveLength(2);
    });
  });
});

describe("getClaimNavigationPath", () => {
  it("returns correct path including claimId", () => {
    const claim = makeClaim({ claimId: "claim-99" });
    expect(getClaimNavigationPath(claim)).toBe("/claim-overview/claim-99/#claims");
  });
});
