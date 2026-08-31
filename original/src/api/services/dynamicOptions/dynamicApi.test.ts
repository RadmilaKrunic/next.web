import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/axios-client/axiosClient", () => ({
  default: {
    request: vi.fn(),
    defaults: { baseURL: "http://localhost", headers: {} },
  },
}));

import { fetchDynamicOptions } from "./dynamicApi";
import axiosClient from "api/axios-client/axiosClient";

const mockRequest = vi.mocked(axiosClient.request);

beforeEach(() => vi.clearAllMocks());

describe("fetchDynamicOptions", () => {
  it("returns options on success", async () => {
    const options = [
      { value: "OPT1", name: "Option 1" },
      { value: "OPT2", name: "Option 2" },
    ];
    mockRequest.mockResolvedValueOnce({ data: options });

    const result = await fetchDynamicOptions("/fault-codes", "GET");
    expect(result).toEqual(options);
    expect(mockRequest).toHaveBeenCalledWith({
      url: "v1/fault-codes",
      method: "GET",
      params: {},
    });
  });

  it("passes query params correctly", async () => {
    mockRequest.mockResolvedValueOnce({ data: [] });
    await fetchDynamicOptions("/parts", "GET", [
      { key: "country", value: "ZA" },
      { key: "lang", value: "en" },
    ]);
    expect(mockRequest).toHaveBeenCalledWith({
      url: "v1/parts",
      method: "GET",
      params: { country: "ZA", lang: "en" },
    });
  });

  it("handles undefined queryParams", async () => {
    mockRequest.mockResolvedValueOnce({ data: [] });
    await fetchDynamicOptions("/options", "POST", undefined);
    expect(mockRequest).toHaveBeenCalledWith({
      url: "v1/options",
      method: "POST",
      params: {},
    });
  });

  it("throws on request error", async () => {
    mockRequest.mockRejectedValueOnce(new Error("Network error"));
    await expect(fetchDynamicOptions("/parts", "GET")).rejects.toThrow("Network error");
  });
});
