import { describe, it, expect } from "vitest";
import {
  computeIsChargeable,
  getChargeablePendingInfo,
  getBoschInternalPending,
  hasWarrantyOrProServiceItems,
  buildRowValues,
  buildMaterialsRowValues,
  type MaterialItem,
} from "./useDiagnosticsManager";
import type Field from "components/generics/Field/GenericField.types";
import type Area from "components/generics/Area/GenericArea.types";

// The useDiagnosticsManager hook itself (and every fixture/mock that existed only to support
// it — createHookProps, makeUser/makeCountryConfig/makeAllowedPosition,
// useQueryClient/useBareSalesRelation mocks) was deleted in Phase 5 step 10
// (items-and-prices-refactor.md §15): JobOverview.tsx/ClaimOverview.tsx now call
// useItemsManager instead (step 8), and every case that used to exercise the hook here was
// ported to useItemsManager.test.ts's job-shaped-config section, or confirmed already covered
// there. What remains below tests only the pure helpers that still live in this file
// (computeIsChargeable/hasWarrantyOrProServiceItems/getChargeablePendingInfo/
// getBoschInternalPending — job-diagnostic-tab-specific, never moved) and the ones re-exported
// from materialsDerivation.ts (buildRowValues/buildMaterialsRowValues) — both still live,
// real code paths.

const makeField = (name: string, subtype?: string, overrides: Partial<Field> = {}): Field => ({
  name,
  label: name,
  type: "text",
  subtype,
  isDisabled: false,
  ...overrides,
});

const makeItem = (overrides: Partial<MaterialItem> = {}): MaterialItem => ({
  position: "SP",
  partNumber: "12345",
  description: "Spare Part",
  type: "CHARGEABLE",
  quantity: 2,
  unitPrice: 50,
  netAmount: 100,
  tax: 19,
  grossAmount: 119,
  discount: 0,
  taxAmount: 19,
  totalAmount: 119,
  ...overrides,
});

const makeArea = (name: string, fields: Field[], index = 0): Area => ({
  name,
  label: name,
  position: 0,
  fields,
  dependFieldCondition: "AND",
  dependentFields: [],
  actions: null,
  isSubArea: false,
  isMultiple: true,
  index,
});

// ── computeIsChargeable ──────────────────────────────────────────────────────

describe("computeIsChargeable", () => {
  it("returns null when no diagnosticType fields exist", () => {
    const fields = [makeField("someField")];
    const values = { someField: "REPAIR" };
    expect(computeIsChargeable(fields, values)).toBeNull();
  });

  it("returns true when any diagnosticType field equals CHARGEABLE", () => {
    const fields = [makeField("type1", "diagnosticType"), makeField("type2", "diagnosticType")];
    const values = { type1: "WARRANTY", type2: "CHARGEABLE" };
    expect(computeIsChargeable(fields, values)).toBe(true);
  });

  it("returns false when all diagnosticType fields are non-CHARGEABLE", () => {
    const fields = [makeField("type1", "diagnosticType")];
    const values = { type1: "WARRANTY" };
    expect(computeIsChargeable(fields, values)).toBe(false);
  });

  it("returns false when diagnosticType field value is empty", () => {
    const fields = [makeField("type1", "diagnosticType")];
    const values = { type1: "" };
    expect(computeIsChargeable(fields, values)).toBe(false);
  });
});

// ── hasWarrantyOrProServiceItems ───────────────────────────────────────────

describe("hasWarrantyOrProServiceItems", () => {
  it("returns true when a diagnostic type is WARRANTY", () => {
    const fields = [makeField("type1", "diagnosticType")];
    const values = { type1: "WARRANTY" };

    expect(hasWarrantyOrProServiceItems(fields, values)).toBe(true);
  });

  it("returns true when a diagnostic type is SERVICE_OFFERING", () => {
    const fields = [makeField("type1", "diagnosticType")];
    const values = { type1: "SERVICE_OFFERING" };

    expect(hasWarrantyOrProServiceItems(fields, values)).toBe(true);
  });

  it("returns false when diagnostic types do not match", () => {
    const fields = [makeField("type1", "diagnosticType")];
    const values = { type1: "CHARGEABLE" };

    expect(hasWarrantyOrProServiceItems(fields, values)).toBe(false);
  });
});

// ── getChargeablePendingInfo ─────────────────────────────────────────────────

