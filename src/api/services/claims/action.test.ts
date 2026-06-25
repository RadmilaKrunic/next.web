import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchClaimById,
  fetchClaims,
  postClaimDecision,
  postBulkApproveClaims,
  putClaimPrices,
  patchClaimStatusPending,
} from "./action";

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
const mockPost = vi.mocked(axiosClient.post);
const mockPut = vi.mocked(axiosClient.put);
const mockPatch = vi.mocked(axiosClient.patch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchClaimById", () => {
  it("returns claim data", async () => {
    mockGet.mockResolvedValueOnce({ data: { claimId: "C001" } });
    const result = await fetchClaimById("C001");
    expect(result).toEqual({ claimId: "C001" });
    expect(mockGet).toHaveBeenCalledWith("/v1/claims/C001");
  });

  it("throws on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("not found"));
    await expect(fetchClaimById("C001")).rejects.toThrow("not found");
  });
});

describe("fetchClaims", () => {
  it("returns claims array", async () => {
    mockGet.mockResolvedValueOnce({ data: { claims: [{ claimId: "C001" }] } });
    const result = await fetchClaims();
    expect(result).toEqual([{ claimId: "C001" }]);
  });

  it("returns empty array when claims is null", async () => {
    mockGet.mockResolvedValueOnce({ data: { claims: null } });
    const result = await fetchClaims();
    expect(result).toEqual([]);
  });

  it("throws on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("fetch failed"));
    await expect(fetchClaims()).rejects.toThrow("fetch failed");
  });
});

describe("postClaimDecision", () => {
  it("posts decision to correct endpoint", async () => {
    mockPost.mockResolvedValueOnce(undefined);
    await postClaimDecision("C001", { jobId: "J001", message: "OK", decision: "APPROVED" });
    expect(mockPost).toHaveBeenCalledWith("/v1/claims/C001/decision", {
      jobId: "J001",
      message: "OK",
      decision: "APPROVED",
    });
  });

  it("throws on error", async () => {
    mockPost.mockRejectedValueOnce(new Error("post failed"));
    await expect(
      postClaimDecision("C001", { jobId: "J001", message: "", decision: "REJECTED" }),
    ).rejects.toThrow("post failed");
  });
});

describe("postBulkApproveClaims", () => {
  it("posts claim IDs for bulk approve", async () => {
    mockPost.mockResolvedValueOnce(undefined);
    await postBulkApproveClaims(["C001", "C002"]);
    expect(mockPost).toHaveBeenCalledWith("/v1/claims/bulk-approve", {
      claimIds: ["C001", "C002"],
    });
  });

  it("throws on error", async () => {
    mockPost.mockRejectedValueOnce(new Error("bulk failed"));
    await expect(postBulkApproveClaims(["C001"])).rejects.toThrow("bulk failed");
  });
});

describe("putClaimPrices", () => {
  it("puts price data and returns response", async () => {
    mockPut.mockResolvedValueOnce({ data: { updated: true } });
    const result = await putClaimPrices("C001", { total: 100 });
    expect(result).toEqual({ updated: true });
    expect(mockPut).toHaveBeenCalledWith("/v1/claims/C001/prices", { total: 100 });
  });

  it("throws on error", async () => {
    mockPut.mockRejectedValueOnce(new Error("put failed"));
    await expect(putClaimPrices("C001", {})).rejects.toThrow("put failed");
  });
});

describe("patchClaimStatusPending", () => {
  it("patches status to pending without jobId", async () => {
    mockPatch.mockResolvedValueOnce(undefined);
    await patchClaimStatusPending("C001");
    expect(mockPatch).toHaveBeenCalledWith("/v1/claims/C001/status/pending", undefined, undefined);
  });

  it("patches with jobId param when provided", async () => {
    mockPatch.mockResolvedValueOnce(undefined);
    await patchClaimStatusPending("C001", "J001");
    expect(mockPatch).toHaveBeenCalledWith("/v1/claims/C001/status/pending", undefined, {
      params: { jobId: "J001" },
    });
  });

  it("throws on error", async () => {
    mockPatch.mockRejectedValueOnce(new Error("patch failed"));
    await expect(patchClaimStatusPending("C001")).rejects.toThrow("patch failed");
  });
});
