import { describe, it, expect } from "vitest";
import {
  getInitialFieldValues,
  flattenJobForSearch,
  isDateInRange,
  filterJobs,
  getJobNavigationPath,
} from "./JobList.utils";
import type { Job } from "./JobList.types";
import type { QuickFilter, Filter } from "components/ui/List/List.types";

const makeJob = (overrides: Partial<Job> = {}): Job => ({
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
  createdAt: "2024-03-01T10:00:00.000Z",
  updatedAt: "2024-03-10T10:00:00.000Z",
  assigneeName: "Tech User",
  jobStatus: "IN_DIAGNOSTICS",
  attachments: [],
  ...overrides,
});

describe("getInitialFieldValues", () => {
  it("creates an empty string for each field name", () => {
    const result = getInitialFieldValues(["name", "email", "phone"]);
    expect(result).toEqual({ name: "", email: "", phone: "" });
  });

  it("returns empty object for empty array", () => {
    expect(getInitialFieldValues([])).toEqual({});
  });
});

describe("flattenJobForSearch", () => {
  it("extracts all string values from a flat object", () => {
    const job = makeJob({ jobId: "abc", jobStatus: "DRAFT" });
    const result = flattenJobForSearch(job);
    expect(result).toContain("abc");
    expect(result).toContain("DRAFT");
  });

  it("recursively extracts strings from nested objects", () => {
    const job = makeJob({
      customer: {
        firstName: "Alice",
        lastName: "Smith",
        customerType: "COMPANY",
        companyName: "Acme",
      },
    });
    const result = flattenJobForSearch(job);
    expect(result).toContain("Alice");
    expect(result).toContain("Acme");
  });

  it("does not include non-string values", () => {
    const job = makeJob();
    const result = flattenJobForSearch(job);
    // Numbers and booleans should not appear
    expect(result.every((v) => typeof v === "string")).toBe(true);
  });
});

describe("isDateInRange", () => {
  it("returns true when dateStr is empty", () => {
    expect(isDateInRange("", "2024-01-01,2024-12-31")).toBe(true);
  });

  it("returns true when rangeStr is empty", () => {
    expect(isDateInRange("2024-06-15", "")).toBe(true);
  });

  it("returns true when date is within range", () => {
    expect(
      isDateInRange(
        "2024-06-15T00:00:00.000Z",
        "2024-01-01T00:00:00.000Z,2024-12-31T00:00:00.000Z",
      ),
    ).toBe(true);
  });

  it("returns false when date is before range start", () => {
    expect(
      isDateInRange(
        "2023-12-31T00:00:00.000Z",
        "2024-01-01T00:00:00.000Z,2024-12-31T00:00:00.000Z",
      ),
    ).toBe(false);
  });

  it("returns false when date is after range end", () => {
    expect(
      isDateInRange(
        "2025-01-01T00:00:00.000Z",
        "2024-01-01T00:00:00.000Z,2024-12-31T00:00:00.000Z",
      ),
    ).toBe(false);
  });

  it("returns true when both are empty", () => {
    expect(isDateInRange("", "")).toBe(true);
  });
});

