import { describe, it, expect, vi, beforeEach } from "vitest";
import { getClientDisplayName, flattenCustomerForSearch, filterClients } from "./ClientsList.utils";
import { matchesFilter } from "components/ui/List/List.utils";
import type { Customer } from "api/services/customers/customers.types";
import type { QuickFilter, Filter } from "components/ui/List/List.types";

vi.mock("components/ui/List/List.utils", () => ({
  matchesFilter: vi.fn(),
}));

function buildCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    customerType: "INDIVIDUAL_PRIVATE",
    firstName: "John",
    lastName: "Doe",
    primaryEmail: "",
    phoneNumber: "",
    mobileNumber: "",
    companyName: "",
    dealershipName: "",
    boschCustomerNumber: "",
    typeOfIndustry: "",
    ...overrides,
  } as Customer;
}

describe("getClientDisplayName", () => {
  it("returns companyName for COMPANY type", () => {
    const customer = buildCustomer({ customerType: "COMPANY", companyName: "Acme Corp" });
    expect(getClientDisplayName(customer)).toBe("Acme Corp");
  });

  it("returns dealershipName for DEALERSHIP type", () => {
    const customer = buildCustomer({ customerType: "DEALERSHIP", dealershipName: "Best Motors" });
    expect(getClientDisplayName(customer)).toBe("Best Motors");
  });

  it("returns full name for individual types", () => {
    const customer = buildCustomer({
      customerType: "INDIVIDUAL_PRIVATE",
      firstName: "John",
      lastName: "Doe",
    });
    expect(getClientDisplayName(customer)).toBe("John Doe");
  });

  it("filters out missing first or last name", () => {
    const customer = buildCustomer({ firstName: "John", lastName: "" });
    expect(getClientDisplayName(customer)).toBe("John");
  });

  it("returns empty string when both names are missing", () => {
    const customer = buildCustomer({ firstName: "", lastName: "" });
    expect(getClientDisplayName(customer)).toBe("");
  });
});

describe("flattenCustomerForSearch", () => {
  it("includes display name, contact info, and identifiers", () => {
    const customer = buildCustomer({
      firstName: "John",
      lastName: "Doe",
      primaryEmail: "john@example.com",
      phoneNumber: "+1234567",
      mobileNumber: "+7654321",
      companyName: "Acme",
      dealershipName: "Best Motors",
      boschCustomerNumber: "BC123",
    });

    expect(flattenCustomerForSearch(customer)).toEqual([
      "John Doe",
      "john@example.com",
      "+1234567",
      "+7654321",
      "Acme",
      "Best Motors",
      "BC123",
    ]);
  });

  it("excludes falsy values", () => {
    const customer = buildCustomer({
      firstName: "John",
      lastName: "Doe",
      primaryEmail: "",
      phoneNumber: "",
      mobileNumber: "",
      companyName: "",
      dealershipName: "",
      boschCustomerNumber: "",
    });

    expect(flattenCustomerForSearch(customer)).toEqual(["John Doe"]);
  });
});

