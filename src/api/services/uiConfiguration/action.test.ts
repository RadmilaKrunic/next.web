import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/axios-client/axiosClient", () => ({
  default: { get: vi.fn() },
}));

// Force non-DEV mode so the local file branch is skipped
vi.stubEnv("DEV", false);

import axiosClient from "api/axios-client/axiosClient";
import { getUIConfiguration } from "./action";

const mockGet = vi.mocked(axiosClient.get);

describe("getUIConfiguration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls API with correct country code", async () => {
    mockGet.mockResolvedValueOnce({ data: { forms: [] } });
    const result = await getUIConfiguration("ZA");
    expect(mockGet).toHaveBeenCalledWith("/v1/countries/ZA/ui-configuration");
    expect(result).toEqual({ forms: [] });
  });

  it("throws on API error", async () => {
    mockGet.mockRejectedValueOnce(new Error("Network Error"));
    await expect(getUIConfiguration("ZA")).rejects.toThrow("Network Error");
  });
});
