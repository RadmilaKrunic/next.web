import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("./action", () => ({
  getItemRulesConfig: vi.fn().mockResolvedValue({ countryCode: "TR" }),
}));

import { useItemRulesConfig } from "./hooks";
import { getItemRulesConfig } from "./action";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("useItemRulesConfig", () => {
  it("fetches item rules config for the given country code", async () => {
    const { result } = renderHook(() => useItemRulesConfig("TR"), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getItemRulesConfig).toHaveBeenCalledWith("TR");
    expect(result.current.data).toEqual({ countryCode: "TR" });
  });

  it("is disabled when countryCode is empty", () => {
    const { result } = renderHook(() => useItemRulesConfig(""), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
