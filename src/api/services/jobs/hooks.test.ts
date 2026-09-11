import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("./action", () => ({
  fetchJobs: vi.fn().mockResolvedValue([]),
  fetchJobById: vi.fn().mockResolvedValue({ id: "j1" }),
  fetchMessages: vi.fn().mockResolvedValue([]),
  fetchJobMessages: vi.fn().mockResolvedValue([]),
  patchJobByJobId: vi.fn().mockResolvedValue(undefined),
  fetchDiagnosticByJobId: vi.fn().mockResolvedValue({}),
  fetchSpecialMaterials: vi.fn().mockResolvedValue([]),
  postJobStatus: vi.fn().mockResolvedValue(undefined),
  postCustomerData: vi.fn().mockResolvedValue(undefined),
  postJobStatusStartDiagnostic: vi.fn().mockResolvedValue(undefined),
  postToggleJobHold: vi.fn().mockResolvedValue(undefined),
  postRepairApproval: vi.fn().mockResolvedValue(undefined),
  postInternalApprovalRequest: vi.fn().mockResolvedValue(undefined),
  postStartReview: vi.fn().mockResolvedValue(undefined),
  postStartRepair: vi.fn().mockResolvedValue(undefined),
  postFinishRepair: vi.fn().mockResolvedValue(undefined),
  postToolDelivered: vi.fn().mockResolvedValue(undefined),
  postValidateAndSave: vi.fn().mockResolvedValue({ valid: true }),
  postDiagnostic: vi.fn().mockResolvedValue(undefined),
  postCreateCostEstimate: vi.fn().mockResolvedValue(undefined),
  postCustomerAnswer: vi.fn().mockResolvedValue(undefined),
  updateJobAttachments: vi.fn().mockResolvedValue(undefined),
  postRepairApproval2: vi.fn().mockResolvedValue(undefined),
}));

import {
  useJobs,
  useJobById,
  useMessages,
  usePatchJobById,
  useDiagnosticByJobId,
  usePostJobStatus,
  useSpecialMaterials,
  usePostJobStatusStartDiagnostic,
  useToggleJobHold,
  usePostRepairApproval,
  usePostInternalApprovalRequest,
  usePostStartReview,
  usePostStartRepair,
  usePostFinishRepair,
  usePostToolDelivered,
  usePostValidateAndSave,
  usePostDiagnostic,
  usePostCreateCostEstimate,
  usePostCustomerAnswer,
  useUpdateJobAttachments,
} from "./hooks";
import {
  fetchJobs,
  fetchJobById,
  postJobStatus,
  patchJobByJobId,
  fetchSpecialMaterials,
  postJobStatusStartDiagnostic,
  postToggleJobHold,
  postRepairApproval,
  postInternalApprovalRequest,
  postStartReview,
  postStartRepair,
  postFinishRepair,
  postToolDelivered,
  postValidateAndSave,
  postDiagnostic,
  postCreateCostEstimate,
  postCustomerAnswer,
  updateJobAttachments,
} from "./action";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("useJobs", () => {
  it("fetches and returns jobs sorted by createdAt desc", async () => {
    vi.mocked(fetchJobs).mockResolvedValue([
      { jobId: "1", createdAt: "2023-01-01" },
      { jobId: "2", createdAt: "2023-06-01" },
    ] as never);
    const { result } = renderHook(() => useJobs(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].jobId).toBe("2");
  });
});

