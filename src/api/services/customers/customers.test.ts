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
  getCustomerJobs,
  getCustomerOrders,
} from "./customers";

const mockCustomers = [{ id: "1", firstName: "John", lastName: "Doe" }];
const mockCustomer = { id: "1", firstName: "John", lastName: "Doe" };

beforeEach(() => vi.clearAllMocks());

describe("getCustomerJobs", () => {
  it("fetches a customer jobs page with search and pagination params", async () => {
    const page = { number: 0, totalElements: 1, totalPages: 1, size: 10 };
    const content = [
      {
        jobId: "job-1",
        orderId: "order-1",
        serialNumber: "SN-1",
        assetName: "Drill",
        createdOn: "2026-09-01T00:00:00Z",
        updatedOn: "2026-09-02T00:00:00Z",
        assigneeName: "Pat",
        status: "COMPLETED",
      },
    ];
    const response = { page, content };
    mockGet.mockResolvedValueOnce({ data: response });

    await expect(
      getCustomerJobs("client-123", { searchTerm: "drill", page: 1, size: 20 }),
    ).resolves.toEqual(response);
    expect(mockGet).toHaveBeenCalledWith("/client-123/jobs", {
      params: { searchTerm: "drill", page: 1, size: 20 },
    });
  });

  it("uses backend defaults and omits blank search terms", async () => {
    mockGet.mockResolvedValueOnce({ data: { page: {}, content: [] } });

    await getCustomerJobs("client-123", { searchTerm: "   " });

    expect(mockGet).toHaveBeenCalledWith("/client-123/jobs", {
      params: { searchTerm: undefined, page: 0, size: 10 },
    });
  });
});

describe("getCustomerOrders", () => {
  it("fetches the requested customer order page", async () => {
    const response = {
      page: { number: 1, totalElements: 23, totalPages: 3, size: 10 },
      content: [
        {
          orderId: "order-1",
          assets: 2,
          createdOn: "2026-09-01T00:00:00Z",
          updatedOn: "2026-09-02T00:00:00Z",
        },
      ],
    };
    mockGet.mockResolvedValueOnce({ data: response });

    await expect(
      getCustomerOrders("client-123", { searchTerm: "order", page: 1, size: 10 }),
    ).resolves.toEqual(response);
    expect(mockGet).toHaveBeenCalledWith("/client-123/orders", {
      params: { searchTerm: "order", page: 1, size: 10 },
    });
  });

  it("uses backend defaults and omits blank search terms", async () => {
    mockGet.mockResolvedValueOnce({ data: { page: {}, content: [] } });

    await getCustomerOrders("client-123", { searchTerm: "   " });

    expect(mockGet).toHaveBeenCalledWith("/client-123/orders", {
      params: { searchTerm: undefined, page: 0, size: 10 },
    });
  });
});

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