describe("filterJobs", () => {
  const noQuickFilters: QuickFilter[] = [];
  const noAdvancedFilters: Filter[] = [];

  it("returns all jobs when no filters applied", () => {
    const jobs = [makeJob(), makeJob({ jobId: "job-2" })];
    expect(filterJobs(jobs, noQuickFilters, "", noAdvancedFilters)).toHaveLength(2);
  });

  describe("quick filters", () => {
    it("filters by readyForDiagnostic quick filter", () => {
      const jobs = [
        makeJob({ jobId: "j1", jobStatus: "READY_FOR_DIAGNOSTIC" }),
        makeJob({ jobId: "j2", jobStatus: "IN_DIAGNOSTICS" }),
      ];
      const quickFilters: QuickFilter[] = [
        { key: "readyForDiagnostic", label: "Ready", selected: true },
      ];
      const result = filterJobs(jobs, quickFilters, "", noAdvancedFilters);
      expect(result).toHaveLength(1);
      expect(result[0].jobId).toBe("j1");
    });

    it("filters by unassigned quick filter", () => {
      const jobs = [
        makeJob({ jobId: "j1", assigneeName: null }),
        makeJob({ jobId: "j2", assigneeName: "Tech User" }),
        makeJob({ jobId: "j3", assigneeName: "un-assigned" }),
      ];
      const quickFilters: QuickFilter[] = [
        { key: "unassigned", label: "Unassigned", selected: true },
      ];
      const result = filterJobs(jobs, quickFilters, "", noAdvancedFilters);
      expect(result).toHaveLength(2);
      expect(result.map((j) => j.jobId)).toContain("j1");
      expect(result.map((j) => j.jobId)).toContain("j3");
    });

    it("returns empty array when no jobs match quick filter", () => {
      const jobs = [makeJob({ jobStatus: "IN_DIAGNOSTICS" })];
      const quickFilters: QuickFilter[] = [
        { key: "readyForDiagnostic", label: "Ready", selected: true },
      ];
      expect(filterJobs(jobs, quickFilters, "", noAdvancedFilters)).toHaveLength(0);
    });

    it("does not filter when quick filter is not selected", () => {
      const jobs = [makeJob(), makeJob({ jobId: "job-2" })];
      const quickFilters: QuickFilter[] = [
        { key: "readyForDiagnostic", label: "Ready", selected: false },
      ];
      expect(filterJobs(jobs, quickFilters, "", noAdvancedFilters)).toHaveLength(2);
    });
  });

  describe("search filter", () => {
    it("filters jobs by search value matching job content", () => {
      const jobs = [makeJob({ jobId: "abc123" }), makeJob({ jobId: "xyz789" })];
      const result = filterJobs(jobs, noQuickFilters, "abc", noAdvancedFilters);
      expect(result).toHaveLength(1);
      expect(result[0].jobId).toBe("abc123");
    });

    it("is case-insensitive", () => {
      const jobs = [makeJob({ jobId: "ABC123" })];
      expect(filterJobs(jobs, noQuickFilters, "abc", noAdvancedFilters)).toHaveLength(1);
    });

    it("returns empty array when no match", () => {
      const jobs = [makeJob({ jobId: "job-1" })];
      expect(filterJobs(jobs, noQuickFilters, "nomatch9999", noAdvancedFilters)).toHaveLength(0);
    });
  });

  describe("advanced filters", () => {
    it("filters by jobStatus advanced filter", () => {
      const jobs = [
        makeJob({ jobId: "j1", jobStatus: "DRAFT" }),
        makeJob({ jobId: "j2", jobStatus: "IN_DIAGNOSTICS" }),
      ];
      const advancedFilters: Filter[] = [{ name: "jobStatus", value: "DRAFT" }];
      const result = filterJobs(jobs, noQuickFilters, "", advancedFilters);
      expect(result).toHaveLength(1);
      expect(result[0].jobId).toBe("j1");
    });

    it("filters by customerType advanced filter", () => {
      const jobs = [
        makeJob({
          jobId: "j1",
          customer: { firstName: "A", lastName: "B", customerType: "COMPANY" },
        }),
        makeJob({
          jobId: "j2",
          customer: { firstName: "C", lastName: "D", customerType: "INDIVIDUAL_PRIVATE" },
        }),
      ];
      const advancedFilters: Filter[] = [{ name: "customerType", value: "COMPANY" }];
      const result = filterJobs(jobs, noQuickFilters, "", advancedFilters);
      expect(result).toHaveLength(1);
      expect(result[0].jobId).toBe("j1");
    });

    it("skips advanced filter when value is empty", () => {
      const jobs = [makeJob(), makeJob({ jobId: "job-2" })];
      const advancedFilters: Filter[] = [{ name: "jobStatus", value: "" }];
      expect(filterJobs(jobs, noQuickFilters, "", advancedFilters)).toHaveLength(2);
    });

    it("filters by createdAt date range", () => {
      const jobs = [
        makeJob({ jobId: "j1", createdAt: "2024-06-15T00:00:00.000Z" }),
        makeJob({ jobId: "j2", createdAt: "2023-01-01T00:00:00.000Z" }),
      ];
      const advancedFilters: Filter[] = [
        {
          name: "createdAt",
          value: "2024-01-01T00:00:00.000Z,2024-12-31T00:00:00.000Z",
        },
      ];
      const result = filterJobs(jobs, noQuickFilters, "", advancedFilters);
      expect(result).toHaveLength(1);
      expect(result[0].jobId).toBe("j1");
    });

    it("returns all for unknown advanced filter key", () => {
      const jobs = [makeJob(), makeJob({ jobId: "j2" })];
      const advancedFilters: Filter[] = [{ name: "unknownField", value: "xyz" }];
      expect(filterJobs(jobs, noQuickFilters, "", advancedFilters)).toHaveLength(2);
    });
  });
});

describe("getJobNavigationPath", () => {
  it("returns edit-order path for DRAFT jobs", () => {
    const job = makeJob({ jobStatus: "DRAFT", orderId: "ord-99" });
    expect(getJobNavigationPath(job)).toBe("/edit-order/ord-99");
  });

  it("returns job-overview path (no hash) for READY_FOR_DIAGNOSTIC", () => {
    const job = makeJob({ jobStatus: "READY_FOR_DIAGNOSTIC", jobId: "job-55" });
    expect(getJobNavigationPath(job)).toBe("/job-overview/job-55");
  });

  it("returns job-overview path with #diagnosticData for other statuses", () => {
    const job = makeJob({ jobStatus: "IN_DIAGNOSTICS", jobId: "job-77" });
    expect(getJobNavigationPath(job)).toBe("/job-overview/job-77#diagnosticData");
  });

  it("handles lowercase draft status", () => {
    const job = makeJob({ jobStatus: "draft", orderId: "ord-10" });
    expect(getJobNavigationPath(job)).toBe("/edit-order/ord-10");
  });
});
