import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("./action", () => ({
  fetchReimbursementASCs: vi.fn().mockResolvedValue({ content: [] }),
  fetchReimbursements: vi.fn().mockResolvedValue({ content: [] }),
  fetchReimbursementsByAscId: vi.fn().mockResolvedValue({ content: [] }),
  fetchReimbursementClaims: vi.fn().mockResolvedValue({ reimbursementId: "R1" }),
}));

import {
  useReimbursementASCs,
  useReimbursements,
  useReimbursementsByAscId,
  useReimbursementClaims,
} from "./hooks";
import {
  fetchReimbursementASCs,
  fetchReimbursements,
  fetchReimbursementsByAscId,
  fetchReimbursementClaims,
} from "./action";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("useReimbursementASCs", () => {
  it("fetches ASCs with search term and pagination", async () => {
    const { result } = renderHook(() => useReimbursementASCs("bosch", 0, 10), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchReimbursementASCs).toHaveBeenCalledWith("bosch", 0, 10);
  });
});

describe("useReimbursements", () => {
  it("fetches reimbursements with date range", async () => {
    const from = new Date(2026, 0, 1);
    const to = new Date(2026, 0, 31);
    const { result } = renderHook(() => useReimbursements(from, to, "term", 0, 10), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchReimbursements).toHaveBeenCalledWith(from, to, "term", 0, 10);
  });
});

describe("useReimbursementsByAscId", () => {
  it("fetches when ascId is provided", async () => {
    const { result } = renderHook(() => useReimbursementsByAscId("asc-1"), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchReimbursementsByAscId).toHaveBeenCalledWith(
      "asc-1",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });

  it("is disabled when ascId is empty", () => {
    const { result } = renderHook(() => useReimbursementsByAscId(""), {
      wrapper: makeWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useReimbursementClaims", () => {
  it("fetches claims for a reimbursement id", async () => {
    const { result } = renderHook(() => useReimbursementClaims("R1"), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchReimbursementClaims).toHaveBeenCalledWith("R1");
  });

  it("is disabled when reimbursementId is empty", () => {
    const { result } = renderHook(() => useReimbursementClaims(""), {
      wrapper: makeWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
