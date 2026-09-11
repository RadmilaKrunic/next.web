import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/axios-client/axiosClient", () => ({
  default: {
    get: vi.fn(),
    defaults: { baseURL: "http://localhost", headers: {} },
  },
}));

import { getCountryConfig } from "./countryConfiguration";
import axiosClient from "api/axios-client/axiosClient";

const mockGet = vi.mocked(axiosClient.get);

beforeEach(() => vi.clearAllMocks());

describe("getCountryConfig", () => {
  it("returns country config on success", async () => {
    const mockConfig = {
      id: "ZA",
      countryName: "South Africa",
      currency: "ZAR",
      currencySymbol: "R",
    };
    mockGet.mockResolvedValueOnce({ data: mockConfig });

    const result = await getCountryConfig("ZA");
    expect(result).toEqual(mockConfig);
    expect(mockGet).toHaveBeenCalledWith("/v1/countries/ZA/country-configuration");
  });

  it("throws on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("Not found"));
    await expect(getCountryConfig("ZA")).rejects.toThrow("Not found");
  });
});
