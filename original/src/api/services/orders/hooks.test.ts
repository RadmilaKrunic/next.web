import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("./orders", () => ({
  getOrderById: vi.fn().mockResolvedValue({ id: "o1" }),
  postWarrantyCheck: vi.fn().mockResolvedValue({ evaluationStatus: "SKIPPED" }),
}));

import { useOrderById, usePostWarrantyCheck } from "./hooks";
import { getOrderById, postWarrantyCheck } from "./orders";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("useOrderById", () => {
  it("fetches order when orderId provided", async () => {
    vi.mocked(getOrderById).mockResolvedValue({ id: "o1" } as never);
    const { result } = renderHook(() => useOrderById("o1"), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getOrderById).toHaveBeenCalledWith("o1");
    expect(result.current.data).toEqual({ id: "o1" });
  });

  it("is disabled when orderId is undefined", () => {
    const { result } = renderHook(() => useOrderById(undefined), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("is disabled when orderId is empty string", () => {
    const { result } = renderHook(() => useOrderById(""), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("usePostWarrantyCheck", () => {
  it("posts warranty check payload", async () => {
    const { result } = renderHook(() => usePostWarrantyCheck(), { wrapper: makeWrapper() });
    result.current.mutate({
      brand: "BOSCH",
      country: "DE",
      bareToolNumber: "1607A350C5",
      serialNumber: "929030435",
      purchaseDate: "2026-06-15",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(postWarrantyCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        brand: "BOSCH",
        country: "DE",
        bareToolNumber: "1607A350C5",
      }),
      expect.anything(),
    );
  });
});
