import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/axios-client/axiosClient", () => ({
  default: { get: vi.fn() },
}));

// Force non-DEV mode so the local file branch is skipped, mirroring
// uiConfiguration/action.test.ts's pattern for testing the real-API branch.
vi.stubEnv("DEV", false);

import axiosClient from "api/axios-client/axiosClient";
import { getItemPolicyConfig } from "./action";

const mockGet = vi.mocked(axiosClient.get);

describe("getItemPolicyConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the API with the correct country code when not in DEV mode", async () => {
    mockGet.mockResolvedValueOnce({ data: { countryCode: "ZA" } });
    const result = await getItemPolicyConfig("ZA");
    expect(mockGet).toHaveBeenCalledWith("/v1/countries/ZA/item-policy");
    expect(result).toEqual({ countryCode: "ZA" });
  });

  it("throws on API error", async () => {
    mockGet.mockRejectedValueOnce(new Error("Network Error"));
    await expect(getItemPolicyConfig("ZA")).rejects.toThrow("Network Error");
  });
});
