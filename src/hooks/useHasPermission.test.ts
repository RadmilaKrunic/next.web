import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useHasPermission } from "./useHasPermission";
import type { User } from "types/user.type";

const mockUser: User = {
  email: "test@test.com",
  type: "ASC",
  ascId: "ASC001",
  firstName: "John",
  lastName: "Doe",
  roles: [],
  permissions: ["PERM_A", "PERM_B"],
  countryCode: "ZA",
};

function makeWrapper(user?: User) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (user) qc.setQueryData(["user"], user);
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return Wrapper;
}

describe("useHasPermission", () => {
  it("returns true when permissions array is empty", () => {
    const { result } = renderHook(() => useHasPermission([]), { wrapper: makeWrapper() });
    expect(result.current).toBe(true);
  });

  it("returns true when permissions is undefined", () => {
    const { result } = renderHook(() => useHasPermission(undefined), {
      wrapper: makeWrapper(),
    });
    expect(result.current).toBe(true);
  });

  it("returns true when user has at least one matching permission", () => {
    const { result } = renderHook(() => useHasPermission(["PERM_A", "PERM_X"]), {
      wrapper: makeWrapper(mockUser),
    });
    expect(result.current).toBe(true);
  });

  it("returns false when user has none of the required permissions", () => {
    const { result } = renderHook(() => useHasPermission(["PERM_X", "PERM_Y"]), {
      wrapper: makeWrapper(mockUser),
    });
    expect(result.current).toBe(false);
  });

  it("returns false when no user data exists", () => {
    const { result } = renderHook(() => useHasPermission(["PERM_A"]), {
      wrapper: makeWrapper(),
    });
    expect(result.current).toBe(false);
  });
});
