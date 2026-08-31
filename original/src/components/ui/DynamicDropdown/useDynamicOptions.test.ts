import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useDynamicOptions } from "./useDynamicOptions";

vi.mock("../../../api/services/dynamicOptions/dynamicApi", () => ({
  fetchDynamicOptions: vi.fn(),
}));

import { fetchDynamicOptions } from "../../../api/services/dynamicOptions/dynamicApi";

const mockFetch = vi.mocked(fetchDynamicOptions);

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

const optionsEndpoint = {
  url: "/v1/options",
  method: "GET" as const,
  queryParams: [],
};

describe("useDynamicOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty options initially", () => {
    mockFetch.mockResolvedValue([]);
    const { result } = renderHook(() => useDynamicOptions({ optionsEndpoint }), {
      wrapper: makeWrapper(),
    });
    expect(result.current.options).toEqual([]);
  });

  it("returns fetched options after loading", async () => {
    const opts = [{ value: "A", label: "Option A", name: "A" }];
    mockFetch.mockResolvedValue(opts);

    const { result } = renderHook(() => useDynamicOptions({ optionsEndpoint }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.options).toEqual(opts);
  });

  it("does not fetch when enabled=false", () => {
    mockFetch.mockResolvedValue([]);
    renderHook(() => useDynamicOptions({ optionsEndpoint, enabled: false }), {
      wrapper: makeWrapper(),
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns error when fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("Fetch failed"));
    const { result } = renderHook(() => useDynamicOptions({ optionsEndpoint }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.options).toEqual([]);
  });
});
