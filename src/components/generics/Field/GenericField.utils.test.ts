import { describe, it, expect, vi } from "vitest";
import {
  updateDependentFields,
  onBlurActions,
  handleFaultCodeSelection,
  resolveIsRequired,
} from "./GenericField.utils";
import type { FormikContextType } from "formik";
import type { TFunction } from "i18next";
import type Field from "./GenericField.types";

// Mock API call used by updateDependentFields
vi.mock("../../../api/services/orders/orders", () => ({
  getManufacturedDate: vi.fn(),
}));

import { getManufacturedDate } from "../../../api/services/orders/orders";

const makeField = (name: string, subtype?: string, overrides: Partial<Field> = {}): Field =>
  ({
    name,
    label: name,
    type: "text",
    subtype,
    isDisabled: false,
    fieldMapping: {
      originalName: name,
      map: name,
      parentMap: [],
      prefixes: [],
      nameStartsWith: "row0_",
    },
    ...overrides,
  }) as unknown as Field;

const makeFormikContext = (values: Record<string, unknown> = {}) => ({
  values,
  setFieldValue: vi.fn().mockResolvedValue(undefined),
  setFieldError: vi.fn(),
  setFieldTouched: vi.fn().mockResolvedValue(undefined),
});

const t = ((key: string) => key) as TFunction<"translation", "app">;

