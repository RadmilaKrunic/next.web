import { describe, it, expect, vi } from "vitest";
import type Field from "components/generics/Field/GenericField.types";
import type { DiagnosticPricingResponse } from "api/services/diagnosticPricing/diagnosticPricing.types";
import {
  applyPricePatch,
  buildMaterialPricePatch,
  buildPricingMaterials,
  buildSummaryPricePatch,
  findSummary,
  groupRowFields,
  toBackendSummaryType,
} from "./diagnosticsFormSync";

const rowField = (prefix: string, subtype: string): Field =>
  ({
    name: `${prefix}_${subtype}`,
    subtype,
    fieldMapping: { nameStartsWith: prefix },
  }) as unknown as Field;

const ROW_0 = "diagnosticData_diagnosticsSpareParts#0";
const ROW_1 = "diagnosticData_diagnosticsSpareParts#1";

const allFields: Field[] = [
  rowField(ROW_1, "diagnosticPosition"),
  rowField(ROW_1, "diagnosticQuantity"),
  rowField(ROW_1, "diagnosticTotalAmount"),
  rowField(ROW_0, "diagnosticPosition"),
  rowField(ROW_0, "diagnosticPartNumber"),
  rowField(ROW_0, "diagnosticType"),
  rowField(ROW_0, "diagnosticQuantity"),
  rowField(ROW_0, "diagnosticUnitPrice"),
  rowField(ROW_0, "diagnosticDiscountHidden"),
  rowField(ROW_0, "diagnosticTotalAmount"),
  rowField("claims_claimSpareParts#0", "diagnosticPosition"),
  { name: "summaryUnrelated", subtype: "diagnosticType" } as unknown as Field,
];

const price = {
  discount: 10,
  discountAmount: 5,
  suggestedNetPrice: 50,
  unitPrice: 25,
  netAmount: 50,
  tax: 15,
  taxAmount: 7.5,
  grossAmount: 57.5,
  totalAmount: 52.5,
};

describe("groupRowFields", () => {
  it("groups only matching areas, ordered by row index", () => {
    const rows = groupRowFields(allFields, "diagnosticsSpareParts");
    expect(rows.map((r) => r.order)).toEqual([0, 1]);
    expect(rows[0].bySubtype.diagnosticUnitPrice).toBe(`${ROW_0}_diagnosticUnitPrice`);
  });

  it("returns an empty list without fields", () => {
    expect(groupRowFields(null, "diagnosticsSpareParts")).toEqual([]);
  });
});

describe("buildPricingMaterials", () => {
  it("reads row values into the request payload", () => {
    const rows = groupRowFields(allFields, "diagnosticsSpareParts");
    const values = {
      [`${ROW_0}_diagnosticPosition`]: "SP",
      [`${ROW_0}_diagnosticPartNumber`]: "1600A1",
      [`${ROW_0}_diagnosticType`]: "CHARGEABLE",
      [`${ROW_0}_diagnosticQuantity`]: 2,
      [`${ROW_0}_diagnosticUnitPrice`]: 25,
      [`${ROW_0}_diagnosticDiscountHidden`]: 10,
      [`${ROW_0}_diagnosticTotalAmount`]: 52.5,
    };
    const [first] = buildPricingMaterials(rows, values);
    expect(first).toMatchObject({
      order: 0,
      position: "SP",
      partNumber: "1600A1",
      type: "CHARGEABLE",
      quantity: 2,
      unitPrice: 25,
      discount: 10,
      totalAmount: 52.5,
    });
    expect(first.id).toBeUndefined();
  });
});

describe("buildMaterialPricePatch", () => {
  it("maps backend prices onto row field names by order", () => {
    const rows = groupRowFields(allFields, "diagnosticsSpareParts");
    const response: DiagnosticPricingResponse = {
      materials: [{ order: 0, position: "SP", price }],
      summaries: [],
    };
    const patch = buildMaterialPricePatch(rows, response);
    expect(patch[`${ROW_0}_diagnosticUnitPrice`]).toBe(25);
    expect(patch[`${ROW_0}_diagnosticDiscountHidden`]).toBe(10);
    expect(patch[`${ROW_0}_diagnosticTotalAmount`]).toBe(52.5);
    // Unpriced row is untouched.
    expect(patch[`${ROW_1}_diagnosticTotalAmount`]).toBeUndefined();
    // Non-price fields are not patched.
    expect(patch[`${ROW_0}_diagnosticPosition`]).toBeUndefined();
  });
});

describe("summary mapping", () => {
  const summaryFields = [
    { name: "sumTotal", subtype: "diagnosticSummaryTotalAmount" },
    { name: "sumDiscountHidden", subtype: "diagnosticSummaryDiscountHidden" },
    { name: "sumTotalMaterial", subtype: "diagnosticSummaryTotalAmountMaterial" },
    { name: "sumRadio", subtype: "diagnosticSummaryType" },
  ] as unknown as Field[];

  const response: DiagnosticPricingResponse = {
    materials: [],
    summaries: [
      { type: "TOTAL", price, materialPrice: { ...price, totalAmount: 40 } },
      { type: "CHARGEABLE", price },
    ],
  };

  it("converts UI summary types to backend types", () => {
    expect(toBackendSummaryType("totalSummary")).toBe("TOTAL");
    expect(toBackendSummaryType("")).toBe("TOTAL");
    expect(toBackendSummaryType("commercialGoodwill")).toBe("COMMERCIAL_GOODWILL");
  });

  it("finds a summary case-insensitively", () => {
    expect(findSummary(response, "total")?.type).toBe("TOTAL");
    expect(findSummary(response, "WARRANTY")).toBeNull();
    expect(findSummary(null, "TOTAL")).toBeNull();
  });

  it("maps price and material blocks to their fields", () => {
    const patch = buildSummaryPricePatch(summaryFields, findSummary(response, "TOTAL"));
    expect(patch).toEqual({ sumTotal: 52.5, sumDiscountHidden: 10, sumTotalMaterial: 40 });
  });

  it("skips material fields when the backend omits the material block", () => {
    const patch = buildSummaryPricePatch(summaryFields, findSummary(response, "CHARGEABLE"));
    expect(patch.sumTotalMaterial).toBeUndefined();
  });

  it("returns an empty patch without a summary", () => {
    expect(buildSummaryPricePatch(summaryFields, null)).toEqual({});
  });
});

describe("applyPricePatch", () => {
  it("writes changed values, skipping equal values and the active field", () => {
    const setFieldValue = vi.fn();
    applyPricePatch({ a: 10, b: 20, c: 30 }, { a: 10, b: 5, c: 0 }, setFieldValue, "c");
    expect(setFieldValue).toHaveBeenCalledExactlyOnceWith("b", 20);
  });
});
