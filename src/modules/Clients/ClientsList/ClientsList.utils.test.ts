import { describe, it, expect } from "vitest";
import { resolveCustomerTypeFilter } from "./ClientsList.utils";
import type { QuickFilter, Filter } from "components/ui/List/List.types";

const noQuickFilters: QuickFilter[] = [
  { key: "INDIVIDUAL_PRIVATE", label: "individual", selected: false },
  { key: "INDIVIDUAL_PRO", label: "individualPro", selected: false },
  { key: "COMPANY", label: "company", selected: false },
  { key: "DEALERSHIP", label: "dealership", selected: false },
];

describe("resolveCustomerTypeFilter", () => {
  it("returns undefined when nothing is selected", () => {
    expect(resolveCustomerTypeFilter(noQuickFilters)).toBeUndefined();
  });

  it("maps company quick filter to COMPANY", () => {
    const quickFilters = noQuickFilters.map((f) =>
      f.key === "COMPANY" ? { ...f, selected: true } : f,
    );
    expect(resolveCustomerTypeFilter(quickFilters)).toEqual(["COMPANY"]);
  });

  it("maps dealership quick filter to DEALERSHIP", () => {
    const quickFilters = noQuickFilters.map((f) =>
      f.key === "DEALERSHIP" ? { ...f, selected: true } : f,
    );
    expect(resolveCustomerTypeFilter(quickFilters)).toEqual(["DEALERSHIP"]);
  });

  it("maps individual quick filter to INDIVIDUAL_PRIVATE", () => {
    const quickFilters = noQuickFilters.map((f) =>
      f.key === "INDIVIDUAL_PRIVATE" ? { ...f, selected: true } : f,
    );
    expect(resolveCustomerTypeFilter(quickFilters)).toEqual(["INDIVIDUAL_PRIVATE"]);
  });

  it("returns all selected quick filters when multiple are selected", () => {
    const quickFilters = noQuickFilters.map((f) =>
      f.key === "COMPANY" || f.key === "DEALERSHIP" ? { ...f, selected: true } : f,
    );
    expect(resolveCustomerTypeFilter(quickFilters)).toEqual(["COMPANY", "DEALERSHIP"]);
  });

  it("prioritizes advanced filter value over quick filters", () => {
    const quickFilters = noQuickFilters.map((f) =>
      f.key === "COMPANY" ? { ...f, selected: true } : f,
    );
    const advancedFilters: Filter[] = [{ name: "customerType", value: "INDIVIDUAL_PRO" } as Filter];
    expect(resolveCustomerTypeFilter(quickFilters, advancedFilters)).toEqual(["INDIVIDUAL_PRO"]);
  });

  it("ignores empty advanced filter value", () => {
    const advancedFilters: Filter[] = [{ name: "customerType", value: "" } as Filter];
    expect(resolveCustomerTypeFilter(noQuickFilters, advancedFilters)).toBeUndefined();
  });
});
