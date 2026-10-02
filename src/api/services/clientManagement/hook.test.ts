import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { ReactNode } from "react";
import { useClientManagementCustomers } from "./hooks";
import { fetchClientManagementCustomers } from "./action";
import type { ClientManagementCustomersRequest } from "./clientManagement.types";

vi.mock("./action", () => ({
  fetchClientManagementCustomers: vi.fn(),
}));

const mockFetch = vi.mocked(fetchClientManagementCustomers);

const responseData = {
  content: [],
  page: { number: 0, size: 20, totalElements: 0, totalPages: 0 },
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe("useClientManagementCustomers", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(responseData);
  });

  it("calls fetchClientManagementCustomers with the request, page and size", async () => {
    const request: ClientManagementCustomersRequest = { ascId: "asc-1" };
    const { result } = renderHook(() => useClientManagementCustomers(request, 2, 50), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith(request, 2, 50);
  });

  it("returns the fetched data on success", async () => {
    const request: ClientManagementCustomersRequest = { ascId: "asc-1" };
    const { result } = renderHook(() => useClientManagementCustomers(request), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(responseData);
  });

  it("does not fetch when ascId is empty", async () => {
    const request: ClientManagementCustomersRequest = { ascId: "" };
    const { result } = renderHook(() => useClientManagementCustomers(request), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("refetches when searchTerm changes", async () => {
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      ({ request }: { request: ClientManagementCustomersRequest }) =>
        useClientManagementCustomers(request),
      {
        wrapper,
        initialProps: { request: { ascId: "asc-1", searchTerm: "a" } },
      },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledTimes(1);

    rerender({ request: { ascId: "asc-1", searchTerm: "b" } });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    expect(mockFetch).toHaveBeenLastCalledWith(
      { ascId: "asc-1", searchTerm: "b" },
      undefined,
      undefined,
    );
  });
});
