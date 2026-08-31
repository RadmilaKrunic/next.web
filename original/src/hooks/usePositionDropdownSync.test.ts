import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";

vi.mock("components/generics/utils", () => ({
  setDisabledAutomaticRow: vi.fn(),
  syncFieldsToTabs: vi.fn((tabs) => tabs),
  haveFieldDisabledStatesChanged: vi.fn(),
}));

import { usePositionDropdownSync } from "./usePositionDropdownSync";
import { setDisabledAutomaticRow, haveFieldDisabledStatesChanged } from "components/generics/utils";
import Field from "components/generics/Field/GenericField.types";
import Section from "components/generics/Section/GenericSection.types";
import type { AllowedPosition } from "api/services/countryConfiguration/countryConfiguration";

const mockField: Field = {
  name: "position",
  label: "Position",
  type: "dropdown",
};

const mockAllowedPosition: AllowedPosition = {
  position: "SP",
  minCount: 0,
  maxCount: 5,
  quantity: { quantitySource: "USER", defaultQuantity: 1 },
  unitPriceSource: "USER",
};

const systemPosition: AllowedPosition = {
  position: "PN",
  minCount: 0,
  maxCount: 3,
  quantity: { quantitySource: "SYSTEM", defaultQuantity: 1 },
  unitPriceSource: "SYSTEM",
};

function makeRefs(
  allFields: Field[] | null = [mockField],
  formValues: Record<string, unknown> = {},
  skipFormReset = false,
) {
  return {
    allFields,
    setAllFields: vi.fn(),
    setTabs: vi.fn(),
    allowedPositions: [mockAllowedPosition],
    getPositionConfig: vi.fn((pos: string) =>
      pos === "PN" ? systemPosition : mockAllowedPosition,
    ),
    formValuesRef: { current: formValues } as React.RefObject<Record<string, unknown>>,
    skipFormResetRef: { current: skipFormReset } as React.RefObject<boolean>,
  };
}

describe("usePositionDropdownSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when allFields is null", () => {
    const props = makeRefs(null);
    vi.mocked(setDisabledAutomaticRow).mockReturnValue([]);
    vi.mocked(haveFieldDisabledStatesChanged).mockReturnValue(false);

    renderHook(() => usePositionDropdownSync(props));
    expect(props.setAllFields).not.toHaveBeenCalled();
  });

  it("does nothing when allowedPositions is empty", () => {
    const props = { ...makeRefs(), allowedPositions: [] as AllowedPosition[] };
    vi.mocked(setDisabledAutomaticRow).mockReturnValue([]);
    vi.mocked(haveFieldDisabledStatesChanged).mockReturnValue(false);

    renderHook(() => usePositionDropdownSync(props));
    expect(props.setAllFields).not.toHaveBeenCalled();
  });

  it("does not update when field disabled states have not changed", () => {
    const props = makeRefs();
    vi.mocked(setDisabledAutomaticRow).mockReturnValue([mockField]);
    vi.mocked(haveFieldDisabledStatesChanged).mockReturnValue(false);

    renderHook(() => usePositionDropdownSync(props));
    expect(props.setAllFields).not.toHaveBeenCalled();
    expect(props.setTabs).not.toHaveBeenCalled();
  });

  it("calls setAllFields and setTabs when disabled states change", () => {
    const updatedField = { ...mockField, isDisabled: true };
    const props = makeRefs();
    vi.mocked(setDisabledAutomaticRow).mockReturnValue([updatedField]);
    vi.mocked(haveFieldDisabledStatesChanged).mockReturnValue(true);

    renderHook(() => usePositionDropdownSync(props));
    expect(props.setAllFields).toHaveBeenCalledWith([updatedField]);
    expect(props.setTabs).toHaveBeenCalled();
  });

  it("sets skipFormResetRef to true when updating", () => {
    const updatedField = { ...mockField, isDisabled: true };
    const props = makeRefs();
    vi.mocked(setDisabledAutomaticRow).mockReturnValue([updatedField]);
    vi.mocked(haveFieldDisabledStatesChanged).mockReturnValue(true);

    renderHook(() => usePositionDropdownSync(props));
    expect(props.skipFormResetRef.current).toBe(true);
  });

  it("disables field for SYSTEM unitPriceSource position", () => {
    const props = {
      ...makeRefs(),
      getPositionConfig: vi.fn(() => systemPosition),
    };
    vi.mocked(setDisabledAutomaticRow).mockImplementation((fields, getIsDisabled) => {
      const isDisabled = getIsDisabled("PN", {});
      return fields.map((f) => ({ ...f, isDisabled }));
    });
    vi.mocked(haveFieldDisabledStatesChanged).mockReturnValue(true);

    renderHook(() => usePositionDropdownSync(props));
    expect(props.setAllFields).toHaveBeenCalled();
  });

  it("does not disable field for USER unitPriceSource position", () => {
    const props = {
      ...makeRefs(),
      getPositionConfig: vi.fn(() => mockAllowedPosition),
    };
    vi.mocked(setDisabledAutomaticRow).mockImplementation((fields, getIsDisabled) => {
      const isDisabled = getIsDisabled("SP", {});
      return fields.map((f) => ({ ...f, isDisabled }));
    });
    vi.mocked(haveFieldDisabledStatesChanged).mockReturnValue(false);

    renderHook(() => usePositionDropdownSync(props));
    expect(props.setAllFields).not.toHaveBeenCalled();
  });

  it("handles sections with multiple tabs", () => {
    const props = makeRefs();
    const updatedFields = [mockField];
    vi.mocked(setDisabledAutomaticRow).mockReturnValue(updatedFields);
    vi.mocked(haveFieldDisabledStatesChanged).mockReturnValue(true);

    const tabs: Section[] = [
      { name: "tab1", label: "", areas: [] } as unknown as Section,
      { name: "tab2", label: "", areas: [] } as unknown as Section,
    ];
    const propsWithTabs = {
      ...props,
      setTabs: vi.fn((fn: (prev: Section[]) => Section[]) => fn(tabs)),
    };

    renderHook(() => usePositionDropdownSync(propsWithTabs));
    expect(propsWithTabs.setTabs).toHaveBeenCalled();
  });
});
