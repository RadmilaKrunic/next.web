import { describe, it, expect, vi } from "vitest";
import { fetchSideNavItems } from "./action";

vi.mock("../../axios-client/axiosClient", () => ({
  default: {
    get: vi.fn(),
    defaults: { baseURL: "http://localhost", headers: {} },
  },
}));

import axiosClient from "../../axios-client/axiosClient";
const mockGet = vi.mocked(axiosClient.get);

describe("fetchSideNavItems", () => {
  it("returns nav data on success", async () => {
    mockGet.mockResolvedValueOnce({ data: { items: [] } });
    const result = await fetchSideNavItems();
    expect(result).toEqual({ items: [] });
    expect(mockGet).toHaveBeenCalledWith("/v1/users/me/navigation");
  });

  it("throws on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("Network error"));
    await expect(fetchSideNavItems()).rejects.toThrow("Network error");
  });
});
