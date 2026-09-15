import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/axios-client/axiosClient", () => ({
  default: { post: vi.fn() },
}));

// Force non-DEV mode so the local simulator branch is skipped, mirroring
// uiConfiguration/action.test.ts's pattern for testing the real-API branch.
vi.stubEnv("DEV", false);

import axiosClient from "api/axios-client/axiosClient";
import { postDiagnosticPricing } from "./action";
import type { DiagnosticPricingRequestInput } from "./diagnosticPricing.types";

const mockPost = vi.mocked(axiosClient.post);

const payload: DiagnosticPricingRequestInput = {
  pricingContext: { country: "TR", ascId: "ASC8", scale: 2 },
  lines: [],
  changes: { type: "SET_QUANTITY", lineId: "row-0", value: 3 },
};

describe("postDiagnosticPricing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("attaches a generated requestId and does not call the API while the backend endpoint isn't ready, logging the payload instead", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await postDiagnosticPricing("J1", payload);
    expect(mockPost).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("J1"),
      expect.objectContaining({ requestId: expect.any(String), ...payload }),
    );
    expect(result.materials).toBeDefined();
    expect(result.priceSummaryDetailed).toBeDefined();
    logSpy.mockRestore();
  });

  // Re-enable once BACKEND_ENDPOINT_READY (action.ts) is flipped back to true — this
  // is exactly the assertion to restore, unchanged.
  it.skip("calls the API with the correct jobId and payload when not in DEV mode", async () => {
    mockPost.mockResolvedValueOnce({ data: { materials: [], priceSummary: null } });
    const result = await postDiagnosticPricing("J1", payload);
    expect(mockPost).toHaveBeenCalledWith(
      "/v1/jobs/J1/diagnostic/price-calculation",
      expect.objectContaining({ requestId: expect.any(String), ...payload }),
    );
    expect(result).toEqual({ materials: [], priceSummary: null });
  });

  it.skip("propagates API errors", async () => {
    mockPost.mockRejectedValueOnce(new Error("Network Error"));
    await expect(postDiagnosticPricing("J1", payload)).rejects.toThrow("Network Error");
  });
});
