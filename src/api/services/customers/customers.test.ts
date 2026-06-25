import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGet = vi.hoisted(() => vi.fn());

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({ get: mockGet, defaults: {} })),
    isAxiosError: vi.fn((err) => !!(err && typeof err === "object" && "message" in err)),
  },
  isAxiosError: vi.fn((err) => !!(err && typeof err === "object" && "message" in err)),
}));

vi.mock("../../axios-client/axiosClient", () => ({
  default: {
    defaults: { baseURL: "http://localhost", headers: {} },
  },
}));

import {
  getCustomerByFirstName,
  getCustomerByLastName,
  getCustomerByDealershipName,
  getCustomerByCompanyName,
} from "./customers";

const mockCustomers = [{ id: "1", firstName: "John", lastName: "Doe" }];

beforeEach(() => vi.clearAllMocks());

describe("getCustomerByFirstName", () => {
  it("returns customers on success", async () => {
    mockGet.mockResolvedValueOnce({ data: mockCustomers });
    const result = await getCustomerByFirstName("ASC01", "John");
    expect(result).toEqual(mockCustomers);
    expect(mockGet).toHaveBeenCalledWith("/search/ASC01", { params: { firstName: "John" } });
  });

  it("throws error with message on failure", async () => {
    mockGet.mockRejectedValueOnce({ message: "Network error" });
    await expect(getCustomerByFirstName("ASC01", "John")).rejects.toThrow(
      "Error fetching customer by first name:",
    );
  });
});

describe("getCustomerByLastName", () => {
  it("returns customers on success", async () => {
    mockGet.mockResolvedValueOnce({ data: mockCustomers });
    const result = await getCustomerByLastName("ASC01", "Doe");
    expect(result).toEqual(mockCustomers);
    expect(mockGet).toHaveBeenCalledWith("/search/ASC01", { params: { lastName: "Doe" } });
  });

  it("throws error on failure", async () => {
    mockGet.mockRejectedValueOnce({ message: "fail" });
    await expect(getCustomerByLastName("ASC01", "Doe")).rejects.toThrow(
      "Error fetching customer by last name:",
    );
  });
});

describe("getCustomerByDealershipName", () => {
  it("returns customers on success", async () => {
    mockGet.mockResolvedValueOnce({ data: mockCustomers });
    const result = await getCustomerByDealershipName("ASC01", "Bosch Dealer");
    expect(result).toEqual(mockCustomers);
    expect(mockGet).toHaveBeenCalledWith("/search/ASC01", {
      params: { dealershipName: "Bosch Dealer" },
    });
  });

  it("throws error on failure", async () => {
    mockGet.mockRejectedValueOnce({ message: "fail" });
    await expect(getCustomerByDealershipName("ASC01", "Dealer")).rejects.toThrow(
      "Error fetching customer by dealership name:",
    );
  });
});

describe("getCustomerByCompanyName", () => {
  it("returns customers on success", async () => {
    mockGet.mockResolvedValueOnce({ data: mockCustomers });
    const result = await getCustomerByCompanyName("ASC01", "Bosch GmbH");
    expect(result).toEqual(mockCustomers);
    expect(mockGet).toHaveBeenCalledWith("/search/ASC01", {
      params: { companyName: "Bosch GmbH" },
    });
  });

  it("throws error on failure", async () => {
    mockGet.mockRejectedValueOnce({ message: "fail" });
    await expect(getCustomerByCompanyName("ASC01", "Company")).rejects.toThrow(
      "Error fetching customer by company name:",
    );
  });
});
