import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("./action", () => ({
  getItemPolicyConfig: vi.fn().mockResolvedValue({ countryCode: "TR" }),
}));

import { useItemPolicyConfig } from "./hooks";
import { getItemPolicyConfig } from "./action";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("useItemPolicyConfig", () => {
  it("fetches item policy config for the given country code", async () => {
    const { result } = renderHook(() => useItemPolicyConfig("TR"), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getItemPolicyConfig).toHaveBeenCalledWith("TR");
    expect(result.current.data).toEqual({ countryCode: "TR" });
  });

  it("is disabled when countryCode is empty", () => {
    const { result } = renderHook(() => useItemPolicyConfig(""), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
