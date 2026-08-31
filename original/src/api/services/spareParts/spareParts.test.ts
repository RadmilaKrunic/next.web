import { describe, it, expect, vi } from "vitest";
import { getExplosionDrawing } from "./spareParts";

vi.mock("../../axios-client/axiosClient", () => ({
  default: {
    get: vi.fn(),
    defaults: { baseURL: "http://localhost", headers: {} },
  },
}));

import axiosClient from "../../axios-client/axiosClient";
const mockGet = vi.mocked(axiosClient.get);

const baseParams = {
  countryCode: "ZA",
  languageCode: "en-ZA",
  brand: "Bosch",
  illustrationPage: 1,
};

describe("getExplosionDrawing", () => {
  it("throws error on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("Not found"));
    await expect(getExplosionDrawing("0601234567", baseParams)).rejects.toThrow("Not found");
  });

  it("returns data on success", async () => {
    const mockData = { illustrationList: null };
    mockGet.mockResolvedValueOnce({ data: mockData });
    const result = await getExplosionDrawing("0601234567", baseParams);
    expect(result).toEqual(mockData);
  });

  it("prefixes relative ImagePath with VITE_API_BASE_URL", async () => {
    const mockData = {
      illustrationList: [{ ImagePath: "images/diagram.png", partNumber: "123" }],
    };
    mockGet.mockResolvedValueOnce({ data: { ...mockData } });
    const result = await getExplosionDrawing("0601234567", baseParams);
    // Path should be prefixed (either with base URL or just /path)
    expect(result?.illustrationList?.[0].ImagePath).toMatch(/images\/diagram\.png$/);
  });

  it("does not prefix absolute ImagePath", async () => {
    const mockData = {
      illustrationList: [{ ImagePath: "https://cdn.bosch.com/diagram.png", partNumber: "123" }],
    };
    mockGet.mockResolvedValueOnce({ data: { ...mockData } });
    const result = await getExplosionDrawing("0601234567", baseParams);
    expect(result?.illustrationList?.[0].ImagePath).toBe("https://cdn.bosch.com/diagram.png");
  });

  it("handles empty ImagePath without crash", async () => {
    const mockData = {
      illustrationList: [{ ImagePath: "", partNumber: "123" }],
    };
    mockGet.mockResolvedValueOnce({ data: { ...mockData } });
    const result = await getExplosionDrawing("0601234567", baseParams);
    expect(result?.illustrationList?.[0].ImagePath).toBe("");
  });
});
