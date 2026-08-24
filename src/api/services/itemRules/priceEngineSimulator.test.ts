import { describe, it, expect } from "vitest";
import { calculatePrices, aggregateRowPrices, PriceInputs } from "utils/priceCalculator";
import Field from "components/generics/Field/GenericField.types";
import { simulatePriceValidate, simulateClaimPricesResponse } from "./priceEngineSimulator";
import { PriceValidateRequest } from "./itemRules.types";
import { PutClaimPricesRequest } from "../claims/claims.types";

const emptyInputs: PriceInputs = {
  quantity: 0,
  unitPrice: 0,
  taxPercent: 0,
  discountPercent: 0,
  suggestedNetPrice: 0,
  netAmount: 0,
  grossAmount: 0,
  totalAmount: 0,
  taxAmount: 0,
};

describe("simulatePriceValidate", () => {
  it("computes each row via calculatePrices directly (row-level parity)", () => {
    const request: PriceValidateRequest = {
      jobId: "J1",
      actionType: "REPAIR",
      jobType: "CHARGEABLE",
      requestId: "req-1",
      changedRows: [
        {
          rowId: "row-1",
          position: "SP",
          type: "CHARGEABLE",
          changedField: "quantity",
          values: { ...emptyInputs, quantity: 2, unitPrice: 45.5, taxPercent: 20 },
        },
      ],
      unchangedRowIds: [],
    };

    const response = simulatePriceValidate(request, "GROSS_PRICE");
    const expected = calculatePrices(
      request.changedRows[0].values,
      "quantity",
      2,
      "GROSS_PRICE",
    );

    expect(response.requestId).toBe("req-1");
    expect(response.rows).toEqual([{ rowId: "row-1", status: "confirmed", prices: expected }]);
  });

  it("matches aggregateRowPrices for the summary and summaryMaterial totals", () => {
    const request: PriceValidateRequest = {
      jobId: "J1",
      actionType: "REPAIR",
      jobType: "CHARGEABLE",
      requestId: "req-2",
      changedRows: [
        {
          rowId: "row-sp",
          position: "SP",
          type: "CHARGEABLE",
          changedField: "quantity",
          values: { ...emptyInputs, quantity: 2, unitPrice: 45.5, taxPercent: 20 },
        },
        {
          rowId: "row-la",
          position: "LA",
          type: "CHARGEABLE",
          changedField: "quantity",
          values: { ...emptyInputs, quantity: 1, unitPrice: 30, taxPercent: 20 },
        },
        {
          rowId: "row-warranty",
          position: "SP",
          type: "WARRANTY",
          changedField: "quantity",
          values: { ...emptyInputs, quantity: 5, unitPrice: 999, taxPercent: 20 },
        },
      ],
      unchangedRowIds: [],
    };

    const response = simulatePriceValidate(request, "GROSS_PRICE", "chargeable");

    // Build an equivalent Formik-shaped fixture and aggregate via the real
    // aggregateRowPrices() to prove the simulator's summary math matches.
    const values: Record<string, unknown> = {};
    const fields: Field[] = [];
    response.rows.forEach((row, index) => {
      const prefix = `row${index}`;
      const position = request.changedRows[index].position;
      const rowType = request.changedRows[index].type;
      const push = (subtype: string, name: string, value: unknown) => {
        fields.push({ name, label: "", type: "text", subtype, fieldMapping: { nameStartsWith: prefix } });
        values[name] = value;
      };
      push("diagnosticType", `${prefix}_type`, rowType);
      push("diagnosticPosition", `${prefix}_position`, position);
      push("diagnosticSuggestedNetPrice", `${prefix}_suggestedNetPrice`, row.prices.suggestedNetPrice);
      push("diagnosticNetAmount", `${prefix}_netAmount`, row.prices.netAmount);
      push("diagnosticGrossAmount", `${prefix}_grossAmount`, row.prices.grossAmount);
      push("diagnosticTotalAmount", `${prefix}_totalAmount`, row.prices.totalAmount);
      push("diagnosticTaxAmount", `${prefix}_taxAmount`, row.prices.taxAmount);
    });

    const expectedSummary = aggregateRowPrices(
      values,
      fields,
      (t) => t === "CHARGEABLE",
      "GROSS_PRICE",
    );
    const expectedSummaryMaterial = aggregateRowPrices(
      values,
      fields,
      (t) => t === "CHARGEABLE",
      "GROSS_PRICE",
      (p) => p === "SP" || p === "PN" || p === "AC",
    );

    expect(response.summary.suggestedNetPrice).toBe(expectedSummary.suggestedNetPrice);
    expect(response.summary.netAmount).toBe(expectedSummary.netAmount);
    expect(response.summary.grossAmount).toBe(expectedSummary.grossAmount);
    expect(response.summary.totalAmount).toBe(expectedSummary.totalAmount);
    expect(response.summary.discountPercent).toBe(expectedSummary.discount);
    expect(response.summary.discountAmount).toBe(expectedSummary.discountAmount);

    // Only the SP row is a distributable position, so summaryMaterial should equal
    // that single row's totals, matching aggregateRowPrices with the position filter.
    expect(response.summaryMaterial.suggestedNetPrice).toBe(expectedSummaryMaterial.suggestedNetPrice);
    expect(response.summaryMaterial.totalAmount).toBe(expectedSummaryMaterial.totalAmount);
    expect(response.summaryMaterial.positions).toEqual(["SP", "PN", "AC"]);

    // The WARRANTY row must not leak into the "chargeable" summary scope.
    const warrantyRowTotal = response.rows.find((r) => r.rowId === "row-warranty")?.prices
      .totalAmount as number;
    expect(response.summary.totalAmount).toBeLessThan(warrantyRowTotal);
  });

  it("returns zeroed aggregates for an empty request", () => {
    const request: PriceValidateRequest = {
      jobId: "J1",
      actionType: "REPAIR",
      jobType: "CHARGEABLE",
      requestId: "req-3",
      changedRows: [],
      unchangedRowIds: [],
    };
    const response = simulatePriceValidate(request, "GROSS_PRICE");
    expect(response.rows).toEqual([]);
    expect(response.summary.totalAmount).toBe(0);
    expect(response.summary.discountPercent).toBe(0);
  });
});

