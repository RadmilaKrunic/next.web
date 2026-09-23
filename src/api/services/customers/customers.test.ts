import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGet = vi.hoisted(() => vi.fn());
const mockPut = vi.hoisted(() => vi.fn());

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({ get: mockGet, put: mockPut, defaults: {} })),
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
  getCustomersByAsc,
  getCustomerById,
  createClient,
} from "./customers";

const mockCustomers = [{ id: "1", firstName: "John", lastName: "Doe" }];
const mockCustomer = { id: "1", firstName: "John", lastName: "Doe" };

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

describe("getCustomersByAsc", () => {
  it("returns customers on success", async () => {
    mockGet.mockResolvedValueOnce({ data: mockCustomers });
    const result = await getCustomersByAsc("ASC01");
    expect(result).toEqual(mockCustomers);
    expect(mockGet).toHaveBeenCalledWith("/asc/ASC01");
  });

  it("throws error with axios message on failure", async () => {
    mockGet.mockRejectedValueOnce({ message: "Network error" });
    await expect(getCustomersByAsc("ASC01")).rejects.toThrow(
      "Error fetching customers for ASC: Network error",
    );
  });

  it("throws error with stringified error when not an axios error", async () => {
    mockGet.mockRejectedValueOnce("plain string failure");
    await expect(getCustomersByAsc("ASC01")).rejects.toThrow(
      "Error fetching customers for ASC: plain string failure",
    );
  });
});

describe("getCustomerById", () => {
  it("returns a customer on success", async () => {
    mockGet.mockResolvedValueOnce({ data: mockCustomer });
    const result = await getCustomerById("1");
    expect(result).toEqual(mockCustomer);
    expect(mockGet).toHaveBeenCalledWith("/1");
  });

  it("throws error with message on failure", async () => {
    mockGet.mockRejectedValueOnce({ message: "not found" });
    await expect(getCustomerById("1")).rejects.toThrow("Error fetching customer by id: not found");
  });
});

describe("createClient", () => {
  const payload = {
    clientId: "1",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
  } as never;

  it("sends a PUT request with the payload and returns the updated customer", async () => {
    mockPut.mockResolvedValueOnce({ data: mockCustomer });
    const result = await createClient(payload);
    expect(result).toEqual(mockCustomer);
    expect(mockPut).toHaveBeenCalledWith("/1", payload);
  });

  it("throws error with axios message on failure", async () => {
    mockPut.mockRejectedValueOnce({ message: "duplicate email" });
    await expect(createClient(payload)).rejects.toThrow("Error updating client: duplicate email");
  });

  it("throws error with stringified error when not an axios error", async () => {
    mockPut.mockRejectedValueOnce("plain string failure");
    await expect(createClient(payload)).rejects.toThrow(
      "Error updating client: plain string failure",
    );
  });
});
