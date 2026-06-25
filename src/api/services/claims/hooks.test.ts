import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("./action", () => ({
  fetchClaimById: vi.fn().mockResolvedValue({ claimId: "c1", jobId: "j1" }),
  fetchClaims: vi.fn().mockResolvedValue([]),
  postBulkApproveClaims: vi.fn().mockResolvedValue(undefined),
  postClaimDecision: vi.fn().mockResolvedValue(undefined),
  putClaimPrices: vi.fn().mockResolvedValue(undefined),
  patchClaimStatusPending: vi.fn().mockResolvedValue(undefined),
}));

import { useClaimById, useClaims, useClaimDecision, useBulkApproveClaims } from "./hooks";
import { fetchClaimById, fetchClaims, postClaimDecision, postBulkApproveClaims } from "./action";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("useClaimById", () => {
  it("fetches claim by id", async () => {
    const { result } = renderHook(() => useClaimById("c1"), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchClaimById).toHaveBeenCalledWith("c1");
  });

  it("is disabled when claimId is empty", () => {
    const { result } = renderHook(() => useClaimById(""), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useClaims", () => {
  it("fetches and sorts claims by createdOn descending", async () => {
    const items = [
      { claimId: "c1", createdOn: "2024-01-01T00:00:00Z" },
      { claimId: "c3", createdOn: "2024-03-01T00:00:00Z" },
      { claimId: "c2", createdOn: "2024-02-01T00:00:00Z" },
    ];
    vi.mocked(fetchClaims).mockResolvedValue(items as never);
    const { result } = renderHook(() => useClaims(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].claimId).toBe("c3");
    expect(result.current.data?.[2].claimId).toBe("c1");
  });
});

describe("useClaimDecision", () => {
  it("calls postClaimDecision on mutate", async () => {
    vi.mocked(postClaimDecision).mockResolvedValue(undefined);
    const { result } = renderHook(() => useClaimDecision(), { wrapper: makeWrapper() });
    result.current.mutate({
      claimId: "c1",
      payload: { jobId: "j1", decision: "approve" },
    } as never);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(postClaimDecision).toHaveBeenCalled();
  });
});

describe("useBulkApproveClaims", () => {
  it("calls postBulkApproveClaims on mutate", async () => {
    vi.mocked(postBulkApproveClaims).mockResolvedValue(undefined);
    const { result } = renderHook(() => useBulkApproveClaims(), { wrapper: makeWrapper() });
    result.current.mutate({ claimIds: ["c1", "c2"] } as never);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(postBulkApproveClaims).toHaveBeenCalled();
  });
});
