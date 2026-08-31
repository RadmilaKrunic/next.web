import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFormValidation } from "./useFormValidation";
import Field from "../Field/GenericField.types";
import { ActionMandatoryFields } from "./GenericForm.types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        isRequired: "is required",
        toolModelNameNotFound: "Tool model name '{{name}}' not found.",
        incompatibleWarrantyType: "Incompatible part/material. Warranty not applicable",
        incompatibleServiceOfferingType:
          "Incompatible part/material. Service offering not applicable",
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock("../utils", () => ({
  isFieldVisible: vi.fn(() => true),
}));

const createField = (overrides: Partial<Field> = {}): Field =>
  ({
    name: "testField",
    label: "Test Field",
    type: "text",
    isHidden: false,
    fieldMapping: { originalName: "testField", map: "", parentMap: [], prefixes: [] },
    ...overrides,
  }) as Field;

describe("useFormValidation", () => {
  it("validateByAction returns empty object when allFields is null", () => {
    const { result } = renderHook(() =>
      useFormValidation({ allFields: null, mandatoryFieldsMap: null }),
    );

    expect(result.current.validateByAction("onSubmit", {})).toEqual({});
  });

  it("validate returns empty object when allFields is null", () => {
    const { result } = renderHook(() =>
      useFormValidation({ allFields: null, mandatoryFieldsMap: null }),
    );

    expect(result.current.validate({})).toEqual({});
  });

  it("validateByAction runs mandatory-field validation for the given action", () => {
    const allFields = [createField({ name: "email", fieldMapping: { originalName: "email" } })];
    const mandatoryFieldsMap: Record<string, ActionMandatoryFields> = {
      onSubmit: { fieldList: ["email"] },
    };

    const { result } = renderHook(() => useFormValidation({ allFields, mandatoryFieldsMap }));

    const errors = result.current.validateByAction("onSubmit", { email: "" });
    expect(errors.email).toBe("Test Field is required");
  });

  it("validate only surfaces autocomplete/serial-number/spare-part errors before an action is triggered", () => {
    const allFields = [
      createField({ name: "email", fieldMapping: { originalName: "email" } }),
      createField({
        name: "toolModelName",
        type: "autocomplete",
        fieldMapping: { originalName: "toolModelName" },
      }),
    ];
    const mandatoryFieldsMap: Record<string, ActionMandatoryFields> = {
      onSubmit: { fieldList: ["email", "toolModelName"] },
    };
    const autocompleteValidationRef = { current: { toolModelName: false } };

    const { result } = renderHook(() =>
      useFormValidation({ allFields, mandatoryFieldsMap, autocompleteValidationRef }),
    );

    const errors = result.current.validate({ email: "", toolModelName: "DummyName" });

    expect(errors.email).toBeUndefined();
    expect(errors.toolModelName).toBe("Tool model name 'DummyName' not found.");
  });

  it("validate runs full validation once an action has been triggered", () => {
    const allFields = [createField({ name: "email", fieldMapping: { originalName: "email" } })];
    const mandatoryFieldsMap: Record<string, ActionMandatoryFields> = {
      onSubmit: { fieldList: ["email"] },
    };

    const { result } = renderHook(() => useFormValidation({ allFields, mandatoryFieldsMap }));

    act(() => {
      result.current.startValidation("onSubmit");
    });

    const errors = result.current.validate({ email: "" });
    expect(errors.email).toBe("Test Field is required");
  });

  it("validate surfaces spare-part compatibility errors before an action is triggered", () => {
    const allFields = [
      createField({
        name: "sparePartNumber",
        type: "autocomplete",
        fieldMapping: { originalName: "sparePartNumber", nameStartsWith: "row1" },
      }),
      createField({
        name: "rowType",
        subtype: "diagnosticType",
        fieldMapping: { originalName: "rowType", nameStartsWith: "row1" },
      }),
    ];
    const sparePartNotBelongsToToolRef = { current: { sparePartNumber: true } };

    const { result } = renderHook(() =>
      useFormValidation({ allFields, mandatoryFieldsMap: null, sparePartNotBelongsToToolRef }),
    );

    const errors = result.current.validate({
      sparePartNumber: "123456789",
      rowType: "WARRANTY",
      actionType: "REPAIR",
    });

    expect(errors.sparePartNumber).toBe("Incompatible part/material. Warranty not applicable");
  });

  it("stopValidation reverts to the filtered (untriggered) validation set", () => {
    const allFields = [createField({ name: "email", fieldMapping: { originalName: "email" } })];
    const mandatoryFieldsMap: Record<string, ActionMandatoryFields> = {
      onSubmit: { fieldList: ["email"] },
    };

    const { result } = renderHook(() => useFormValidation({ allFields, mandatoryFieldsMap }));

    act(() => {
      result.current.startValidation("onSubmit");
    });
    expect(result.current.validate({ email: "" }).email).toBeDefined();

    act(() => {
      result.current.stopValidation();
    });
    expect(result.current.validate({ email: "" }).email).toBeUndefined();
  });

  it("setCurrentAction marks validation as triggered without a state re-render", () => {
    const allFields = [createField({ name: "email", fieldMapping: { originalName: "email" } })];
    const mandatoryFieldsMap: Record<string, ActionMandatoryFields> = {
      onSubmit: { fieldList: ["email"] },
    };

    const { result } = renderHook(() => useFormValidation({ allFields, mandatoryFieldsMap }));

    act(() => {
      result.current.setCurrentAction("onSubmit");
    });

    const errors = result.current.validate({ email: "" });
    expect(errors.email).toBe("Test Field is required");
  });
});
