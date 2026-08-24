import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("./action", () => ({
  postConsentAccept: vi.fn().mockResolvedValue(undefined),
}));

import { useAcceptConsent } from "./hooks";
import { postConsentAccept } from "./action";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("useAcceptConsent", () => {
  it("calls postConsentAccept on mutate", async () => {
    const payload = {
      acceptedTacVersion: null,
      acceptedPrivacyVersion: null,
      locale: "en-TR",
    };

    vi.mocked(postConsentAccept).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAcceptConsent(), {
      wrapper: makeWrapper(),
    });

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(postConsentAccept).toHaveBeenCalledWith(payload, expect.any(Object));
  });

  it("calls custom onSuccess callback", async () => {
    const payload = {
      acceptedTacVersion: null,
      acceptedPrivacyVersion: null,
      locale: "en-TR",
    };

    const onSuccess = vi.fn();

    const { result } = renderHook(() => useAcceptConsent({ onSuccess }), {
      wrapper: makeWrapper(),
    });

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(onSuccess).toHaveBeenCalled();
  });
});
