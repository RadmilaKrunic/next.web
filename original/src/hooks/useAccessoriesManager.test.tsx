import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import Field from "components/generics/Field/GenericField.types";

vi.mock("components/generics/utils", () => ({
  mapFieldToFieldMapping: vi.fn((f) => ({
    ...f,
    fieldMapping: {
      originalName: f.name,
      map: f.name,
      parentMap: "",
      prefixes: [],
    },
  })),
}));

import {
  useAccessoriesManager,
  getAccessoryTemplateFields,
  createAccessoryFieldSet,
} from "./useAccessoriesManager";

const baseField: Field = {
  name: "assetData#0_accessory#0_accessoryType",
  label: "Accessory Type",
  type: "text",
};

const singleJobField: Field = {
  name: "assetData_accessory#0_accessoryType",
  label: "Accessory Type",
  type: "text",
};

describe("useAccessoriesManager helpers", () => {
  it("getAccessoryTemplateFields returns multi-job template fields", () => {
    const fields: Field[] = [baseField, { ...baseField, name: "other" }];
    const result = getAccessoryTemplateFields(fields, false);
    expect(result).toHaveLength(1);
    expect(result[0].name).toContain("accessory#0_");
  });

  it("getAccessoryTemplateFields returns single-job template fields", () => {
    const fields: Field[] = [singleJobField, baseField];
    const result = getAccessoryTemplateFields(fields, true);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("assetData_accessory#0_accessoryType");
  });

  it("createAccessoryFieldSet replaces accessory index", () => {
    const result = createAccessoryFieldSet([baseField], "0", 2, false);
    expect(result.accessoriesIndex).toBe("2");
    expect(result.fields[0].name).toContain("accessory#2_");
  });

  it("createAccessoryFieldSet replaces asset index for multi-job", () => {
    const result = createAccessoryFieldSet([baseField], "3", 1, false);
    expect(result.fields[0].name).toContain("assetData#3_");
  });

  it("createAccessoryFieldSet keeps asset name for single-job", () => {
    const result = createAccessoryFieldSet([singleJobField], "5", 1, true);
    expect(result.fields[0].name).toContain("assetData_accessory#1_");
    expect(result.fields[0].name).not.toContain("assetData#5_");
  });
});

describe("useAccessoriesManager", () => {
  it("returns initialized=true when no API accessories", () => {
    const setAllFields = vi.fn();
    const setInitialFormValues = vi.fn();

    const { result } = renderHook(() =>
      useAccessoriesManager({
        mode: "create",
        allFields: [baseField],
        setAllFields,
        setInitialFormValues,
        apiJobsAccessories: [],
      }),
    );

    expect(result.current.isInitialized).toBe(true);
    expect(result.current.assetsAccessories).toEqual([]);
  });

  it("mapAccessoriesFields returns allFields when accessories are empty", () => {
    const setAllFields = vi.fn();
    const setInitialFormValues = vi.fn();

    const { result } = renderHook(() =>
      useAccessoriesManager({
        mode: "create",
        allFields: [baseField],
        setAllFields,
        setInitialFormValues,
        apiJobsAccessories: [],
      }),
    );

    const mapped = result.current.mapAccessoriesFields();
    expect(mapped).toEqual([baseField]);
  });

  it("mapAccessoriesFields maps accessories and updates fields", () => {
    const setAllFields = vi.fn();
    const setInitialFormValues = vi.fn();

    const { result } = renderHook(() =>
      useAccessoriesManager({
        mode: "create",
        allFields: [baseField],
        setAllFields,
        setInitialFormValues,
        apiJobsAccessories: [],
      }),
    );

    act(() => {
      result.current.setAssetsAccessories([
        {
          assetIndex: "0",
          accessoriesIndex: "0",
          fields: [{ ...baseField, name: "assetData#0_accessory#0_name" }],
        },
      ]);
    });

    act(() => {
      result.current.mapAccessoriesFields();
    });

    expect(setInitialFormValues).toHaveBeenCalled();
    expect(setAllFields).toHaveBeenCalled();
  });

  it("initializes accessory field sets from apiJobsAccessories", () => {
    const setAllFields = vi.fn((updater) =>
      typeof updater === "function" ? updater([baseField]) : updater,
    );
    const setInitialFormValues = vi.fn();

    const { result } = renderHook(() =>
      useAccessoriesManager({
        mode: "view",
        allFields: [baseField],
        setAllFields,
        setInitialFormValues,
        apiJobsAccessories: [{ jobIndex: 0, accessories: [{}, {}] }],
      }),
    );

    expect(result.current.assetsAccessories.length).toBeGreaterThan(0);
  });

  it("calls convertAPIDataToFormValues when template fields missing", () => {
    const setAllFields = vi.fn();
    const setInitialFormValues = vi.fn();
    const convertAPIDataToFormValues = vi.fn(() => ({ mapped: true }));

    renderHook(() =>
      useAccessoriesManager({
        mode: "view",
        allFields: [{ ...baseField, name: "no-template" }],
        setAllFields,
        setInitialFormValues,
        apiJobsAccessories: [{ jobIndex: 0, accessories: [{}] }],
        convertAPIDataToFormValues,
        apiData: { orderId: "O1" },
      }),
    );

    expect(convertAPIDataToFormValues).toHaveBeenCalled();
    expect(setInitialFormValues).toHaveBeenCalledWith({ mapped: true });
  });
});
