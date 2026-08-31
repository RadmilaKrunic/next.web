import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("./action", () => ({
  fetchBareSalesRelation: vi.fn().mockResolvedValue({ results: [] }),
}));

import { useBareSalesRelation } from "./hooks";
import { fetchBareSalesRelation } from "./action";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("useBareSalesRelation", () => {
  it("fetches when all params provided", async () => {
    vi.mocked(fetchBareSalesRelation).mockResolvedValue({ results: [] } as never);
    const params = { bareTool: "BSH123", countryCode: "ZA", language: "en" };
    const { result } = renderHook(() => useBareSalesRelation(params), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchBareSalesRelation).toHaveBeenCalledWith(params);
  });

  it("is disabled when bareTool is missing", () => {
    const params = { bareTool: "", countryCode: "ZA", language: "en" };
    const { result } = renderHook(() => useBareSalesRelation(params), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("is disabled when countryCode is missing", () => {
    const params = { bareTool: "BSH123", countryCode: "", language: "en" };
    const { result } = renderHook(() => useBareSalesRelation(params), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
