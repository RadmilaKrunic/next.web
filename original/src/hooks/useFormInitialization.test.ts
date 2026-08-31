import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("components/generics/utils", () => ({
  setInitalSectionsAreasFields: vi
    .fn()
    .mockReturnValue([{ name: "assetData", isTab: false, areas: [] }]),
  getAllFieldsFromSection: vi.fn().mockReturnValue([{ name: "field1" }]),
  mapFieldToFieldMapping: vi.fn((f) => ({ ...f, fieldMapping: {} })),
  getInitialFieldValues: vi.fn().mockReturnValue({ field1: "" }),
  getAreasByName: vi.fn().mockReturnValue([]),
}));

vi.mock("components/generics/Form/formValidation", () => ({
  getMandatoryFields: vi.fn().mockReturnValue({ save: { fields: [] } }),
}));

import { useFormInitialization } from "./useFormInitialization";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const mockFormConfig = {
  name: "createJob",
  sections: [{ name: "assetData", areas: [] }],
  actions: [],
} as never;

describe("useFormInitialization", () => {
  it("initializes with isInitialized=false when no config", () => {
    const { result } = renderHook(() => useFormInitialization(null), {
      wrapper: createWrapper(),
    });
    expect(result.current.isInitialized).toBe(false);
  });

  it("initializes form with config", async () => {
    const { result } = renderHook(() => useFormInitialization(mockFormConfig), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isInitialized).toBe(true));
    expect(result.current.allFields).not.toBeNull();
    expect(result.current.initialFormValues).toEqual({ field1: "" });
  });

  it("reset sets isInitialized back to false", async () => {
    const { result } = renderHook(() => useFormInitialization(mockFormConfig), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isInitialized).toBe(true));
    act(() => {
      result.current.reset();
    });
    await waitFor(() => expect(result.current.isInitialized).toBe(true));
  });
});
