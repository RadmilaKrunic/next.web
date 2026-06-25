import { describe, it, expect, vi } from "vitest";
import { fetchFooterData } from "./action";

vi.mock("../../axios-client/axiosClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    defaults: { baseURL: "http://localhost", headers: {} },
  },
}));

import axiosClient from "../../axios-client/axiosClient";

const mockGet = vi.mocked(axiosClient.get);

describe("fetchFooterData", () => {
  it("returns footer data on success", async () => {
    mockGet.mockResolvedValueOnce({
      data: { links: [{ name: "imprintLink", value: "https://www.bosch.com/imprint" }] },
    });
    const result = await fetchFooterData();
    expect(result).toEqual({
      links: [{ name: "imprintLink", value: "https://www.bosch.com/imprint" }],
    });
    expect(mockGet).toHaveBeenCalledWith("/v1/footer");
  });

  it("throws on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("Network error"));
    await expect(fetchFooterData()).rejects.toThrow("Network error");
  });
});
