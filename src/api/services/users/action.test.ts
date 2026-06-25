import { describe, it, expect, vi } from "vitest";
import { fetchUsersByAscId } from "./action";

vi.mock("../../axios-client/axiosClient", () => ({
  default: {
    get: vi.fn(),
    defaults: { baseURL: "http://localhost", headers: {} },
  },
}));

import axiosClient from "../../axios-client/axiosClient";
const mockGet = vi.mocked(axiosClient.get);

describe("fetchUsersByAscId", () => {
  it("returns user list on success", async () => {
    mockGet.mockResolvedValueOnce({ data: [{ id: "1", name: "Tech A" }] });
    const result = await fetchUsersByAscId("asc123");
    expect(result).toEqual([{ id: "1", name: "Tech A" }]);
    expect(mockGet).toHaveBeenCalledWith("/v1/users/asc/asc123/technicians");
  });

  it("returns empty array when data is null", async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    const result = await fetchUsersByAscId("asc123");
    expect(result).toEqual([]);
  });

  it("throws on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("Network error"));
    await expect(fetchUsersByAscId("asc123")).rejects.toThrow("Network error");
  });
});
