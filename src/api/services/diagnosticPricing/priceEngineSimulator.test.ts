import { describe, it, expect } from "vitest";
import { calculatePrices, roundToTwo } from "utils/priceCalculator";
import { simulateDiagnosticPricing } from "./priceEngineSimulator";
import { TOTAL_SUMMARY_TYPE, type DiagnosticPricingMaterialInput } from "./diagnosticPricing.types";

const material = (
  overrides: Partial<DiagnosticPricingMaterialInput>,
): DiagnosticPricingMaterialInput => ({
  order: 0,
  position: "SP",
  partNumber: "P1",
  type: "CHARGEABLE",
  quantity: 2,
  unitPrice: 50,
  discount: 10,
  tax: 20,
  netAmount: 100,
  grossAmount: 120,
  totalAmount: 108,
  ...overrides,
});

describe("simulateDiagnosticPricing", () => {
  it("recomputes the triggered row using the trigger's mapped field via calculatePrices", () => {
    const m = material({ order: 0, quantity: 3 });
    const response = simulateDiagnosticPricing({
      actionType: "REPAIR",
      jobType: "CHARGEABLE",
      trigger: "quantity",
      triggeredByOrder: 0,
      materials: [m],
    });

    const expected = calculatePrices(
      {
        quantity: m.quantity,
        unitPrice: m.unitPrice,
        taxPercent: m.tax,
        discountPercent: m.discount,
        suggestedNetPrice: m.netAmount,
        netAmount: m.netAmount,
        grossAmount: m.grossAmount,
        totalAmount: m.totalAmount,
        taxAmount: 0,
      },
      "quantity",
      m.quantity,
    );

    expect(response.materials[0]).toEqual({
      id: undefined,
      order: 0,
      position: "SP",
      price: {
        discount: expected.discountPercent,
        discountAmount: expected.discountAmount,
        suggestedNetPrice: expected.suggestedNetPrice,
        unitPrice: expected.unitPrice,
        netAmount: expected.netAmount,
        tax: expected.taxPercent,
        taxAmount: expected.taxAmount,
        grossAmount: expected.grossAmount,
        totalAmount: expected.totalAmount,
      },
    });
  });

  it("recomputes non-triggered rows from their own quantity, not the trigger's field", () => {
    const triggered = material({ order: 0, quantity: 3 });
    const sibling = material({ order: 1, quantity: 5, unitPrice: 20 });
    const response = simulateDiagnosticPricing({
      actionType: "REPAIR",
      jobType: "CHARGEABLE",
      trigger: "discount",
      triggeredByOrder: 0,
      materials: [triggered, sibling],
    });

    const siblingExpected = calculatePrices(
      {
        quantity: sibling.quantity,
        unitPrice: sibling.unitPrice,
        taxPercent: sibling.tax,
        discountPercent: sibling.discount,
        suggestedNetPrice: sibling.netAmount,
        netAmount: sibling.netAmount,
        grossAmount: sibling.grossAmount,
        totalAmount: sibling.totalAmount,
        taxAmount: 0,
      },
      "quantity",
      sibling.quantity,
    );
    expect(response.materials[1].price.totalAmount).toBe(siblingExpected.totalAmount);
  });

  it("defaults to a quantity-driven recompute for triggers with no mapped field (e.g. load)", () => {
    const m = material({ order: 0 });
    const response = simulateDiagnosticPricing({
      actionType: "REPAIR",
      jobType: "CHARGEABLE",
      trigger: "load",
      materials: [m],
    });
    const expected = calculatePrices(
      {
        quantity: m.quantity,
        unitPrice: m.unitPrice,
        taxPercent: m.tax,
        discountPercent: m.discount,
        suggestedNetPrice: m.netAmount,
        netAmount: m.netAmount,
        grossAmount: m.grossAmount,
        totalAmount: m.totalAmount,
        taxAmount: 0,
      },
      "quantity",
      m.quantity,
    );
    expect(response.materials[0].price.totalAmount).toBe(expected.totalAmount);
  });

  it("builds one summary per material type, plus a TOTAL roll-up over every row", () => {
    const chargeable = material({ order: 0, type: "CHARGEABLE" });
    const warranty = material({ order: 1, type: "WARRANTY", quantity: 1, unitPrice: 30 });
    const response = simulateDiagnosticPricing({
      actionType: "REPAIR",
      jobType: "CHARGEABLE",
      trigger: "load",
      materials: [chargeable, warranty],
    });

    const types = response.summaries.map((s) => s.type).sort();
    expect(types).toEqual(["CHARGEABLE", TOTAL_SUMMARY_TYPE, "WARRANTY"].sort());

    const total = response.summaries.find((s) => s.type === TOTAL_SUMMARY_TYPE);
    const sumNetAmount = roundToTwo(
      response.materials.reduce((sum, m) => sum + m.price.netAmount, 0),
    );
    expect(total?.price.netAmount).toBe(sumNetAmount);
  });

  it("scopes materialPrice to distributable positions only, and omits it when none apply", () => {
    const spareParty = material({ order: 0, position: "SP", type: "CHARGEABLE" });
    const labour = material({ order: 1, position: "LA", type: "CHARGEABLE" });
    const response = simulateDiagnosticPricing({
      actionType: "REPAIR",
      jobType: "CHARGEABLE",
      trigger: "load",
      materials: [spareParty, labour],
    });

    const summary = response.summaries.find((s) => s.type === "CHARGEABLE");
    expect(summary?.materialPrice?.netAmount).toBe(response.materials[0].price.netAmount);

    const labourOnly = simulateDiagnosticPricing({
      actionType: "REPAIR",
      jobType: "CHARGEABLE",
      trigger: "load",
      materials: [material({ order: 0, position: "LA", type: "CHARGEABLE" })],
    });
    expect(labourOnly.summaries.find((s) => s.type === "CHARGEABLE")?.materialPrice).toBeUndefined();
  });
});