describe("useJobById", () => {
  it("fetches job by id when jobId is provided", async () => {
    vi.mocked(fetchJobById).mockResolvedValue({ id: "j1" } as never);
    const { result } = renderHook(() => useJobById("j1"), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchJobById).toHaveBeenCalledWith("j1");
  });

  it("is disabled when jobId is empty", () => {
    const { result } = renderHook(() => useJobById(""), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useMessages", () => {
  it("fetches job messages when jobId provided", async () => {
    const { result } = renderHook(() => useMessages("j1"), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("is disabled when jobId is empty", () => {
    const { result } = renderHook(() => useMessages(""), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("usePatchJobById", () => {
  it("calls patchJobByJobId on mutate", async () => {
    vi.mocked(patchJobByJobId).mockResolvedValue(undefined);
    const { result } = renderHook(() => usePatchJobById(), { wrapper: makeWrapper() });
    result.current.mutate({ jobId: "j1", data: { status: "DRAFT" } } as never);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(patchJobByJobId).toHaveBeenCalledWith("j1", { status: "DRAFT" });
  });
});

describe("useDiagnosticByJobId", () => {
  it("fetches diagnostic when jobId provided", async () => {
    const { result } = renderHook(() => useDiagnosticByJobId("j1"), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("is disabled when jobId empty", () => {
    const { result } = renderHook(() => useDiagnosticByJobId(""), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("usePostJobStatus", () => {
  it("calls postJobStatus on mutate", async () => {
    vi.mocked(postJobStatus).mockResolvedValue(undefined);
    const { result } = renderHook(() => usePostJobStatus(), { wrapper: makeWrapper() });
    result.current.mutate({ jobId: "j1", jobStatus: "DRAFT" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(postJobStatus).toHaveBeenCalledWith("j1", "DRAFT");
  });
});

describe("useSpecialMaterials", () => {
  it("fetches special materials for country", async () => {
    vi.mocked(fetchSpecialMaterials).mockResolvedValue([] as never);
    const { result } = renderHook(() => useSpecialMaterials("ZA"), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpecialMaterials).toHaveBeenCalledWith("ZA");
  });

  it("is disabled when countryCode empty", () => {
    const { result } = renderHook(() => useSpecialMaterials(""), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("usePostJobStatusStartDiagnostic", () => {
  it("calls postJobStatusStartDiagnostic on mutate", async () => {
    vi.mocked(postJobStatusStartDiagnostic).mockResolvedValue(undefined);
    const { result } = renderHook(() => usePostJobStatusStartDiagnostic(), {
      wrapper: makeWrapper(),
    });
    result.current.mutate({ jobId: "j1" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useToggleJobHold", () => {
  it("calls postToggleJobHold on mutate", async () => {
    vi.mocked(postToggleJobHold).mockResolvedValue(undefined);
    const { result } = renderHook(() => useToggleJobHold(), { wrapper: makeWrapper() });
    result.current.mutate({ jobId: "j1" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("usePostRepairApproval", () => {
  it("calls postRepairApproval on mutate", async () => {
    vi.mocked(postRepairApproval).mockResolvedValue(undefined);
    const { result } = renderHook(() => usePostRepairApproval(), { wrapper: makeWrapper() });
    result.current.mutate({ jobId: "j1" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("usePostInternalApprovalRequest", () => {
  it("calls postInternalApprovalRequest on mutate", async () => {
    vi.mocked(postInternalApprovalRequest).mockResolvedValue(undefined);
    const { result } = renderHook(() => usePostInternalApprovalRequest(), {
      wrapper: makeWrapper(),
    });
    result.current.mutate({ jobId: "j1" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("usePostStartReview", () => {
  it("calls postStartReview on mutate", async () => {
    vi.mocked(postStartReview).mockResolvedValue(undefined);
    const { result } = renderHook(() => usePostStartReview(), { wrapper: makeWrapper() });
    result.current.mutate({ jobId: "j1" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("usePostStartRepair", () => {
  it("calls postStartRepair on mutate", async () => {
    vi.mocked(postStartRepair).mockResolvedValue(undefined);
    const { result } = renderHook(() => usePostStartRepair(), { wrapper: makeWrapper() });
    result.current.mutate({ jobId: "j1" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("usePostFinishRepair", () => {
  it("calls postFinishRepair on mutate", async () => {
    vi.mocked(postFinishRepair).mockResolvedValue(undefined);
    const { result } = renderHook(() => usePostFinishRepair(), { wrapper: makeWrapper() });
    result.current.mutate({ jobId: "j1" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("usePostToolDelivered", () => {
  it("calls postToolDelivered on mutate", async () => {
    vi.mocked(postToolDelivered).mockResolvedValue(undefined);
    const { result } = renderHook(() => usePostToolDelivered(), { wrapper: makeWrapper() });
    result.current.mutate({ jobId: "j1" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("usePostValidateAndSave", () => {
  it("calls postValidateAndSave on mutate", async () => {
    vi.mocked(postValidateAndSave).mockResolvedValue({ valid: true } as never);
    const { result } = renderHook(() => usePostValidateAndSave(), { wrapper: makeWrapper() });
    result.current.mutate({ jobId: "j1", payload: {} });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("usePostDiagnostic", () => {
  it("calls postDiagnostic on mutate", async () => {
    vi.mocked(postDiagnostic).mockResolvedValue(undefined);
    const { result } = renderHook(() => usePostDiagnostic(), { wrapper: makeWrapper() });
    result.current.mutate({ jobId: "j1", payload: {} });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("usePostCreateCostEstimate", () => {
  it("calls postCreateCostEstimate on mutate", async () => {
    vi.mocked(postCreateCostEstimate).mockResolvedValue(undefined);
    const { result } = renderHook(() => usePostCreateCostEstimate(), { wrapper: makeWrapper() });
    result.current.mutate({ jobId: "j1" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("usePostCustomerAnswer", () => {
  it("calls postCustomerAnswer on mutate", async () => {
    vi.mocked(postCustomerAnswer).mockResolvedValue(undefined);
    const { result } = renderHook(() => usePostCustomerAnswer(), { wrapper: makeWrapper() });
    result.current.mutate({ jobId: "j1", answer: "yes" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateJobAttachments", () => {
  it("calls updateJobAttachments on mutate", async () => {
    vi.mocked(updateJobAttachments).mockResolvedValue(undefined);
    const { result } = renderHook(() => useUpdateJobAttachments(), { wrapper: makeWrapper() });
    result.current.mutate({ jobId: "j1", attachments: [] });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
