import { describe, it, expect } from "vitest";
import {
  simulatePriceValidate,
  simulateClaimPriceValidate,
  simulateClaimPricesSave,
} from "./priceEngineSimulator";
import type {
  ChangedMaterialRow,
  DiagnosticPricingPayload,
  MaterialRow,
  PriceValidateRequest,
} from "./itemPolicy.types";
import type { PutClaimPricesRequest } from "../claims/claims.types";

function makeRow(overrides: Partial<MaterialRow>): MaterialRow {
  return {
    rowId: "row-1",
    position: "SP",
    partNumber: "PN-1",
    description: "part",
    type: "CHARGEABLE",
    quantity: 1,
    isPriceSetManually: false,
    isValidated: true,
    price: {
      unitPrice: 0,
      suggestedNetPrice: 0,
      netAmount: 0,
      tax: 0,
      taxAmount: 0,
      grossAmount: 0,
      discount: 0,
      totalAmount: 0,
    },
    ...overrides,
  };
}

function makeBaseline(materials: MaterialRow[]): DiagnosticPricingPayload {
  return {
    jobId: "J1",
    actionType: "REPAIR",
    jobType: "CHARGEABLE",
    status: "IN_DIAGNOSTICS",
    typeOfUsage: "PRIVATE",
    faultCode: "F1",
    faultCodeDescription: "desc",
    faultCodeLabourQuantity: 1,
    materials,
    archivedMaterials: [],
    priceSummary: {
      suggestedNetPrice: 0,
      netAmount: 0,
      taxAmount: 0,
      grossAmount: 0,
      discount: 0,
      discountAmount: 0,
      totalAmount: 0,
    },
  };
}

describe("simulatePriceValidate", () => {
  it("merges a single changed row onto the baseline and recomputes only that row", () => {
    const baseline = makeBaseline([
      makeRow({
        rowId: "row-sp",
        position: "SP",
        quantity: 1,
        price: {
          unitPrice: 45.5,
          suggestedNetPrice: 45.5,
          netAmount: 45.5,
          tax: 20,
          taxAmount: 9.1,
          grossAmount: 54.6,
          discount: 10,
          totalAmount: 49.14,
        },
      }),
      makeRow({
        rowId: "row-la",
        position: "LA",
        quantity: 1,
        price: {
          unitPrice: 20,
          suggestedNetPrice: 20,
          netAmount: 20,
          tax: 20,
          taxAmount: 4,
          grossAmount: 24,
          discount: 0,
          totalAmount: 24,
        },
      }),
    ]);

    const changedRow: ChangedMaterialRow = {
      rowId: "row-sp",
      changedField: "quantity",
      row: { ...baseline.materials[0], quantity: 2 },
    };
    const request: PriceValidateRequest = { requestId: "req-1", changedRows: [changedRow] };

    const response = simulatePriceValidate(baseline, request, "GROSS_PRICE");

    expect(response.requestId).toBe("req-1");
    const spRow = response.diagnostic.materials.find((m) => m.rowId === "row-sp");
    expect(spRow?.changeStatus).toBe("confirmed");
    expect(spRow?.isValidated).toBe(true);
    expect(spRow?.quantity).toBe(2);
    // Quantity doubled at the same unitPrice roughly doubles the amounts.
    expect(spRow?.price?.grossAmount).toBeCloseTo(109.2, 1);

    // The untouched LA row is echoed back from the baseline unchanged, not recomputed.
    const laRow = response.diagnostic.materials.find((m) => m.rowId === "row-la");
    expect(laRow?.changeStatus).toBe("confirmed");
    expect(laRow?.price?.grossAmount).toBe(24);

    // Summary reflects both rows even though only one was sent.
    expect(response.diagnostic.priceSummary.grossAmount).toBeCloseTo(133.2, 1);
  });

  it("includes a brand-new, never-saved row via changedRows and prices it for the first time", () => {
    const baseline = makeBaseline([]);
    const newRow: ChangedMaterialRow = {
      rowId: "row-new",
      row: makeRow({
        rowId: "row-new",
        position: "PN",
        quantity: 1,
        isValidated: false,
        price: null,
      }),
    };
    const request: PriceValidateRequest = { requestId: "req-2", changedRows: [newRow] };

    const response = simulatePriceValidate(baseline, request, "GROSS_PRICE");

    const row = response.diagnostic.materials.find((m) => m.rowId === "row-new");
    expect(row?.changeStatus).toBe("confirmed");
    expect(row?.isValidated).toBe(true);
    expect(row?.price).not.toBeNull();
  });

  it("redistributes discount% across distributable rows via changedSummary", () => {
    const baseline = makeBaseline([
      makeRow({
        rowId: "row-sp",
        position: "SP",
        price: {
          unitPrice: 100,
          suggestedNetPrice: 100,
          netAmount: 100,
          tax: 20,
          taxAmount: 20,
          grossAmount: 120,
          discount: 0,
          totalAmount: 120,
        },
      }),
      makeRow({
        rowId: "row-la",
        position: "LA",
        price: {
          unitPrice: 50,
          suggestedNetPrice: 50,
          netAmount: 50,
          tax: 20,
          taxAmount: 10,
          grossAmount: 60,
          discount: 0,
          totalAmount: 60,
        },
      }),
    ]);

    const request: PriceValidateRequest = {
      requestId: "req-3",
      changedRows: [],
      changedSummary: {
        target: "priceSummaryMaterial",
        field: "discount",
        summary: {
          suggestedNetPrice: 100,
          netAmount: 90,
          taxAmount: 18,
          grossAmount: 108,
          discount: 10,
          discountAmount: 12,
          totalAmount: 108,
        },
      },
    };

    const response = simulatePriceValidate(baseline, request, "GROSS_PRICE");

    // SP is distributable (gets the 10% discount); LA is protected (untouched).
    const spRow = response.diagnostic.materials.find((m) => m.rowId === "row-sp");
    const laRow = response.diagnostic.materials.find((m) => m.rowId === "row-la");
    expect(spRow?.price?.discount).toBe(10);
    expect(laRow?.price?.discount).toBe(0);
    expect(response.diagnostic.priceSummaryMaterial?.discount).toBeGreaterThan(0);
  });
});

