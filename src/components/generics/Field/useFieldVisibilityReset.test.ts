import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import useFieldVisibilityReset from "./useFieldVisibilityReset";

describe("useFieldVisibilityReset", () => {
  it("copies value to sameDataFieldAs and resets source when field becomes hidden", () => {
    const setFieldValue = vi.fn();
    const initialProps = {
      isVisible: true,
      name: "firstName",
      formValues: { firstName: "Alice", backupName: "" },
      setFieldValue,
      sameDataFieldAs: "backupName",
      defaultValue: "",
    };

    const { rerender } = renderHook((props) => useFieldVisibilityReset(props), {
      initialProps,
    });

    rerender({ ...initialProps, isVisible: false });

    expect(setFieldValue).toHaveBeenCalledWith("backupName", "Alice");
    expect(setFieldValue).toHaveBeenCalledWith("firstName", "");
  });

  it("does not copy when source value is explicit false", () => {
    const setFieldValue = vi.fn();
    const initialProps = {
      isVisible: true,
      name: "isCompany",
      formValues: { isCompany: false, backup: "" },
      setFieldValue,
      sameDataFieldAs: "backup",
      defaultValue: false,
    };

    const { rerender } = renderHook((props) => useFieldVisibilityReset(props), {
      initialProps,
    });

    rerender({ ...initialProps, isVisible: false });

    expect(setFieldValue).not.toHaveBeenCalledWith("backup", false);
    expect(setFieldValue).not.toHaveBeenCalledWith("isCompany", false);
  });

  it("caches and restores value for non-mapped field when hidden then visible", () => {
    const setFieldValue = vi.fn();
    const baseProps = {
      isVisible: true,
      name: "description",
      formValues: { description: "cached-text" },
      setFieldValue,
      defaultValue: "",
    };

    const { rerender } = renderHook((props) => useFieldVisibilityReset(props), {
      initialProps: baseProps,
    });

    rerender({ ...baseProps, isVisible: false });
    expect(setFieldValue).toHaveBeenCalledWith("description", "");

    setFieldValue.mockClear();
    rerender({ ...baseProps, isVisible: true, formValues: { description: "" } });

    expect(setFieldValue).toHaveBeenCalledWith("description", "cached-text");
  });

  it("does not restore cached value if current value is already non-empty", () => {
    const setFieldValue = vi.fn();
    const baseProps = {
      isVisible: true,
      name: "description",
      formValues: { description: "old" },
      setFieldValue,
      defaultValue: "",
    };

    const { rerender } = renderHook((props) => useFieldVisibilityReset(props), {
      initialProps: baseProps,
    });

    rerender({ ...baseProps, isVisible: false });
    setFieldValue.mockClear();
    rerender({ ...baseProps, isVisible: true, formValues: { description: "already-new" } });

    expect(setFieldValue).not.toHaveBeenCalled();
  });
});
