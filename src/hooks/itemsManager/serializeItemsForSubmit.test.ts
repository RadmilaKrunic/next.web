import { describe, it, expect } from "vitest";
import { makeFieldGetter, serializeItemsForSubmit, aggregatePriceSummary } from "./serializeItemsForSubmit";
import type Field from "components/generics/Field/GenericField.types";
import type Area from "components/generics/Area/GenericArea.types";
import type { Material } from "modules/ClaimManagement/ClaimOverview/Claims.types";

// Phase 5 unification (items-and-prices-refactor.md §15 step 9) — table-driven equivalence
// tests proving serializeItemsForSubmit/aggregatePriceSummary reproduce ClaimOverview.tsx's
// onValidateClaim's original inline construction exactly.

const buildField = (name: string, subtype: string): Field =>
  ({ name, subtype, label: "", type: "text" }) as Field;

const buildArea = (prefix: string): Area =>
  ({
    name: prefix,
    label: "",
    position: 0,
    isMultiple: true,
    fields: [
      buildField(`${prefix}_position`, "diagnosticPosition"),
      buildField(`${prefix}_partNumber`, "diagnosticPartNumber"),
      buildField(`${prefix}_description`, "diagnosticDescription"),
      buildField(`${prefix}_type`, "diagnosticType"),
      buildField(`${prefix}_quantity`, "diagnosticQuantity"),
      buildField(`${prefix}_order`, "diagnosticOrder"),
      buildField(`${prefix}_unitPrice`, "diagnosticUnitPrice"),
      buildField(`${prefix}_suggestedNetPrice`, "diagnosticSuggestedNetPrice"),
      buildField(`${prefix}_netAmount`, "diagnosticNetAmount"),
      buildField(`${prefix}_tax`, "diagnosticTax"),
      buildField(`${prefix}_taxAmount`, "diagnosticTaxAmount"),
      buildField(`${prefix}_grossAmount`, "diagnosticGrossAmount"),
      buildField(`${prefix}_totalAmount`, "diagnosticTotalAmount"),
    ],
  }) as Area;

const buildOriginalMaterial = (overrides: Partial<Material> = {}): Material => ({
  position: "SP",
  partNumber: "OLD-PN",
  jobType: "WARRANTY",
  status: "PENDING",
  approvedBy: "",
  approvedByName: "",
  approvedAt: "",
  description: "Old description",
  quantity: 1,
  isValidated: false,
  isPriceManuallySet: false,
  price: {
    discount: 5,
    suggestedNetPrice: 0,
    taxAmount: 0,
    unitPrice: 0,
    netAmount: 0,
    tax: 3,
    grossAmount: 0,
    totalAmount: 0,
  },
  ...overrides,
});

describe("makeFieldGetter", () => {
  it("returns the form value for a field matching the given subtype", () => {
    const fields = [buildField("row0_position", "diagnosticPosition")];
    const get = makeFieldGetter(fields, { row0_position: "LA" });
    expect(get("diagnosticPosition")).toBe("LA");
  });

  it("returns undefined when no field has that subtype", () => {
    const get = makeFieldGetter([], {});
    expect(get("diagnosticPosition")).toBeUndefined();
  });
});

