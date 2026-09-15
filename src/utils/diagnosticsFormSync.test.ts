import { describe, it, expect, vi } from "vitest";
import type Field from "components/generics/Field/GenericField.types";
import type { DiagnosticPriceSummaryDetailed } from "api/services/diagnosticPricing/diagnosticPricing.types";
import {
  applyPricePatch,
  buildPriceSummaryPatch,
  buildPricingLines,
  findRowChange,
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
  rowField(ROW_0, "diagnosticMaterialId"),
  rowField("claims_claimSpareParts#0", "diagnosticPosition"),
  { name: "summaryUnrelated", subtype: "diagnosticType" } as unknown as Field,
];

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

describe("buildPricingLines", () => {
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
    const [first] = buildPricingLines(rows, values);
    expect(first).toMatchObject({
      lineId: "row-0",
      position: "SP",
      partNumber: "1600A1",
      jobType: "CHARGEABLE",
      quantity: 2,
      unitPrice: 25,
      discountPercentage: 10,
      totalAmount: 52.5,
    });
  });

  it("uses the material id as lineId once the row has one", () => {
    const rows = groupRowFields(allFields, "diagnosticsSpareParts");
    const values = { [`${ROW_0}_diagnosticMaterialId`]: "SP_1600A1_CHARGEABLE" };
    const [first] = buildPricingLines(rows, values);
    expect(first.lineId).toBe("SP_1600A1_CHARGEABLE");
  });
});

describe("findRowChange", () => {
  it("returns null without a baseline (the first settle is the as-loaded state)", () => {
    const rows = groupRowFields(allFields, "diagnosticsSpareParts");
    const values = { [`${ROW_0}_diagnosticQuantity`]: 2 };
    const snapshot = buildSnapshotFor(rows, values);
    expect(findRowChange(rows, values, null, snapshot)).toBeNull();
  });

  it("finds the first changed price field, in priority order, and builds its change", () => {
    const rows = groupRowFields(allFields, "diagnosticsSpareParts");
    const before = { [`${ROW_0}_diagnosticQuantity`]: 2, [`${ROW_0}_diagnosticUnitPrice`]: 25 };
    const after = { [`${ROW_0}_diagnosticQuantity`]: 3, [`${ROW_0}_diagnosticUnitPrice`]: 25 };
    const prev = buildSnapshotFor(rows, before);
    const next = buildSnapshotFor(rows, after);
    expect(findRowChange(rows, after, prev, next)).toEqual({
      type: "SET_QUANTITY",
      lineId: "row-0",
      value: 3,
    });
  });

  it("returns null for a position/partNumber/type-only change", () => {
    const rows = groupRowFields(allFields, "diagnosticsSpareParts");
    const before = { [`${ROW_0}_diagnosticPosition`]: "SP" };
    const after = { [`${ROW_0}_diagnosticPosition`]: "PN" };
    const prev = buildSnapshotFor(rows, before);
    const next = buildSnapshotFor(rows, after);
    expect(findRowChange(rows, after, prev, next)).toBeNull();
  });
});

// Local helper mirroring DiagnosticsPricingProvider's own snapshot builder, scoped to this test file
// so it doesn't need to import a private symbol.
const PRICE_SUBTYPES = [
  "diagnosticQuantity",
  "diagnosticUnitPrice",
  "diagnosticDiscount",
  "diagnosticDiscountHidden",
  "diagnosticNetAmount",
  "diagnosticGrossAmount",
  "diagnosticTotalAmount",
  "diagnosticPosition",
];
function buildSnapshotFor(
  rows: ReturnType<typeof groupRowFields>,
  values: Record<string, unknown>,
): Map<string, string> {
  const snapshot = new Map<string, string>();
  for (const row of rows) {
    for (const subtype of PRICE_SUBTYPES) {
      const name = row.bySubtype[subtype];
      const value = name ? values[name] : undefined;
      snapshot.set(`${row.order}:${subtype}`, value === undefined ? "" : String(value));
    }
  }
  return snapshot;
}

describe("summary mapping", () => {
  const summaryFields = [
    { name: "sumTotal", subtype: "diagnosticSummaryTotalAmount" },
    { name: "sumDiscountHidden", subtype: "diagnosticSummaryDiscountHidden" },
    { name: "sumTotalMaterial", subtype: "diagnosticSummaryTotalAmountMaterial" },
    { name: "sumRadio", subtype: "diagnosticSummaryType" },
  ] as unknown as Field[];

  const totalBlock = {
    netAmount: 50,
    suggestedNetPrice: 50,
    taxAmount: 7.5,
    grossAmount: 57.5,
    discount: 10,
    totalAmount: 52.5,
  };
  const detailed: DiagnosticPriceSummaryDetailed = {
    total: totalBlock,
    byJobType: {
      CHARGEABLE: {
        total: totalBlock,
        materialRelated: { ...totalBlock, totalAmount: 40 },
      },
      WARRANTY: { total: totalBlock },
    },
  };

  it("converts UI summary types to backend types", () => {
    expect(toBackendSummaryType("totalSummary")).toBe("TOTAL");
    expect(toBackendSummaryType("")).toBe("TOTAL");
    expect(toBackendSummaryType("commercialGoodwill")).toBe("COMMERCIAL_GOODWILL");
  });

  it("maps the total block for the totalSummary type", () => {
    const patch = buildPriceSummaryPatch(summaryFields, detailed, "totalSummary");
    expect(patch).toEqual({ sumTotal: 52.5, sumDiscountHidden: 10 });
  });

  it("maps price and material blocks for a specific job type", () => {
    const patch = buildPriceSummaryPatch(summaryFields, detailed, "chargeable");
    expect(patch).toEqual({ sumTotal: 52.5, sumDiscountHidden: 10, sumTotalMaterial: 40 });
  });

  it("skips material fields when the backend omits the material block", () => {
    const patch = buildPriceSummaryPatch(summaryFields, detailed, "warranty");
    expect(patch.sumTotalMaterial).toBeUndefined();
  });

  it("returns an empty patch without a detailed summary", () => {
    expect(buildPriceSummaryPatch(summaryFields, undefined, "totalSummary")).toEqual({});
  });
});

describe("applyPricePatch", () => {
  it("writes changed values, skipping equal values and the active field", () => {
    const setFieldValue = vi.fn();
    applyPricePatch({ a: 10, b: 20, c: 30 }, { a: 10, b: 5, c: 0 }, setFieldValue, "c");
    expect(setFieldValue).toHaveBeenCalledExactlyOnceWith("b", 20);
  });
});
