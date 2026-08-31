import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchReimbursementASCs,
  fetchReimbursements,
  fetchReimbursementsByAscId,
  fetchReimbursementClaims,
  getReimbursementReceipt,
  generateReimbursement,
} from "./action";

vi.mock("api/axios-client/axiosClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    defaults: { baseURL: "http://localhost", headers: {} },
  },
}));

vi.spyOn(console, "error").mockImplementation(() => undefined);

import axiosClient from "api/axios-client/axiosClient";
const mockGet = vi.mocked(axiosClient.get);
const mockPost = vi.mocked(axiosClient.post);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchReimbursementASCs", () => {
  it("builds url without query params when none provided", async () => {
    mockGet.mockResolvedValueOnce({ data: { content: [] } });
    const result = await fetchReimbursementASCs();
    expect(result).toEqual({ content: [] });
    expect(mockGet).toHaveBeenCalledWith("/v1/reimbursements/service-centers");
  });

  it("builds url with searchTerm, page and size", async () => {
    mockGet.mockResolvedValueOnce({ data: { content: [] } });
    await fetchReimbursementASCs("bosch", 1, 20);
    expect(mockGet).toHaveBeenCalledWith(
      "/v1/reimbursements/service-centers?searchTerm=bosch&page=1&size=20",
    );
  });

  it("throws on API error", async () => {
    mockGet.mockRejectedValueOnce(new Error("network error"));
    await expect(fetchReimbursementASCs()).rejects.toThrow("network error");
  });
});

describe("fetchReimbursements", () => {
  it("builds url without params when none provided", async () => {
    mockGet.mockResolvedValueOnce({ data: { content: [] } });
    await fetchReimbursements();
    expect(mockGet).toHaveBeenCalledWith("/v1/reimbursements");
  });

  it("builds url with date range formatted as yyyy-mm-dd", async () => {
    mockGet.mockResolvedValueOnce({ data: { content: [] } });
    await fetchReimbursements(new Date(2026, 0, 5), new Date(2026, 0, 31), "term", 0, 10);
    expect(mockGet).toHaveBeenCalledWith(
      "/v1/reimbursements?fromDate=2026-01-05&toDate=2026-01-31&searchTerm=term&page=0&size=10",
    );
  });

  it("throws on API error", async () => {
    mockGet.mockRejectedValueOnce(new Error("fetch failed"));
    await expect(fetchReimbursements()).rejects.toThrow("fetch failed");
  });
});

describe("fetchReimbursementsByAscId", () => {
  it("builds url with ascId only", async () => {
    mockGet.mockResolvedValueOnce({ data: { content: [] } });
    await fetchReimbursementsByAscId("asc-1");
    expect(mockGet).toHaveBeenCalledWith("/v1/reimbursements/asc/asc-1");
  });

  it("builds url with all params", async () => {
    mockGet.mockResolvedValueOnce({ data: { content: [] } });
    await fetchReimbursementsByAscId(
      "asc-1",
      new Date(2026, 5, 1),
      new Date(2026, 5, 30),
      "term",
      0,
      10,
    );
    expect(mockGet).toHaveBeenCalledWith(
      "/v1/reimbursements/asc/asc-1?fromDate=2026-06-01&toDate=2026-06-30&searchTerm=term&page=0&size=10",
    );
  });

  it("throws on API error", async () => {
    mockGet.mockRejectedValueOnce(new Error("asc fetch failed"));
    await expect(fetchReimbursementsByAscId("asc-1")).rejects.toThrow("asc fetch failed");
  });
});

describe("fetchReimbursementClaims", () => {
  it("returns reimbursement data", async () => {
    mockGet.mockResolvedValueOnce({ data: { reimbursementId: "R1" } });
    const result = await fetchReimbursementClaims("R1");
    expect(result).toEqual({ reimbursementId: "R1" });
    expect(mockGet).toHaveBeenCalledWith("/v1/reimbursements/R1");
  });

  it("throws on API error", async () => {
    mockGet.mockRejectedValueOnce(new Error("claims fetch failed"));
    await expect(fetchReimbursementClaims("R1")).rejects.toThrow("claims fetch failed");
  });
});

describe("getReimbursementReceipt", () => {
  it("returns blob data", async () => {
    const blob = new Blob(["pdf"]);
    mockGet.mockResolvedValueOnce({ data: blob });
    const result = await getReimbursementReceipt("R1");
    expect(result).toBe(blob);
    expect(mockGet).toHaveBeenCalledWith("/v1/pdf/reimbursement-receipt/R1", {
      responseType: "blob",
      headers: { Accept: "application/pdf" },
    });
  });

  it("returns null on API error", async () => {
    mockGet.mockRejectedValueOnce(new Error("receipt failed"));
    const result = await getReimbursementReceipt("R1");
    expect(result).toBeNull();
  });
});

describe("generateReimbursement", () => {
  const details = {
    serviceCenterIds: ["asc-1"],
    startDate: "2026-01-01",
    endDate: "2026-01-31",
    dryRun: true,
  };

  it("posts reimbursement details and returns data", async () => {
    mockPost.mockResolvedValueOnce({ data: { dryRun: true, approvedClaimCount: 3 } });
    const result = await generateReimbursement(details);
    expect(result).toEqual({ dryRun: true, approvedClaimCount: 3 });
    expect(mockPost).toHaveBeenCalledWith("/v1/reimbursements/generate", details);
  });

  it("throws on API error", async () => {
    mockPost.mockRejectedValueOnce(new Error("generate failed"));
    await expect(generateReimbursement(details)).rejects.toThrow("generate failed");
  });
});