describe("simulateClaimPriceValidate", () => {
  it("merges a claim's own changed row onto its baseline materials", () => {
    const baseline = {
      materials: [
        makeRow({
          rowId: "row-sp",
          price: {
            unitPrice: 10,
            suggestedNetPrice: 10,
            netAmount: 10,
            tax: 20,
            taxAmount: 2,
            grossAmount: 12,
            discount: 0,
            totalAmount: 12,
          },
        }),
      ],
    };

    const response = simulateClaimPriceValidate(
      baseline,
      {
        requestId: "req-4",
        jobId: "J1",
        diagnosticId: "D1",
        changedRows: [
          { rowId: "row-sp", changedField: "quantity", row: { ...baseline.materials[0], quantity: 3 } },
        ],
      },
      "GROSS_PRICE",
    );

    expect(response.requestId).toBe("req-4");
    expect(response.claim.materials).toHaveLength(1);
    expect(response.claim.materials[0].changeStatus).toBe("confirmed");
    expect(response.claim.priceSummary.grossAmount).toBeGreaterThan(0);
  });
});

describe("simulateClaimPricesSave", () => {
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
    const response = simulateClaimPricesSave(baseRequest, "GROSS_PRICE");
    expect(response.claim.materials).toHaveLength(1);
    expect(response.claim.materials[0].changeStatus).toBe("confirmed");
    expect(response.claim.materials[0].isValidated).toBe(true);
    expect(response.claim.materials[0].price?.totalAmount).toBe(109.2);
  });

  it("aggregates priceSummary/priceSummaryMaterial from the computed rows", () => {
    const response = simulateClaimPricesSave(baseRequest, "GROSS_PRICE");
    expect(response.claim.priceSummary.totalAmount).toBe(109.2);
    expect(response.claim.priceSummaryMaterial?.totalAmount).toBe(109.2);
  });
});