describe("getChargeablePendingInfo", () => {
  it("returns no pending when all chargeable rows are APPROVED", () => {
    const fields = [
      makeField("type1", "diagnosticType"),
      makeField("status1", "diagnosticMaterialStatus"),
    ];
    const values = { type1: "CHARGEABLE", status1: "APPROVED" };
    const { hasChargeablePending } = getChargeablePendingInfo(fields, values);
    expect(hasChargeablePending).toBe(false);
  });

  it("returns pending when a CHARGEABLE row is not APPROVED", () => {
    const fields = [
      makeField("type1", "diagnosticType"),
      makeField("status1", "diagnosticMaterialStatus"),
    ];
    const values = { type1: "CHARGEABLE", status1: "PENDING" };
    const { hasChargeablePending } = getChargeablePendingInfo(fields, values);
    expect(hasChargeablePending).toBe(true);
  });

  it("returns pending for SPECIAL_CONTRACT row not APPROVED", () => {
    const fields = [
      makeField("type1", "diagnosticType"),
      makeField("status1", "diagnosticMaterialStatus"),
    ];
    const values = { type1: "SPECIAL_CONTRACT", status1: "PENDING" };
    const { hasChargeablePending } = getChargeablePendingInfo(fields, values);
    expect(hasChargeablePending).toBe(true);
  });

  it("returns false when WARRANTY row is not APPROVED (not chargeable)", () => {
    const fields = [
      makeField("type1", "diagnosticType"),
      makeField("status1", "diagnosticMaterialStatus"),
    ];
    const values = { type1: "WARRANTY", status1: "PENDING" };
    const { hasChargeablePending } = getChargeablePendingInfo(fields, values);
    expect(hasChargeablePending).toBe(false);
  });

  it("marks row as pending when status field is absent", () => {
    const fields = [makeField("type1", "diagnosticType")];
    const values = { type1: "CHARGEABLE" };
    const { hasChargeablePending, pendingTypeFields } = getChargeablePendingInfo(fields, values);
    expect(hasChargeablePending).toBe(true);
    expect(pendingTypeFields).toHaveLength(1);
  });
});

// ── getBoschInternalPending ──────────────────────────────────────────────────

describe("getBoschInternalPending", () => {
  it("returns pending for COMMERCIAL_GOODWILL row not APPROVED", () => {
    const fields = [
      makeField("type1", "diagnosticType"),
      makeField("status1", "diagnosticMaterialStatus"),
    ];
    const values = { type1: "COMMERCIAL_GOODWILL", status1: "PENDING" };
    const { hasBoschInternalPending } = getBoschInternalPending(fields, values);
    expect(hasBoschInternalPending).toBe(true);
  });

  it("returns pending for WARRANTY row with exchange actionType", () => {
    const fields = [
      makeField("type1", "diagnosticType"),
      makeField("status1", "diagnosticMaterialStatus"),
    ];
    const values = { type1: "WARRANTY", status1: "PENDING", actionType: "NEW_TOOL_EXCHANGE" };
    const { hasBoschInternalPending } = getBoschInternalPending(fields, values);
    expect(hasBoschInternalPending).toBe(true);
  });

  it("returns pending for SERVICE_OFFERING row with exchange actionType", () => {
    const fields = [
      makeField("type1", "diagnosticType"),
      makeField("status1", "diagnosticMaterialStatus"),
    ];
    const values = {
      type1: "SERVICE_OFFERING",
      status1: "PENDING",
      actionType: "SPARE_PARTS_EXCHANGE",
    };
    const { hasBoschInternalPending } = getBoschInternalPending(fields, values);
    expect(hasBoschInternalPending).toBe(true);
  });

  it("returns false for WARRANTY row with non-exchange actionType (REPAIR)", () => {
    const fields = [
      makeField("type1", "diagnosticType"),
      makeField("status1", "diagnosticMaterialStatus"),
    ];
    const values = { type1: "WARRANTY", status1: "PENDING", actionType: "REPAIR" };
    const { hasBoschInternalPending } = getBoschInternalPending(fields, values);
    expect(hasBoschInternalPending).toBe(false);
  });

  it("returns false when all rows are APPROVED", () => {
    const fields = [
      makeField("type1", "diagnosticType"),
      makeField("status1", "diagnosticMaterialStatus"),
    ];
    const values = { type1: "COMMERCIAL_GOODWILL", status1: "APPROVED" };
    const { hasBoschInternalPending } = getBoschInternalPending(fields, values);
    expect(hasBoschInternalPending).toBe(false);
  });

  it("returns false for CHARGEABLE row (not a Bosch internal type)", () => {
    const fields = [
      makeField("type1", "diagnosticType"),
      makeField("status1", "diagnosticMaterialStatus"),
    ];
    const values = { type1: "CHARGEABLE", status1: "PENDING", actionType: "REPAIR" };
    const { hasBoschInternalPending } = getBoschInternalPending(fields, values);
    expect(hasBoschInternalPending).toBe(false);
  });
});

// ── buildRowValues ───────────────────────────────────────────────────────────

