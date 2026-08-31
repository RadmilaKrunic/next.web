import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("components/generics/utils", () => ({
  toggleSectionFieldsDisabled: vi.fn((fields, _section, disabled) =>
    fields.map((f: { name: string; isDisabled?: boolean }) => ({ ...f, isDisabled: disabled })),
  ),
  convertAPIDataToFormValues: vi.fn().mockReturnValue({ field1: "value" }),
}));

import { useSectionEditing } from "./useSectionEditing";

const mockSection = { name: "assetData", fields: [], areas: [] } as never;
const mockField = { name: "field1", isDisabled: true } as never;

function makeParams(overrides = {}) {
  return {
    tabs: [mockSection],
    allFields: [mockField],
    setAllFields: vi.fn(),
    assetsAccessories: [],
    setAssetsAccessories: vi.fn(),
    mergedJobData: { id: "j1" },
    setInitialFormValues: vi.fn(),
    ...overrides,
  };
}

describe("useSectionEditing", () => {
  it("starts with empty editingSections", () => {
    const { result } = renderHook(() => useSectionEditing(makeParams()));
    expect(result.current.editingSections.size).toBe(0);
  });

  it("enableSectionEditing adds section to set", () => {
    const { result } = renderHook(() => useSectionEditing(makeParams()));
    act(() => {
      result.current.enableSectionEditing("assetData");
    });
    expect(result.current.editingSections.has("assetData")).toBe(true);
  });

  it("enableSectionEditing calls setAllFields with enabled fields", () => {
    const setAllFields = vi.fn();
    const { result } = renderHook(() => useSectionEditing(makeParams({ setAllFields })));
    act(() => {
      result.current.enableSectionEditing("assetData");
    });
    expect(setAllFields).toHaveBeenCalled();
  });

  it("enableSectionEditing does nothing for unknown section", () => {
    const setAllFields = vi.fn();
    const { result } = renderHook(() => useSectionEditing(makeParams({ setAllFields })));
    act(() => {
      result.current.enableSectionEditing("unknown");
    });
    expect(setAllFields).not.toHaveBeenCalled();
  });

  it("disableSectionEditing removes section from set", () => {
    const { result } = renderHook(() => useSectionEditing(makeParams()));
    act(() => {
      result.current.enableSectionEditing("assetData");
    });
    act(() => {
      result.current.disableSectionEditing("assetData");
    });
    expect(result.current.editingSections.has("assetData")).toBe(false);
  });

  it("disableSectionEditing calls setInitialFormValues when reloadData=true", () => {
    const setInitialFormValues = vi.fn();
    const { result } = renderHook(() => useSectionEditing(makeParams({ setInitialFormValues })));
    act(() => {
      result.current.disableSectionEditing("assetData", true);
    });
    expect(setInitialFormValues).toHaveBeenCalled();
  });
});
