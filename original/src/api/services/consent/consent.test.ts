import { describe, it, expect, vi } from "vitest";

vi.mock("../../axios-client/axiosClient", () => ({
  default: {
    put: vi.fn(),
    defaults: { baseURL: "" },
  },
}));

import axiosClient from "../../axios-client/axiosClient";
import { postConsentAccept } from "./action";

const mockPut = vi.mocked(axiosClient.put);

describe("postConsentAccept", () => {
  it("sends consent accept payload", async () => {
    const payload = {
      acceptedTacVersion: "v1",
      acceptedPrivacyVersion: null,
      locale: "en-TR",
    };

    mockPut.mockResolvedValueOnce({} as never);

    await postConsentAccept(payload);

    expect(mockPut).toHaveBeenCalledWith("/v1/users/consent/accept", payload);
  });

  it("throws on error", async () => {
    mockPut.mockRejectedValueOnce(new Error("request failed"));

    await expect(
      postConsentAccept({
        acceptedTacVersion: "v1",
        acceptedPrivacyVersion: null,
        locale: "en-TR",
      }),
    ).rejects.toThrow("request failed");
  });
});