describe("updateDependentFields", () => {
  it("clears manufactured date when serial number changes", async () => {
    vi.mocked(getManufacturedDate).mockResolvedValueOnce("202401");
    const serialField = makeField("assetData#0_serialNumber", undefined, {
      fieldMapping: {
        originalName: "serialNumber",
        map: "serialNumber",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "assetData#0_",
      },
    });
    const manufacturedField = makeField("assetData#0_manufacturedDate", undefined, {
      label: "manufacturedDate",
    });
    const formik = makeFormikContext({
      "assetData#0_manufacturedDate": "old",
      "assetData#0_brand": "BOSCH",
    });

    updateDependentFields(
      serialField,
      formik as unknown as FormikContextType<Record<string, unknown>>,
      [serialField, manufacturedField],
      t,
      "123456789",
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(formik.setFieldValue).toHaveBeenCalledWith("assetData#0_manufacturedDate", "");
    expect(formik.setFieldValue).toHaveBeenCalledWith("assetData#0_manufacturedDate", "1/2024");
  });

  it("writes three-char manufactured date as returned", async () => {
    vi.mocked(getManufacturedDate).mockResolvedValueOnce("ABC");
    const serialField = makeField("assetData#0_serialNumber", undefined, {
      fieldMapping: {
        originalName: "serialNumber",
        map: "serialNumber",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "assetData#0_",
      },
    });
    const manufacturedField = makeField("assetData#0_manufacturedDate");
    const formik = makeFormikContext({ "assetData#0_brand": "BOSCH" });

    updateDependentFields(
      serialField,
      formik as unknown as FormikContextType<Record<string, unknown>>,
      [manufacturedField],
      t,
      "999",
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(formik.setFieldValue).toHaveBeenCalledWith("assetData#0_manufacturedDate", "ABC");
  });

  it("sets field errors when manufactured date cannot be resolved", async () => {
    vi.mocked(getManufacturedDate).mockResolvedValueOnce("xx");
    const serialField = makeField("assetData#0_serialNumber", undefined, {
      fieldMapping: {
        originalName: "serialNumber",
        map: "serialNumber",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "assetData#0_",
      },
    });
    const formik = makeFormikContext({ "assetData#0_brand": "BOSCH" });

    updateDependentFields(
      serialField,
      formik as unknown as FormikContextType<Record<string, unknown>>,
      [makeField("assetData#0_manufacturedDate")],
      t,
      "123456789",
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(formik.setFieldError).toHaveBeenCalledWith("assetData#0_serialNumber", "toolNotFound");
    expect(formik.setFieldTouched).toHaveBeenCalledWith("assetData#0_serialNumber", true, false);
  });

  it("handles API failure by marking serial + manufactured date errors", async () => {
    vi.mocked(getManufacturedDate).mockRejectedValueOnce(new Error("fail"));
    const serialField = makeField("assetData#0_serialNumber", undefined, {
      fieldMapping: {
        originalName: "serialNumber",
        map: "serialNumber",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "assetData#0_",
      },
    });
    const manufacturedField = makeField("assetData#0_manufacturedDate", undefined, {
      label: "manufacturedDate",
    });
    const formik = makeFormikContext({ "assetData#0_brand": "BOSCH" });

    updateDependentFields(
      serialField,
      formik as unknown as FormikContextType<Record<string, unknown>>,
      [manufacturedField],
      t,
      "123456789",
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(formik.setFieldError).toHaveBeenCalledWith("assetData#0_serialNumber", "toolNotFound");
    expect(formik.setFieldError).toHaveBeenCalledWith(
      "assetData#0_manufacturedDate",
      "manufacturedDate isRequired",
    );
  });

  it("returns true when stripped serial is longer than 14", () => {
    const serialField = makeField("assetData#0_serialNumber", undefined, {
      fieldMapping: {
        originalName: "serialNumber",
        map: "serialNumber",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "assetData#0_",
      },
    });
    const formik = makeFormikContext({ "assetData#0_brand": "BOSCH" });
    const result = updateDependentFields(
      serialField,
      formik as unknown as FormikContextType<Record<string, unknown>>,
      [],
      t,
      "123456789012345",
    );
    expect(result).toBe(true);
  });

  it("resets serial and manufactured date when brand changes", () => {
    const brandField = makeField("assetData#0_brand", undefined, {
      fieldMapping: {
        originalName: "brand",
        map: "brand",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "assetData#0_",
      },
    });
    const formik = makeFormikContext();

    updateDependentFields(
      brandField,
      formik as unknown as FormikContextType<Record<string, unknown>>,
      [],
      t,
      "BOSCH",
    );

    expect(formik.setFieldValue).toHaveBeenCalledWith("assetData#0_manufacturedDate", "");
    expect(formik.setFieldValue).toHaveBeenCalledWith("assetData#0_serialNumber", "");
  });
});

describe("onBlurActions", () => {
  it("sets dremel serial error for invalid length", () => {
    const serialField = makeField("assetData#0_serialNumber", undefined, {
      fieldMapping: {
        originalName: "serialNumber",
        map: "serialNumber",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "assetData#0_",
      },
    });
    const formik = makeFormikContext({ "assetData#0_brand": "DREMEL" });
    const event = { target: { value: "12345" } } as React.FocusEvent<HTMLInputElement>;

    onBlurActions(
      serialField,
      event,
      formik as unknown as FormikContextType<Record<string, unknown>>,
      t,
    );

    expect(formik.setFieldTouched).toHaveBeenCalledWith("assetData#0_serialNumber", true, false);
    expect(formik.setFieldError).toHaveBeenCalledWith(
      "assetData#0_serialNumber",
      "dremelSerialNumberMustHave",
    );
  });

  it("sets generic serial error for invalid length", () => {
    const serialField = makeField("assetData#0_serialNumber", undefined, {
      fieldMapping: {
        originalName: "serialNumber",
        map: "serialNumber",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "assetData#0_",
      },
    });
    const formik = makeFormikContext({ "assetData#0_brand": "BOSCH" });
    const event = { target: { value: "12345" } } as React.FocusEvent<HTMLInputElement>;

    onBlurActions(
      serialField,
      event,
      formik as unknown as FormikContextType<Record<string, unknown>>,
      t,
    );

    expect(formik.setFieldError).toHaveBeenCalledWith(
      "assetData#0_serialNumber",
      "serialNumberMustHave",
    );
  });
});

// ── handleFaultCodeSelection ─────────────────────────────────────────────────

describe("handleFaultCodeSelection", () => {
  it("does nothing when allFields is null", () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    handleFaultCodeSelection({}, setFieldValue, null, {});
    expect(setFieldValue).not.toHaveBeenCalled();
  });

  it("sets faultCode, faultCodeDescription, faultCodeLabourQuantity from rawItem", () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    const rawItem = {
      faultCode: "E001",
      faultCodeDescription: "Short circuit",
      faultCodeLabourQuantity: 2,
    };
    handleFaultCodeSelection(rawItem, setFieldValue, [], {});
    expect(setFieldValue).toHaveBeenCalledWith("faultCode", "E001");
    expect(setFieldValue).toHaveBeenCalledWith("faultCodeDescription", "Short circuit");
    expect(setFieldValue).toHaveBeenCalledWith("faultCodeLabourQuantity", 2);
  });

  it("updates LA row quantity when a LA position row exists", () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    const laPositionField = makeField("row0_position", "diagnosticPosition", {
      fieldMapping: {
        originalName: "position",
        map: "position",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "row0_",
      },
    });
    const qtyField = makeField("row0_quantity", "diagnosticQuantity", {
      fieldMapping: {
        originalName: "quantity",
        map: "quantity",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "row0_",
      },
    });
    const allFields = [laPositionField, qtyField];
    const formValues = { row0_position: "LA" };
    const rawItem = { faultCode: "E001", faultCodeDescription: "Desc", faultCodeLabourQuantity: 3 };
    handleFaultCodeSelection(rawItem, setFieldValue, allFields, formValues);
    expect(setFieldValue).toHaveBeenCalledWith("row0_quantity", 3);
  });

  it("does not update quantity when no LA position row exists", () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    const spField = makeField("row0_position", "diagnosticPosition", {
      fieldMapping: {
        originalName: "position",
        map: "position",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "row0_",
      },
    });
    const allFields = [spField];
    const formValues = { row0_position: "SP" }; // Not "LA"
    const rawItem = { faultCode: "E001", faultCodeDescription: "Desc", faultCodeLabourQuantity: 2 };
    handleFaultCodeSelection(rawItem, setFieldValue, allFields, formValues);
    // setFieldValue still called for the 3 faultCode fields, but not for quantity
    expect(setFieldValue).not.toHaveBeenCalledWith(
      expect.stringContaining("quantity"),
      expect.anything(),
    );
  });
});