describe("serializeItemsForSubmit", () => {
  it("overrides position/partNumber/description/jobType/quantity/order from form values", () => {
    const area = buildArea("row0");
    const original = buildOriginalMaterial();
    const formValues = {
      row0_position: "LA",
      row0_partNumber: "NEW-PN",
      row0_description: "New description",
      row0_type: "CHARGEABLE",
      row0_quantity: 3,
      row0_order: 2,
      row0_unitPrice: 10,
      row0_suggestedNetPrice: 11,
      row0_netAmount: 9,
      row0_tax: 20,
      row0_taxAmount: 1.8,
      row0_grossAmount: 10.8,
      row0_totalAmount: 10.8,
    };

    const [result] = serializeItemsForSubmit([area], formValues, [original]);

    expect(result.position).toBe("LA");
    expect(result.partNumber).toBe("NEW-PN");
    expect(result.description).toBe("New description");
    expect(result.jobType).toBe("CHARGEABLE");
    expect(result.quantity).toBe(3);
    expect(result.order).toBe(2);
    expect(result.isPriceSetManually).toBe(false);
    expect(result.price).toEqual({
      unitPrice: 10,
      suggestedNetPrice: 11,
      netAmount: 9,
      tax: 20,
      taxAmount: 1.8,
      grossAmount: 10.8,
      // discount is NOT read from form values — always carried through from original.price.
      discount: 5,
      totalAmount: 10.8,
    });
  });

  it("carries through every other original Material field unchanged (status, approvedBy, etc.)", () => {
    const area = buildArea("row0");
    const original = buildOriginalMaterial({
      status: "APPROVED",
      approvedBy: "user-1",
      approvedByName: "Jane Doe",
      approvedAt: "2026-01-01",
      isValidated: true,
      reimbursementPaymentMethod: "BANK_TRANSFER",
    });

    const [result] = serializeItemsForSubmit([area], {}, [original]);

    expect(result.status).toBe("APPROVED");
    expect(result.approvedBy).toBe("user-1");
    expect(result.approvedByName).toBe("Jane Doe");
    expect(result.approvedAt).toBe("2026-01-01");
    expect(result.isValidated).toBe(true);
    expect(result.reimbursementPaymentMethod).toBe("BANK_TRANSFER");
  });

  it("falls back to the original material's fields when a form field is absent", () => {
    const area = buildArea("row0");
    const original = buildOriginalMaterial({ position: "FR", partNumber: "FR-1", quantity: 4 });

    const [result] = serializeItemsForSubmit([area], {}, [original]);

    expect(result.position).toBe("FR");
    expect(result.partNumber).toBe("FR-1");
    expect(result.quantity).toBe(4);
  });

  it("falls back to defaults ('', 1, idx + 1) when there is no original material at all (a brand-new row)", () => {
    const area = buildArea("row0");

    const [result] = serializeItemsForSubmit([area], {}, undefined);

    expect(result.position).toBe("");
    expect(result.partNumber).toBe("");
    expect(result.description).toBe("");
    expect(result.jobType).toBe("");
    expect(result.quantity).toBe(1);
    expect(result.order).toBe(1);
    expect(result.price.discount).toBe(0);
    expect(result.price.tax).toBe(0);
  });

  it("uses idx + 1 as the order fallback for each row, matching original array position", () => {
    const areas = [buildArea("row0"), buildArea("row1"), buildArea("row2")];

    const results = serializeItemsForSubmit(areas, {}, undefined);

    expect(results.map((r) => r.order)).toEqual([1, 2, 3]);
  });
});

describe("aggregatePriceSummary", () => {
  it("sums each price field across every material row", () => {
    const materials = [
      {
        price: { netAmount: 10, suggestedNetPrice: 11, grossAmount: 12, discount: 1, totalAmount: 12, taxAmount: 2 },
      },
      {
        price: { netAmount: 20, suggestedNetPrice: 22, grossAmount: 24, discount: 3, totalAmount: 24, taxAmount: 4 },
      },
    ];

    expect(aggregatePriceSummary(materials)).toEqual({
      netAmount: 30,
      suggestedNetPrice: 33,
      grossAmount: 36,
      discount: 4,
      totalAmount: 36,
      taxAmount: 6,
    });
  });

  it("treats a missing price object or missing fields as 0", () => {
    const materials = [{}, { price: { netAmount: 5 } }];

    expect(aggregatePriceSummary(materials)).toEqual({
      netAmount: 5,
      suggestedNetPrice: 0,
      grossAmount: 0,
      discount: 0,
      totalAmount: 0,
      taxAmount: 0,
    });
  });

  it("returns all-zero for an empty materials array", () => {
    expect(aggregatePriceSummary([])).toEqual({
      netAmount: 0,
      suggestedNetPrice: 0,
      grossAmount: 0,
      discount: 0,
      totalAmount: 0,
      taxAmount: 0,
    });
  });
});