describe("simulateClaimPricesResponse", () => {
  const baseRequest: PutClaimPricesRequest = {
    id: "C1",
    jobId: "J1",
    ascId: "ASC1",
    customerId: "CUST1",
    ascName: "ASC",
    diagnosticId: "D1",
    countryCode: "TR",
    actionType: "REPAIR",
    jobType: "CHARGEABLE",
    typeOfUsage: "PRIVATE",
    faultCode: "F1",
    faultCodeDescription: "desc",
    faultCodeLabourQuantity: 1,
    exchangeReason: null,
    claimStatus: "REVISED",
    claimNotes: "",
    customer: {},
    job: {},
    materials: [
      {
        position: "SP",
        partNumber: "PN-1",
        description: "part",
        jobType: "CHARGEABLE",
        quantity: 2,
        order: 1,
        isPriceSetManually: false,
        price: {
          unitPrice: 45.5,
          suggestedNetPrice: 91,
          netAmount: 91,
          tax: 20,
          taxAmount: 18.2,
          grossAmount: 109.2,
          discount: 0,
          totalAmount: 109.2,
        },
      },
    ],
    archivedMaterials: [],
    claimPriceSummary: {
      netAmount: 91,
      suggestedNetPrice: 91,
      grossAmount: 109.2,
      discount: 0,
      totalAmount: 109.2,
      taxAmount: 18.2,
    },
    jobDiagnostic: undefined,
  };

  it("computes one confirmed row per material via calculatePrices", () => {
    const response = simulateClaimPricesResponse(baseRequest, "GROSS_PRICE");
    expect(response.rows).toHaveLength(1);
    expect(response.rows[0].status).toBe("confirmed");
    expect(response.rows[0].prices.totalAmount).toBe(109.2);
  });

  it("aggregates summary and summaryMaterial from the computed rows", () => {
    const response = simulateClaimPricesResponse(baseRequest, "GROSS_PRICE");
    expect(response.summary.totalAmount).toBe(109.2);
    expect(response.summaryMaterial.totalAmount).toBe(109.2);
    expect(response.summaryMaterial.positions).toEqual(["SP", "PN", "AC"]);
  });
});