// ── resolveIsRequired ────────────────────────────────────────────────────────

describe("resolveIsRequired", () => {
  it("returns field.isRequired when no requiredDependentFields", () => {
    const field = makeField("f1", undefined, { isRequired: true });
    expect(resolveIsRequired(field, {})).toBe(true);
  });

  it("returns field.isRequired when requiredDependentFields has no byValueOr or byValueAnd", () => {
    const field = makeField("f1", undefined, {
      isRequired: false,
      requiredDependentFields: {} as any,
    });
    expect(resolveIsRequired(field, {})).toBe(false);
  });

  it("returns true when ALL byValueAnd conditions are met", () => {
    const field = makeField("f1", undefined, {
      requiredDependentFields: {
        byValueAnd: [
          { fieldName: "actionType", fieldValue: "REPAIR" },
          { fieldName: "jobType", fieldValue: "WARRANTY" },
        ],
      } as any,
    });
    const values = { actionType: "REPAIR", jobType: "WARRANTY" };
    expect(resolveIsRequired(field, values)).toBe(true);
  });

  it("returns false when NOT all byValueAnd conditions are met", () => {
    const field = makeField("f1", undefined, {
      requiredDependentFields: {
        byValueAnd: [
          { fieldName: "actionType", fieldValue: "REPAIR" },
          { fieldName: "jobType", fieldValue: "WARRANTY" },
        ],
      } as any,
    });
    const values = { actionType: "REPAIR", jobType: "CHARGEABLE" };
    expect(resolveIsRequired(field, values)).toBe(false);
  });

  it("returns true when ANY byValueOr condition is met", () => {
    const field = makeField("f1", undefined, {
      requiredDependentFields: {
        byValueOr: [
          { fieldName: "actionType", fieldValue: "REPAIR" },
          { fieldName: "actionType", fieldValue: "EXCHANGE" },
        ],
      } as any,
    });
    const values = { actionType: "REPAIR" };
    expect(resolveIsRequired(field, values)).toBe(true);
  });

  it("returns false when no byValueOr condition is met", () => {
    const field = makeField("f1", undefined, {
      requiredDependentFields: {
        byValueOr: [{ fieldName: "actionType", fieldValue: "REPAIR" }],
      } as any,
    });
    const values = { actionType: "EXCHANGE" };
    expect(resolveIsRequired(field, values)).toBe(false);
  });

  it("returns false when both byValueAnd and byValueOr are empty arrays", () => {
    const field = makeField("f1", undefined, {
      isRequired: false,
      requiredDependentFields: { byValueAnd: [], byValueOr: [] } as any,
    });
    expect(resolveIsRequired(field, {})).toBe(false);
  });
});
