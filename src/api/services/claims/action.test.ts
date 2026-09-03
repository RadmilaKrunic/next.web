import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchClaimById,
  fetchClaims,
  postClaimDecision,
  postBulkApproveClaims,
  putClaimPrices,
  postValidateClaimPrices,
  patchClaimStatusPending,
  saveClaimListColumns,
} from "./action";
import { PutClaimPricesRequest } from "./claims.types";

vi.mock("api/services/itemPolicy/priceEngineSimulator", () => ({
  simulateClaimPriceValidate: vi.fn(),
}));
import { simulateClaimPriceValidate } from "api/services/itemPolicy/priceEngineSimulator";
const mockSimulateClaimPriceValidate = vi.mocked(simulateClaimPriceValidate);

const claimPriceMaterial = {
  position: "SP",
  partNumber: "1600A00ABC",
  description: "Spare part",
  jobType: "CHARGEABLE",
  quantity: 1,
  order: 1,
  isPriceSetManually: false,
  price: {
    discount: 0,
    suggestedNetPrice: 100,
    taxAmount: 20,
    unitPrice: 100,
    netAmount: 100,
    tax: 20,
    grossAmount: 120,
    totalAmount: 120,
  },
};

const putClaimPricesRequestFixture: PutClaimPricesRequest = {
  id: "C001",
  jobId: "J001",
  ascId: "ASC001",
  customerId: "CUST001",
  ascName: "Test ASC",
  diagnosticId: "D001",
  countryCode: "TR",
  actionType: "REPAIR",
  jobType: "CHARGEABLE",
  typeOfUsage: "PRIVATE",
  faultCode: "F001",
  faultCodeDescription: "Fault description",
  faultCodeLabourQuantity: 1,
  exchangeReason: null,
  claimStatus: "REVISED",
  claimNotes: "some note",
  customer: { firstName: "John", lastName: "Doe" },
  job: { jobId: "J001" },
  materials: [claimPriceMaterial],
  archivedMaterials: [],
  claimPriceSummary: {
    netAmount: 100,
    suggestedNetPrice: 100,
    grossAmount: 120,
    discount: 0,
    totalAmount: 120,
    taxAmount: 20,
  },
  jobDiagnostic: undefined,
};

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
    await postBulkApproveClaims({
      claimIds: ["C001", "C002"],
      decision: "APPROVED",
      message: "Approved after bulk review",
    });
    expect(mockPost).toHaveBeenCalledWith("/v1/claims/bulk-approve", {
      claimIds: ["C001", "C002"],
      decision: "APPROVED",
      message: "Approved after bulk review",
    });
  });

  it("throws on error", async () => {
    mockPost.mockRejectedValueOnce(new Error("bulk failed"));
    await expect(
      postBulkApproveClaims({
        claimIds: ["C001"],
        decision: "APPROVED",
        message: "Approved after bulk review",
      }),
    ).rejects.toThrow("bulk failed");
  });
});

describe("putClaimPrices", () => {
  it("puts price data and returns response", async () => {
    mockPut.mockResolvedValueOnce({ data: { updated: true } });
    const result = await putClaimPrices("C001", putClaimPricesRequestFixture);
    expect(result).toEqual({ updated: true });
    expect(mockPut).toHaveBeenCalledWith("/v1/claims/C001/prices", putClaimPricesRequestFixture);
  });

  it("throws on error", async () => {
    mockPut.mockRejectedValueOnce(new Error("put failed"));
    await expect(putClaimPrices("C001", putClaimPricesRequestFixture)).rejects.toThrow(
      "put failed",
    );
  });
});

describe("postValidateClaimPrices", () => {
  const baseline = { materials: [], archivedMaterials: [] };
  const request = { requestId: "req-1", jobId: "J001", diagnosticId: "D001", changedRows: [] };

  it("calls the price-engine simulator in DEV mode, without hitting the network", async () => {
    const simulatedResult = { requestId: "req-1", claim: { ...baseline, priceSummary: {} } };
    mockSimulateClaimPriceValidate.mockReturnValueOnce(simulatedResult as never);

    const result = await postValidateClaimPrices("C001", request, {
      baseline,
      discountBase: "GROSS_PRICE",
    });

    expect(mockSimulateClaimPriceValidate).toHaveBeenCalledWith(
      baseline,
      request,
      "GROSS_PRICE",
      undefined,
    );
    expect(mockPost).not.toHaveBeenCalled();
    expect(result).toBe(simulatedResult);
  });

  it("posts to the real endpoint when not in DEV mode", async () => {
    vi.stubEnv("DEV", false);
    try {
      mockPost.mockResolvedValueOnce({ data: { requestId: "req-1", claim: baseline } });

      const result = await postValidateClaimPrices("C001", request, {
        baseline,
        discountBase: "GROSS_PRICE",
      });

      expect(mockPost).toHaveBeenCalledWith("/v1/claims/C001/prices/validate", request);
      expect(mockSimulateClaimPriceValidate).not.toHaveBeenCalled();
      expect(result).toEqual({ requestId: "req-1", claim: baseline });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("throws on API error when not in DEV mode", async () => {
    vi.stubEnv("DEV", false);
    try {
      mockPost.mockRejectedValueOnce(new Error("fail"));
      await expect(
        postValidateClaimPrices("C001", request, { baseline, discountBase: "GROSS_PRICE" }),
      ).rejects.toThrow("fail");
    } finally {
      vi.unstubAllEnvs();
    }
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

describe("saveClaimListColumns", () => {
  it("posts selected column keys to claim preferences endpoint", async () => {
    mockPost.mockResolvedValueOnce(undefined);
    await saveClaimListColumns([
      { key: "claimId", isChecked: true, isFixed: true, order: 0 },
      { key: "invoiceNumber", isChecked: false, isFixed: false, order: 1 },
      { key: "jobId", isChecked: true, isFixed: true, order: 2 },
    ]);

    expect(mockPost).toHaveBeenCalledWith("/v1/profile/preferences/claim", ["claimId", "jobId"]);
  });

  it("throws on error", async () => {
    mockPost.mockRejectedValueOnce(new Error("save failed"));
    await expect(
      saveClaimListColumns([{ key: "claimId", isChecked: true, isFixed: true, order: 0 }]),
    ).rejects.toThrow("save failed");
  });
});
