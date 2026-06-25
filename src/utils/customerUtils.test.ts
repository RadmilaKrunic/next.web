import { describe, it, expect } from "vitest";
import { getCustomerDisplayName } from "./customerUtils";
import type { Job } from "../modules/JobManagement/JobList/JobList.types";

type Customer = Job["customer"];

const makeCustomer = (overrides: Partial<Customer>): Customer => ({
  firstName: "",
  lastName: "",
  ...overrides,
});

describe("getCustomerDisplayName", () => {
  it("returns companyName for COMPANY customer type", () => {
    const customer = makeCustomer({ customerType: "COMPANY", companyName: "Bosch GmbH" });
    expect(getCustomerDisplayName(customer)).toBe("Bosch GmbH");
  });

  it("returns dealershipName for DEALERSHIP customer type", () => {
    const customer = makeCustomer({ customerType: "DEALERSHIP", dealershipName: "Tech Dealer" });
    expect(getCustomerDisplayName(customer)).toBe("Tech Dealer");
  });

  it("returns full name for individual customer", () => {
    const customer = makeCustomer({ firstName: "John", lastName: "Doe" });
    expect(getCustomerDisplayName(customer)).toBe("John Doe");
  });

  it("returns trimmed first name only when lastName is empty", () => {
    const customer = makeCustomer({ firstName: "Alice", lastName: "" });
    expect(getCustomerDisplayName(customer)).toBe("Alice");
  });

  it("returns trimmed last name only when firstName is empty", () => {
    const customer = makeCustomer({ firstName: "", lastName: "Smith" });
    expect(getCustomerDisplayName(customer)).toBe("Smith");
  });

  it("returns '-' when both firstName and lastName are empty", () => {
    const customer = makeCustomer({ firstName: "", lastName: "" });
    expect(getCustomerDisplayName(customer)).toBe("-");
  });

  it("falls through to name logic when COMPANY has no companyName", () => {
    const customer = makeCustomer({
      customerType: "COMPANY",
      companyName: undefined,
      firstName: "John",
      lastName: "Doe",
    });
    expect(getCustomerDisplayName(customer)).toBe("John Doe");
  });

  it("falls through to name logic when DEALERSHIP has no dealershipName", () => {
    const customer = makeCustomer({
      customerType: "DEALERSHIP",
      dealershipName: undefined,
      firstName: "Jane",
      lastName: "Smith",
    });
    expect(getCustomerDisplayName(customer)).toBe("Jane Smith");
  });
});
