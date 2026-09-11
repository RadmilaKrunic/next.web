import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/axios-client/axiosClient", () => ({
  default: { post: vi.fn() },
}));

// Force non-DEV mode so the local simulator branch is skipped, mirroring
// uiConfiguration/action.test.ts's pattern for testing the real-API branch.
vi.stubEnv("DEV", false);

import axiosClient from "api/axios-client/axiosClient";
import { postDiagnosticPricing } from "./action";
import type { DiagnosticPricingRequest } from "./diagnosticPricing.types";

const mockPost = vi.mocked(axiosClient.post);

const request: DiagnosticPricingRequest = {
  actionType: "REPAIR",
  jobType: "CHARGEABLE",
  trigger: "quantity",
  triggeredByOrder: 0,
  materials: [],
};

describe("postDiagnosticPricing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not call the API while the backend endpoint isn't ready, and logs the payload instead", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await postDiagnosticPricing("J1", request);
    expect(mockPost).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("J1"), request);
    expect(result.materials).toBeDefined();
    expect(result.summaries).toBeDefined();
    logSpy.mockRestore();
  });

  // Re-enable once BACKEND_ENDPOINT_READY (action.ts) is flipped back to true — this
  // is exactly the assertion to restore, unchanged.
  it.skip("calls the API with the correct jobId and payload when not in DEV mode", async () => {
    mockPost.mockResolvedValueOnce({ data: { materials: [], summaries: [] } });
    const result = await postDiagnosticPricing("J1", request);
    expect(mockPost).toHaveBeenCalledWith("/v1/jobs/J1/diagnostic/price-calculation", request);
    expect(result).toEqual({ materials: [], summaries: [] });
  });

  it.skip("propagates API errors", async () => {
    mockPost.mockRejectedValueOnce(new Error("Network Error"));
    await expect(postDiagnosticPricing("J1", request)).rejects.toThrow("Network Error");
  });
});
