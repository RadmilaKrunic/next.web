import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({ get: mockGet, post: mockPost, defaults: {} })),
    isAxiosError: vi.fn(),
  },
  isAxiosError: vi.fn(),
}));

vi.mock("../../axios-client/axiosClient", () => ({
  default: {
    defaults: { baseURL: "http://localhost", headers: {} },
  },
}));

import {
  getOrderById,
  createOrder,
  getManufacturedDate,
  getOrderReceipt,
  getSparePartsSearch,
  postWarrantyCheck,
} from "./orders";
import { Order } from "./orders.types";

const mockOrder: Partial<Order> = { id: "O001" } as Partial<Order>;

beforeEach(() => vi.clearAllMocks());

describe("getOrderById", () => {
  it("returns order on success", async () => {
    mockGet.mockResolvedValueOnce({ data: mockOrder });
    const result = await getOrderById("O001");
    expect(result).toEqual(mockOrder);
    expect(mockGet).toHaveBeenCalledWith("/O001");
  });

  it("returns null on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("fail"));
    const result = await getOrderById("O001");
    expect(result).toBeNull();
  });
});

describe("createOrder", () => {
  it("returns created order on success", async () => {
    mockPost.mockResolvedValueOnce({ data: mockOrder });
    const result = await createOrder(true, mockOrder as Order);
    expect(result).toEqual(mockOrder);
    expect(mockPost).toHaveBeenCalledWith("", mockOrder, { params: { isDraft: true } });
  });

  it("returns null on error", async () => {
    mockPost.mockRejectedValueOnce(new Error("fail"));
    const result = await createOrder(false, mockOrder as Order);
    expect(result).toBeNull();
  });
});

describe("getManufacturedDate", () => {
  it("returns manufacture date on success", async () => {
    mockGet.mockResolvedValueOnce({ data: { manufactureDate: "2023-01-15" } });
    const result = await getManufacturedDate("SN123");
    expect(result).toBe("2023-01-15");
  });

  it("returns null on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("fail"));
    const result = await getManufacturedDate("SN123");
    expect(result).toBeNull();
  });
});

describe("getOrderReceipt", () => {
  it("returns blob on success", async () => {
    const blob = new Blob(["pdf content"], { type: "application/pdf" });
    mockGet.mockResolvedValueOnce({ data: blob });
    const result = await getOrderReceipt("O001");
    expect(result).toBeInstanceOf(Blob);
  });

  it("returns null on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("fail"));
    const result = await getOrderReceipt("O001");
    expect(result).toBeNull();
  });
});

describe("getSparePartsSearch", () => {
  it("returns spare parts with notBelongsToTool flag on success", async () => {
    const mockSparePartsData = [
      { partNumber: "SP001", description: "Part 1", price: 100, notBelongsToTool: false },
      { partNumber: "SP002", description: "Part 2", price: 200, notBelongsToTool: true },
    ];
    mockGet.mockResolvedValueOnce({ data: mockSparePartsData });
    const result = await getSparePartsSearch({
      bareToolNumber: "BT001",
      tradeName: "Drill",
      countryCode: "ZA",
      languageCode: "en",
    });
    expect(result).toEqual(mockSparePartsData);
    expect(result?.[0]?.notBelongsToTool).toBe(false);
    expect(result?.[1]?.notBelongsToTool).toBe(true);
  });

  it("returns spare parts without optional params", async () => {
    const mockSparePartsData = [
      { partNumber: "SP003", description: "Part 3", price: 150, notBelongsToTool: false },
    ];
    mockGet.mockResolvedValueOnce({ data: mockSparePartsData });
    const result = await getSparePartsSearch({ bareToolNumber: "BT001", tradeName: "Drill" });
    expect(result).toEqual(mockSparePartsData);
  });

  it("accepts all optional parameters", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await getSparePartsSearch({
      bareToolNumber: "BT001",
      tradeName: "Drill",
      countryCode: "ZA",
      languageCode: "en",
      brand: "BOSCH",
      size: 50,
      pageNumber: 2,
      isExchange: true,
      bareTool: "BT123",
      position: "SP",
    });
    expect(mockGet).toHaveBeenCalled();
    const callArgs = mockGet.mock.calls[0];
    const params = callArgs?.[1]?.params;
    expect(params?.brand).toBe("BOSCH");
    expect(params?.size).toBe(50);
    expect(params?.pageNumber).toBe(2);
    expect(params?.isExchange).toBe(true);
    expect(params?.bareTool).toBe("BT123");
    expect(params?.position).toBe("SP");
  });

  it("returns null on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("fail"));
    const result = await getSparePartsSearch({ bareToolNumber: "BT001", tradeName: "Drill" });
    expect(result).toBeNull();
  });
});

describe("postWarrantyCheck", () => {
  it("returns warranty evaluation on success", async () => {
    const payload = {
      brand: "BOSCH",
      country: "DE",
      bareToolNumber: "1607A350C5",
      serialNumber: "929030435",
      purchaseDate: "2026-06-15",
    };

    const responseBody = {
      evaluationStatus: "ELIGIBLE",
      supportedWarrantyType: "STANDARD_WARRANTY",
      proServiceType: null,
      reasonKey: null,
      expirationDate: "2027-06-15",
      allowedWarrantyRepairCount: 3,
      usedWarrantyRepairCount: 1,
    };

    mockPost.mockResolvedValueOnce({ data: responseBody });
    const result = await postWarrantyCheck(payload);
    expect(result).toEqual(responseBody);
    expect(mockPost).toHaveBeenCalledWith(expect.stringContaining("warranty-check"), payload);
  });

  it("returns null on error", async () => {
    mockPost.mockRejectedValueOnce(new Error("fail"));
    const result = await postWarrantyCheck({
      brand: "BOSCH",
      country: "DE",
      bareToolNumber: "1607A350C5",
      serialNumber: "929030435",
      purchaseDate: "2026-06-15",
    });
    expect(result).toBeNull();
  });
});
