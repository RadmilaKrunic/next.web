import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useClaimDecisionPermissions } from "./useClaimDecisionPermissions";
import type { User } from "types/user.type";

const userWithBoth: User = {
  email: "a@b.com",
  type: "ASC",
  ascId: "A1",
  firstName: "J",
  lastName: "D",
  roles: [],
  permissions: ["AC_A", "AC_R"],
  countryCode: "ZA",
};

const userWithPerformOnly: User = { ...userWithBoth, permissions: ["AC_A"] };
const userWithRevertOnly: User = { ...userWithBoth, permissions: ["AC_R"] };
const userWithNone: User = { ...userWithBoth, permissions: [] };

function makeWrapper(user?: User) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (user) qc.setQueryData(["user"], user);
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("useClaimDecisionPermissions", () => {
  it("canChangeClaimDecision returns true when user has AC_R", () => {
    const { result } = renderHook(() => useClaimDecisionPermissions("PENDING"), {
      wrapper: makeWrapper(userWithRevertOnly),
    });
    expect(result.current.canChangeClaimDecision()).toBe(true);
  });

  it("canChangeClaimDecision returns true when user has AC_A and status is PENDING", () => {
    const { result } = renderHook(() => useClaimDecisionPermissions("PENDING"), {
      wrapper: makeWrapper(userWithPerformOnly),
    });
    expect(result.current.canChangeClaimDecision()).toBe(true);
  });

  it("canChangeClaimDecision returns false when user has AC_A but status is not PENDING", () => {
    const { result } = renderHook(() => useClaimDecisionPermissions("APPROVED"), {
      wrapper: makeWrapper(userWithPerformOnly),
    });
    expect(result.current.canChangeClaimDecision()).toBe(false);
  });

  it("canChangeClaimDecision returns false when user has no relevant permissions", () => {
    const { result } = renderHook(() => useClaimDecisionPermissions("PENDING"), {
      wrapper: makeWrapper(userWithNone),
    });
    expect(result.current.canChangeClaimDecision()).toBe(false);
  });

  it("showDecisionActions is true when user has AC_A", () => {
    const { result } = renderHook(() => useClaimDecisionPermissions("PENDING"), {
      wrapper: makeWrapper(userWithPerformOnly),
    });
    expect(result.current.showDecisionActions).toBe(true);
  });

  it("showDecisionActions is false when user has neither AC_A nor AC_R", () => {
    const { result } = renderHook(() => useClaimDecisionPermissions("PENDING"), {
      wrapper: makeWrapper(userWithNone),
    });
    expect(result.current.showDecisionActions).toBeFalsy();
  });
});
