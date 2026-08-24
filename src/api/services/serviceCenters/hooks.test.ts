import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("./action", () => ({
  fetchServiceCenterNames: vi.fn().mockResolvedValue([{ ascId: "ASC1", name: "ASC One" }]),
}));

import { useServiceCenterNames } from "./hooks";
import { fetchServiceCenterNames } from "./action";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("useServiceCenterNames", () => {
  it("fetches service center names", async () => {
    const { result } = renderHook(() => useServiceCenterNames(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchServiceCenterNames).toHaveBeenCalled();
    expect(result.current.data).toEqual([{ ascId: "ASC1", name: "ASC One" }]);
  });
});
