import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/axios-client/axiosClient", () => ({
  default: {
    get: vi.fn(),
    defaults: { baseURL: "http://localhost", headers: {} },
  },
}));

import { fetchBareSalesRelation } from "./action";
import axiosClient from "api/axios-client/axiosClient";

const mockGet = vi.mocked(axiosClient.get);

beforeEach(() => vi.clearAllMocks());

describe("fetchBareSalesRelation", () => {
  it("returns data on success", async () => {
    const mockData = { toolId: "T001", salesRelations: [] };
    mockGet.mockResolvedValueOnce({ data: mockData });

    const params = { bareTool: "T001", countryCode: "ZA", language: "en" };
    const result = await fetchBareSalesRelation(params);

    expect(result).toEqual(mockData);
    expect(mockGet).toHaveBeenCalledWith("/v1/bare-sales-relation", { params });
  });

  it("throws on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("Not found"));
    await expect(
      fetchBareSalesRelation({ bareTool: "T001", countryCode: "ZA", language: "en" }),
    ).rejects.toThrow("Not found");
  });
});
