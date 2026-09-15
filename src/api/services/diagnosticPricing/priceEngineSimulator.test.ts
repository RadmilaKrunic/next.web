import { describe, it, expect } from "vitest";
import { calculatePrices, roundToTwo } from "utils/priceCalculator";
import { simulateDiagnosticPricing } from "./priceEngineSimulator";
import type { DiagnosticPricingLine, DiagnosticPricingRequest } from "./diagnosticPricing.types";

const line = (overrides: Partial<DiagnosticPricingLine>): DiagnosticPricingLine => ({
  lineId: "row-0",
  position: "SP",
  partNumber: "P1",
  jobType: "CHARGEABLE",
  quantity: 2,
  unitPrice: 50,
  taxPercentage: 20,
  discountPercentage: 10,
  totalNetAmount: 100,
  totalAmount: 108,
  ...overrides,
});

const request = (
  lines: DiagnosticPricingLine[],
  changes: DiagnosticPricingRequest["changes"],
): DiagnosticPricingRequest => ({
  requestId: "test-request-id",
  pricingContext: { country: "TR", ascId: "ASC8", scale: 2 },
  lines,
  changes,
});

describe("simulateDiagnosticPricing", () => {
  it("recomputes the changed line using the change's mapped field via calculatePrices", () => {
    const l = line({ lineId: "row-0", quantity: 3 });
    const response = simulateDiagnosticPricing(
      request([l], { type: "SET_QUANTITY", lineId: "row-0", value: 3 }),
    );

    const expected = calculatePrices(
      {
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxPercent: l.taxPercentage,
        discountPercent: l.discountPercentage,
        suggestedNetPrice: l.totalNetAmount,
        netAmount: l.totalNetAmount,
        grossAmount: 0,
        totalAmount: l.totalAmount,
        taxAmount: 0,
      },
      "quantity",
      l.quantity,
    );

    expect(response.materials[0]).toEqual({
      id: undefined,
      position: "SP",
      partNumber: "P1",
      jobType: "CHARGEABLE",
      quantity: 3,
      status: "PENDING",
      isPriceSetManually: false,
      notBelongsToTool: false,
      order: 1,
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

  it("recomputes non-changed lines from their own quantity, not the change's field", () => {
    const changed = line({ lineId: "row-0", quantity: 3 });
    const sibling = line({ lineId: "row-1", quantity: 5, unitPrice: 20 });
    const response = simulateDiagnosticPricing(
      request([changed, sibling], { type: "SET_DISCOUNT", lineId: "row-0", value: 15 }),
    );

    const siblingExpected = calculatePrices(
      {
        quantity: sibling.quantity,
        unitPrice: sibling.unitPrice,
        taxPercent: sibling.taxPercentage,
        discountPercent: sibling.discountPercentage,
        suggestedNetPrice: sibling.totalNetAmount,
        netAmount: sibling.totalNetAmount,
        grossAmount: 0,
        totalAmount: sibling.totalAmount,
        taxAmount: 0,
      },
      "quantity",
      sibling.quantity,
    );
    expect(response.materials[1].price?.totalAmount).toBe(siblingExpected.totalAmount);
  });

  it("assigns id only for a real backend lineId, leaving not-yet-saved rows undefined", () => {
    const saved = line({ lineId: "SP_P1_CHARGEABLE" });
    const response = simulateDiagnosticPricing(
      request([saved], { type: "SET_QUANTITY", lineId: "SP_P1_CHARGEABLE", value: 2 }),
    );
    expect(response.materials[0].id).toBe("SP_P1_CHARGEABLE");
  });

  it("builds a byJobType breakdown, plus a total roll-up over every line", () => {
    const chargeable = line({ lineId: "row-0", jobType: "CHARGEABLE" });
    const warranty = line({ lineId: "row-1", jobType: "WARRANTY", quantity: 1, unitPrice: 30 });
    const response = simulateDiagnosticPricing(
      request([chargeable, warranty], { type: "SET_QUANTITY", lineId: "row-0", value: 2 }),
    );

    expect(Object.keys(response.priceSummaryDetailed?.byJobType ?? {}).sort()).toEqual([
      "CHARGEABLE",
      "WARRANTY",
    ]);

    const sumNetAmount = roundToTwo(
      response.materials.reduce((sum, m) => sum + (m.price?.netAmount ?? 0), 0),
    );
    expect(response.priceSummary?.netAmount).toBe(sumNetAmount);
  });

  it("scopes materialRelated to distributable positions, and omits it when none apply", () => {
    const spareParty = line({ lineId: "row-0", position: "SP", jobType: "CHARGEABLE" });
    const labour = line({ lineId: "row-1", position: "LA", jobType: "CHARGEABLE" });
    const response = simulateDiagnosticPricing(
      request([spareParty, labour], { type: "SET_QUANTITY", lineId: "row-0", value: 2 }),
    );

    const chargeable = response.priceSummaryDetailed?.byJobType.CHARGEABLE;
    expect(chargeable?.materialRelated?.netAmount).toBe(response.materials[0].price?.netAmount);
    expect(chargeable?.serviceRelated?.netAmount).toBe(response.materials[1].price?.netAmount);

    const labourOnly = simulateDiagnosticPricing(
      request(
        [line({ lineId: "row-0", position: "LA", jobType: "CHARGEABLE" })],
        { type: "SET_QUANTITY", lineId: "row-0", value: 2 },
      ),
    );
    expect(
      labourOnly.priceSummaryDetailed?.byJobType.CHARGEABLE?.materialRelated,
    ).toBeUndefined();
  });
});
