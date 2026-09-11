import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("./action", () => ({
  getItemPolicy: vi.fn().mockResolvedValue({ countryCode: "TR" }),
}));

import { useItemPolicyQuery } from "./hooks";
import { getItemPolicy } from "./action";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("useItemPolicyQuery", () => {
  it("fetches item policy for the given country code", async () => {
    const { result } = renderHook(() => useItemPolicyQuery("TR"), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getItemPolicy).toHaveBeenCalledWith("TR");
    expect(result.current.data).toEqual({ countryCode: "TR" });
  });

  it("is disabled when countryCode is empty", () => {
    const { result } = renderHook(() => useItemPolicyQuery(""), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("is disabled when enabled=false is passed explicitly", () => {
    const { result } = renderHook(() => useItemPolicyQuery("TR", false), {
      wrapper: makeWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
