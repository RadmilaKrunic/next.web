import { describe, it, expect, vi, beforeEach } from "vitest";
import { getClientColumns } from "./ClientsListColumns.config";
import { getCustomerNameWithIcon } from "utils/customerUtils";
import type { ClientManagementCustomer } from "api/services/clientManagement/clientManagement.types";

vi.mock("utils/customerUtils", () => ({
  getCustomerNameWithIcon: vi.fn(),
}));

const mockGetCustomerNameWithIcon = vi.mocked(getCustomerNameWithIcon);

const t = (key: string) => key;

const baseCustomer: ClientManagementCustomer = {
  customerId: "cust-1",
  customerType: "individual",
  name: "John Doe",
  primaryEmail: "john@example.com",
  phoneNumber: "+385 91 123 4567",
  assetCount: 3,
};

describe("getClientColumns", () => {
  beforeEach(() => {
    mockGetCustomerNameWithIcon.mockReset();
  });

  it("returns exactly 4 columns with the expected keys and order", () => {
    const columns = getClientColumns(t);

    expect(columns.map((c) => c.key)).toEqual(["name", "email", "phoneNumber", "assetsCount"]);
  });

  it("uses the translation function to build each label", () => {
    const columns = getClientColumns(t);

    expect(columns.find((c) => c.key === "name")?.label).toBe("clientName");
    expect(columns.find((c) => c.key === "email")?.label).toBe("email");
    expect(columns.find((c) => c.key === "phoneNumber")?.label).toBe("phoneNumber");
    expect(columns.find((c) => c.key === "assetsCount")?.label).toBe("assetsCount");
  });

  it("calls getCustomerNameWithIcon with customerType and firstName", () => {
    mockGetCustomerNameWithIcon.mockReturnValue("rendered-name");
    const columns = getClientColumns(t);
    const nameColumn = columns.find((c) => c.key === "name")!;

    expect(nameColumn.render(baseCustomer)).toBe("rendered-name");
    expect(mockGetCustomerNameWithIcon).toHaveBeenCalledWith({
      customerType: baseCustomer.customerType,
      firstName: baseCustomer.name,
    });
  });

  it("returns the primary email when present", () => {
    const columns = getClientColumns(t);
    const emailColumn = columns.find((c) => c.key === "email")!;

    expect(emailColumn.render(baseCustomer)).toBe("john@example.com");
  });

  it("falls back to '-' when primaryEmail is empty", () => {
    const columns = getClientColumns(t);
    const emailColumn = columns.find((c) => c.key === "email")!;
    const customer = { ...baseCustomer, primaryEmail: "" };

    expect(emailColumn.render(customer)).toBe("-");
  });

  it("returns the phone number when present", () => {
    const columns = getClientColumns(t);
    const phoneColumn = columns.find((c) => c.key === "phoneNumber")!;

    expect(phoneColumn.render(baseCustomer)).toBe("+385 91 123 4567");
  });

  it("falls back to '-' when phoneNumber is empty", () => {
    const columns = getClientColumns(t);
    const phoneColumn = columns.find((c) => c.key === "phoneNumber")!;
    const customer = { ...baseCustomer, phoneNumber: "" };

    expect(phoneColumn.render(customer)).toBe("-");
  });

  it("returns the stringified asset count when present", () => {
    const columns = getClientColumns(t);
    const assetsColumn = columns.find((c) => c.key === "assetsCount")!;

    expect(assetsColumn.render(baseCustomer)).toBe("3");
  });

  it("returns '0' when assetCount is 0", () => {
    const columns = getClientColumns(t);
    const assetsColumn = columns.find((c) => c.key === "assetsCount")!;
    const customer = { ...baseCustomer, assetCount: 0 } as ClientManagementCustomer;

    expect(assetsColumn.render(customer)).toBe("0");
  });

  it("falls back to '-' when assetCount is undefined at runtime", () => {
    const columns = getClientColumns(t);
    const assetsColumn = columns.find((c) => c.key === "assetsCount")!;
    const customer = {
      ...baseCustomer,
      assetCount: undefined,
    } as unknown as ClientManagementCustomer;

    expect(assetsColumn.render(customer)).toBe("-");
  });
});
