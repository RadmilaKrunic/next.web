import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("./action", () => ({
  postDiagnosticPricing: vi.fn().mockResolvedValue({ materials: [], summaries: [] }),
}));

import { useDiagnosticPricing } from "./hooks";
import { postDiagnosticPricing } from "./action";
import type { DiagnosticPricingRequest } from "./diagnosticPricing.types";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

const request: DiagnosticPricingRequest = {
  actionType: "REPAIR",
  jobType: "CHARGEABLE",
  trigger: "quantity",
  materials: [],
};

describe("useDiagnosticPricing", () => {
  it("calls postDiagnosticPricing with the jobId and mutation payload", async () => {
    const { result } = renderHook(() => useDiagnosticPricing("J1"), { wrapper: makeWrapper() });
    result.current.mutate(request);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(postDiagnosticPricing).toHaveBeenCalledWith("J1", request);
  });

  it("invokes the onSuccess callback with the response", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useDiagnosticPricing("J1", onSuccess), {
      wrapper: makeWrapper(),
    });
    result.current.mutate(request);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // useMutation's onSuccess is called as (data, variables, context) — only assert on data.
    expect(onSuccess.mock.calls[0][0]).toEqual({ materials: [], summaries: [] });
  });
});