describe("buildRowValues", () => {
  it("maps item fields to area fields by subtype", () => {
    const areaFields: Field[] = [
      makeField("sparePart_position", "diagnosticPosition"),
      makeField("sparePart_partNumber", "diagnosticPartNumber"),
      makeField("sparePart_quantity", "diagnosticQuantity"),
      makeField("sparePart_unitPrice", "diagnosticUnitPrice"),
      makeField("sparePart_status", "diagnosticMaterialStatus"),
    ];
    const item = makeItem({
      position: "SP",
      partNumber: "ABC",
      quantity: 3,
      unitPrice: 100,
      status: "PENDING",
    });
    const result = buildRowValues(areaFields, item);

    expect(result["sparePart_position"]).toBe("SP");
    expect(result["sparePart_partNumber"]).toBe("ABC");
    expect(result["sparePart_quantity"]).toBe(3);
    expect(result["sparePart_unitPrice"]).toBe(100);
    expect(result["sparePart_status"]).toBe("PENDING");
  });

  it("uses default status PENDING when item has no status", () => {
    const areaFields: Field[] = [makeField("status_field", "diagnosticMaterialStatus")];
    const item = makeItem({ status: undefined });
    const result = buildRowValues(areaFields, item);
    expect(result["status_field"]).toBe("PENDING");
  });

  it("computes suggestedNetPrice from qty*unitPrice when item.suggestedNetPrice is 0", () => {
    const areaFields: Field[] = [makeField("snp", "diagnosticSuggestedNetPrice")];
    const item = makeItem({ quantity: 4, unitPrice: 25, suggestedNetPrice: 0 });
    const result = buildRowValues(areaFields, item);
    expect(result["snp"]).toBe(100);
  });

  it("uses item.suggestedNetPrice when provided and non-zero", () => {
    const areaFields: Field[] = [makeField("snp", "diagnosticSuggestedNetPrice")];
    const item = makeItem({ quantity: 4, unitPrice: 25, suggestedNetPrice: 90 });
    const result = buildRowValues(areaFields, item);
    expect(result["snp"]).toBe(90);
  });

  it("uses field defaultValue for unknown subtypes", () => {
    const areaFields: Field[] = [
      makeField("unknown_field", "unknownSubtype", { defaultValue: "DEFAULT" }),
    ];
    const item = makeItem();
    const result = buildRowValues(areaFields, item);
    expect(result["unknown_field"]).toBe("DEFAULT");
  });

  it("uses empty string as fallback when no subtype match and no defaultValue", () => {
    const areaFields: Field[] = [makeField("mystery_field", "noSuchSubtype")];
    const item = makeItem();
    const result = buildRowValues(areaFields, item);
    expect(result["mystery_field"]).toBe("");
  });

  it("defaults discount to 0 when item.discount is undefined", () => {
    const areaFields: Field[] = [makeField("disc", "diagnosticDiscount")];
    const item = makeItem({ discount: undefined });
    const result = buildRowValues(areaFields, item);
    expect(result["disc"]).toBe(0);
  });

  it("defaults totalAmount to 0 when item.totalAmount is 0", () => {
    const areaFields: Field[] = [makeField("total", "diagnosticTotalAmount")];
    const item = makeItem({ totalAmount: 0 });
    const result = buildRowValues(areaFields, item);
    expect(result["total"]).toBe(0);
  });
});

describe("buildMaterialsRowValues (LA quantity sync)", () => {
  const rowFields: Field[] = [
    makeField("row0_position", "diagnosticPosition"),
    makeField("row0_quantity", "diagnosticQuantity"),
  ];
  const rowArea = makeArea("row0", rowFields);

  it("overrides the LA row's quantity with the freshly computed value even when reusing existing row values", () => {
    const item = makeItem({ position: "LA", quantity: 3 });
    const formValues = {
      row0_position: "LA",
      row0_quantity: 99,
    };

    const result = buildMaterialsRowValues({
      materials: [item],
      areas: [rowArea],
      fields: rowFields,
      formValues,
      currentCount: 1,
      forceRebuild: false,
    });

    expect(result["row0_quantity"]).toBe(3);
  });

  it("keeps the existing quantity for non-LA rows when reusing existing row values", () => {
    const item = makeItem({ position: "SP", quantity: 3 });
    const formValues = {
      row0_position: "SP",
      row0_quantity: 99,
    };

    const result = buildMaterialsRowValues({
      materials: [item],
      areas: [rowArea],
      fields: rowFields,
      formValues,
      currentCount: 1,
      forceRebuild: false,
    });

    expect(result["row0_quantity"]).toBe(99);
  });

  it("backfills blank description from API when reusing existing row values", () => {
    const rowFields: Field[] = [
      makeField("row0_position", "diagnosticPosition"),
      makeField("row0_sparePartNumber", "diagnosticPartNumber"),
      makeField("row0_description", "diagnosticDescription"),
    ];
    const rowArea = makeArea("row0", rowFields);
    const item = makeItem({ position: "PN", description: "Updated description" });
    const formValues = {
      row0_position: "PN",
      row0_sparePartNumber: "06019H2103",
      row0_description: "",
    };

    const result = buildMaterialsRowValues({
      materials: [item],
      areas: [rowArea],
      fields: rowFields,
      formValues,
      currentCount: 1,
      forceRebuild: false,
    });

    expect(result["row0_description"]).toBe("Updated description");
  });
});

