import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("components/generics/Form/formValidation", () => ({
  getVisibleFieldsWithErrors: vi.fn().mockReturnValue([]),
}));
vi.mock("utils/scrollToError", () => ({
  scrollToFirstError: vi.fn(),
}));

import { useActionWithValidation } from "./useActionWithValidation";
import { getVisibleFieldsWithErrors } from "components/generics/Form/formValidation";
import { scrollToFirstError } from "utils/scrollToError";

const makeHelpers = () => ({
  setErrors: vi.fn(),
  setTouched: vi.fn().mockResolvedValue(undefined),
});

const baseParams = {
  allFields: [{ name: "field1" }] as never,
  validateByAction: vi.fn().mockReturnValue({}),
  startValidation: vi.fn(),
  stopValidation: vi.fn(),
  setCurrentAction: vi.fn(),
};

describe("useActionWithValidation", () => {
  it("calls onSuccess when no errors", async () => {
    vi.mocked(getVisibleFieldsWithErrors).mockReturnValue([]);
    const params = { ...baseParams, validateByAction: vi.fn().mockReturnValue({}) };
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useActionWithValidation(params));
    await act(async () => {
      await result.current("save", {}, makeHelpers(), onSuccess);
    });
    expect(onSuccess).toHaveBeenCalled();
    expect(params.stopValidation).toHaveBeenCalled();
  });

  it("sets errors and scrolls when visible errors exist", async () => {
    vi.mocked(getVisibleFieldsWithErrors).mockReturnValue(["field1"] as never);
    const helpers = makeHelpers();
    const params = {
      ...baseParams,
      validateByAction: vi.fn().mockReturnValue({ field1: "required" }),
    };
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useActionWithValidation(params));
    await act(async () => {
      await result.current("save", {}, helpers, onSuccess);
    });
    expect(helpers.setErrors).toHaveBeenCalledWith({ field1: "required" });
    expect(helpers.setTouched).toHaveBeenCalled();
    expect(scrollToFirstError).toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("returns early when allFields is null", async () => {
    const params = { ...baseParams, allFields: null };
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useActionWithValidation(params));
    await act(async () => {
      await result.current("save", {}, makeHelpers(), onSuccess);
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
