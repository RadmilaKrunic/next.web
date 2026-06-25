import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("./action", () => ({
  updateUserLanguagePreference: vi.fn().mockResolvedValue(undefined),
}));

import { useUpdateUserLanguagePreference } from "./hooks";
import { updateUserLanguagePreference } from "./action";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("useUpdateUserLanguagePreference", () => {
  it("calls updateUserLanguagePreference on mutate", async () => {
    vi.mocked(updateUserLanguagePreference).mockResolvedValue(undefined);
    const { result } = renderHook(() => useUpdateUserLanguagePreference(), {
      wrapper: makeWrapper(),
    });
    result.current.mutate("en-US");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateUserLanguagePreference).toHaveBeenCalled();
  });
});
