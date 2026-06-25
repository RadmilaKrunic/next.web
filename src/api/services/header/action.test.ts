import { describe, it, expect, vi } from "vitest";

vi.mock("api/axios-client/axiosClient", () => ({
  default: { get: vi.fn(), post: vi.fn(), defaults: { baseURL: "" } },
}));

import axiosClient from "api/axios-client/axiosClient";
import { fetchUserDataFromCookie, updateUserLanguagePreference } from "./action";

const mockGet = vi.mocked(axiosClient.get);
const mockPost = vi.mocked(axiosClient.post);

describe("fetchUserDataFromCookie", () => {
  it("returns user data on success", async () => {
    const user = {
      email: "a@b.com",
      type: "admin",
      ascId: "1",
      firstName: "A",
      lastName: "B",
      roles: [],
      permissions: [],
      countryCode: "ZA",
      language: "en",
    };
    mockGet.mockResolvedValueOnce({ data: user } as never);
    const result = await fetchUserDataFromCookie();
    expect(result).toEqual(user);
    expect(mockGet).toHaveBeenCalledWith("/v1/auth/me");
  });

  it("throws on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("auth failed"));
    await expect(fetchUserDataFromCookie()).rejects.toThrow("auth failed");
  });
});

describe("updateUserLanguagePreference", () => {
  it("posts language preference", async () => {
    mockPost.mockResolvedValueOnce({} as never);
    await updateUserLanguagePreference("en-US");
    expect(mockPost).toHaveBeenCalledWith("/v1/profile", { language: "en-US" });
  });

  it("throws on error", async () => {
    mockPost.mockRejectedValueOnce(new Error("post failed"));
    await expect(updateUserLanguagePreference("en-US")).rejects.toThrow("post failed");
  });
});
