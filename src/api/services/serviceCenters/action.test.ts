import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchServiceCenterNames } from "./action";

vi.mock("api/axios-client/axiosClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    defaults: { baseURL: "http://localhost", headers: {} },
  },
}));

import axiosClient from "api/axios-client/axiosClient";
const mockGet = vi.mocked(axiosClient.get);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchServiceCenterNames", () => {
  it("returns service center names", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        serviceCenterNames: [
          { ascId: "ASC8", name: "Altay Elektromekanik Türkiye" },
          { ascId: "ASC9", name: "Turkey Claim service center" },
        ],
      },
    });
    const result = await fetchServiceCenterNames();
    expect(result).toEqual([
      { ascId: "ASC8", name: "Altay Elektromekanik Türkiye" },
      { ascId: "ASC9", name: "Turkey Claim service center" },
    ]);
    expect(mockGet).toHaveBeenCalledWith("/v1/service-centers/names");
  });

  it("throws on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("not found"));
    await expect(fetchServiceCenterNames()).rejects.toThrow("not found");
  });
});