describe("filterClients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const individual = buildCustomer({
    customerType: "INDIVIDUAL_PRIVATE",
    firstName: "John",
    lastName: "Doe",
    primaryEmail: "john@example.com",
  });
  const pro = buildCustomer({
    customerType: "INDIVIDUAL_PRO",
    firstName: "Jane",
    lastName: "Smith",
    primaryEmail: "jane@example.com",
  });
  const company = buildCustomer({
    customerType: "COMPANY",
    companyName: "Acme Corp",
    primaryEmail: "info@acme.com",
  });
  const dealership = buildCustomer({
    customerType: "DEALERSHIP",
    dealershipName: "Best Motors",
    primaryEmail: "sales@bestmotors.com",
  });

  const allCustomers = [individual, pro, company, dealership];

  const noQuickFilters: QuickFilter[] = [
    { key: "individual", label: "individual", selected: false },
    { key: "company", label: "company", selected: false },
    { key: "dealership", label: "dealership", selected: false },
  ];

  it("returns all customers when no filters or search applied", () => {
    const result = filterClients(allCustomers, noQuickFilters, "");
    expect(result).toEqual(allCustomers);
  });

  it("filters by individual quick filter (matches both PRIVATE and PRO)", () => {
    const quickFilters = noQuickFilters.map((f) =>
      f.key === "individual" ? { ...f, selected: true } : f,
    );
    const result = filterClients(allCustomers, quickFilters, "");
    expect(result).toEqual([individual, pro]);
  });

  it("filters by company quick filter", () => {
    const quickFilters = noQuickFilters.map((f) =>
      f.key === "company" ? { ...f, selected: true } : f,
    );
    const result = filterClients(allCustomers, quickFilters, "");
    expect(result).toEqual([company]);
  });

  it("filters by dealership quick filter", () => {
    const quickFilters = noQuickFilters.map((f) =>
      f.key === "dealership" ? { ...f, selected: true } : f,
    );
    const result = filterClients(allCustomers, quickFilters, "");
    expect(result).toEqual([dealership]);
  });

  it("combines multiple selected quick filters with OR logic", () => {
    const quickFilters = noQuickFilters.map((f) =>
      f.key === "company" || f.key === "dealership" ? { ...f, selected: true } : f,
    );
    const result = filterClients(allCustomers, quickFilters, "");
    expect(result).toEqual([company, dealership]);
  });

  it("filters by search value across flattened fields", () => {
    const result = filterClients(allCustomers, noQuickFilters, "acme");
    expect(result).toEqual([company]);
  });

  it("search is case-insensitive", () => {
    const result = filterClients(allCustomers, noQuickFilters, "JOHN");
    expect(result).toEqual([individual]);
  });

  it("trims whitespace-only search to no-op", () => {
    const result = filterClients(allCustomers, noQuickFilters, "   ");
    expect(result).toEqual(allCustomers);
  });

  it("returns empty array when search matches nothing", () => {
    const result = filterClients(allCustomers, noQuickFilters, "nonexistent");
    expect(result).toEqual([]);
  });

  it("combines quick filter and search", () => {
    const quickFilters = noQuickFilters.map((f) =>
      f.key === "individual" ? { ...f, selected: true } : f,
    );
    const result = filterClients(allCustomers, quickFilters, "jane");
    expect(result).toEqual([pro]);
  });

  it("applies advanced filters using matchesFilter for customerType", () => {
    vi.mocked(matchesFilter).mockImplementation(
      (filterValue, fieldValue) => fieldValue === "COMPANY",
    );
    const advancedFilters: Filter[] = [{ name: "customerType", value: "COMPANY" } as Filter];

    const result = filterClients(allCustomers, noQuickFilters, "", advancedFilters);

    expect(result).toEqual([company]);
    expect(matchesFilter).toHaveBeenCalledWith("COMPANY", "COMPANY");
  });

  it("applies advanced filters using matchesFilter for typeOfIndustry", () => {
    const industrialCustomer = buildCustomer({ typeOfIndustry: "AUTOMOTIVE" });
    vi.mocked(matchesFilter).mockImplementation(
      (filterValue, fieldValue) => fieldValue === "AUTOMOTIVE",
    );
    const advancedFilters: Filter[] = [{ name: "typeOfIndustry", value: "AUTOMOTIVE" } as Filter];

    const result = filterClients(
      [individual, industrialCustomer],
      noQuickFilters,
      "",
      advancedFilters,
    );

    expect(result).toEqual([industrialCustomer]);
  });

  it("skips advanced filter when value is empty or null", () => {
    const advancedFilters: Filter[] = [{ name: "customerType", value: "" } as Filter];
    const result = filterClients(allCustomers, noQuickFilters, "", advancedFilters);
    expect(result).toEqual(allCustomers);
    expect(matchesFilter).not.toHaveBeenCalled();
  });

  it("ignores unknown advanced filter names (defaults to match)", () => {
    const advancedFilters: Filter[] = [{ name: "unknownField", value: "something" } as Filter];
    const result = filterClients(allCustomers, noQuickFilters, "", advancedFilters);
    expect(result).toEqual(allCustomers);
  });

  it("requires all advanced filters to match (AND logic)", () => {
    vi.mocked(matchesFilter).mockImplementation(
      (filterValue, fieldValue) => fieldValue === filterValue,
    );
    const advancedFilters: Filter[] = [
      { name: "customerType", value: "COMPANY" } as Filter,
      { name: "typeOfIndustry", value: "RETAIL" } as Filter,
    ];

    const result = filterClients(allCustomers, noQuickFilters, "", advancedFilters);

    expect(result).toEqual([]);
  });
});
