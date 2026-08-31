import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("./action", () => ({
  fetchApprovals: vi.fn().mockResolvedValue([]),
  updateApprovalStatus: vi.fn().mockResolvedValue(undefined),
  approveJobs: vi.fn().mockResolvedValue(undefined),
}));

import { useApprovals, useUpdateApprovalStatus, useApproveJobs } from "./hooks";
import { fetchApprovals, updateApprovalStatus, approveJobs } from "./action";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("useApprovals", () => {
  it("fetches approvals", async () => {
    vi.mocked(fetchApprovals).mockResolvedValue([]);
    const { result } = renderHook(() => useApprovals(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("sorts approvals by createdAt descending", async () => {
    const items = [
      { createdAt: "2024-01-01T00:00:00Z", jobId: "j1" },
      { createdAt: "2024-03-01T00:00:00Z", jobId: "j2" },
      { createdAt: "2024-02-01T00:00:00Z", jobId: "j3" },
    ];
    vi.mocked(fetchApprovals).mockResolvedValue(items as never);
    const { result } = renderHook(() => useApprovals(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].jobId).toBe("j2");
    expect(result.current.data?.[2].jobId).toBe("j1");
  });
});

describe("useUpdateApprovalStatus", () => {
  it("calls updateApprovalStatus on mutate", async () => {
    vi.mocked(updateApprovalStatus).mockResolvedValue(undefined);
    const { result } = renderHook(() => useUpdateApprovalStatus(), { wrapper: makeWrapper() });
    result.current.mutate({ jobId: "j1", decision: "approve" } as never);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateApprovalStatus).toHaveBeenCalled();
  });
});

describe("useApproveJobs", () => {
  it("calls approveJobs with jobIds", async () => {
    vi.mocked(approveJobs).mockResolvedValue(undefined);
    const { result } = renderHook(() => useApproveJobs(), { wrapper: makeWrapper() });
    result.current.mutate({ jobIds: ["j1", "j2"] });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(approveJobs).toHaveBeenCalledWith(["j1", "j2"]);
  });
});
