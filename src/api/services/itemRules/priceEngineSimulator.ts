import {
  calculatePrices,
  roundToTwo,
  DISTRIBUTABLE_POSITIONS,
  SUMMARY_TYPE_FILTER,
} from "utils/priceCalculator";
import type { PriceResults } from "utils/priceCalculator";
import type { DiscountBase } from "./itemRules.types";
import {
  ChangedRow,
  PriceValidateRequest,
  PriceValidateResponse,
  PriceValidateSummary,
  PriceValidateSummaryMaterial,
  PutClaimPricesResponseUpgraded,
  RowPriceResult,
} from "./itemRules.types";
import { PutClaimPricesRequest } from "../claims/claims.types";

function toRowPriceResult(row: ChangedRow, discountBase: DiscountBase): RowPriceResult {
  const prices = calculatePrices(
    row.values,
    row.changedField,
    row.values[row.changedField],
    discountBase,
  );
  return { rowId: row.rowId, status: "confirmed", prices };
}

interface AggregatableRow {
  type: string;
  position: string;
  prices: PriceResults;
}

function aggregate(
  rows: AggregatableRow[],
  summaryType: string,
  discountBase: DiscountBase,
  positions?: string[],
): PriceValidateSummary | PriceValidateSummaryMaterial {
  const typeFilter = SUMMARY_TYPE_FILTER[summaryType] ?? SUMMARY_TYPE_FILTER.totalSummary;
  const scoped = rows.filter(
    (r) => typeFilter(r.type) && (!positions || positions.includes(r.position)),
  );

  const suggestedNetPrice = roundToTwo(scoped.reduce((sum, r) => sum + r.prices.suggestedNetPrice, 0));
  const netAmount = roundToTwo(scoped.reduce((sum, r) => sum + r.prices.netAmount, 0));
  const grossAmount = roundToTwo(scoped.reduce((sum, r) => sum + r.prices.grossAmount, 0));
  const totalAmount = roundToTwo(scoped.reduce((sum, r) => sum + r.prices.totalAmount, 0));
  const taxAmount = roundToTwo(scoped.reduce((sum, r) => sum + r.prices.taxAmount, 0));

  const discountPercent =
    discountBase === "NET_PRICE"
      ? suggestedNetPrice > 0
        ? roundToTwo(((suggestedNetPrice - netAmount) / suggestedNetPrice) * 100)
        : 0
      : grossAmount > 0
        ? roundToTwo(((grossAmount - totalAmount) / grossAmount) * 100)
        : 0;
  const discountAmount =
    discountBase === "NET_PRICE"
      ? roundToTwo(suggestedNetPrice - netAmount)
      : roundToTwo(grossAmount - totalAmount);

  const base: PriceResults = {
    quantity: 0,
    unitPrice: 0,
    suggestedNetPrice,
    netAmount,
    taxPercent: scoped[0]?.prices.taxPercent ?? 0,
    taxAmount,
    grossAmount,
    discountPercent,
    discountAmount,
    totalAmount,
  };

  return positions ? { ...base, type: summaryType, positions } : { ...base, type: summaryType };
}

/**
 * Local stand-in for POST /v1/diagnostic/{jobId}/prices/validate (see
 * proposals/items-and-prices-backend-api-spec.md, API-2). Reshapes the existing,
 * already-tested priceCalculator.ts math into the new response contract — no new
 * pricing logic. Used as the dev-mode backing until the real endpoint exists.
 */
export function simulatePriceValidate(
  request: PriceValidateRequest,
  discountBase: DiscountBase,
  summaryType = "totalSummary",
): PriceValidateResponse {
  const rows = request.changedRows.map((row) => toRowPriceResult(row, discountBase));
  const aggregatableRows: AggregatableRow[] = request.changedRows.map((row, index) => ({
    type: row.type,
    position: row.position,
    prices: rows[index].prices,
  }));

  const summary = aggregate(aggregatableRows, summaryType, discountBase) as PriceValidateSummary;
  const summaryMaterial = aggregate(aggregatableRows, summaryType, discountBase, [
    ...DISTRIBUTABLE_POSITIONS,
  ]) as PriceValidateSummaryMaterial;

  return {
    requestId: request.requestId,
    rows,
    summary,
    summaryMaterial,
  };
}

/**
 * Local stand-in for the proposed upgraded PUT /v1/claims/{claimId}/prices response
 * (API-3's follow-up ticket). Not consumed by any component today — see claims/action.ts
 * for the real, currently-shipped contract this would eventually replace.
 */
export function simulateClaimPricesResponse(
  request: PutClaimPricesRequest,
  discountBase: DiscountBase,
  summaryType = "chargeable",
): PutClaimPricesResponseUpgraded {
  const rows: RowPriceResult[] = request.materials.map((material, index) => {
    const inputs = {
      quantity: material.quantity,
      unitPrice: material.price.unitPrice,
      taxPercent: material.price.tax,
      discountPercent: material.price.discount,
      suggestedNetPrice: material.price.suggestedNetPrice,
      netAmount: material.price.netAmount,
      grossAmount: material.price.grossAmount,
      totalAmount: material.price.totalAmount,
      taxAmount: material.price.taxAmount,
    };
    const prices = calculatePrices(inputs, "unitPrice", inputs.unitPrice, discountBase);
    return { rowId: material.partNumber || `row-${index}`, status: "confirmed", prices };
  });

  const aggregatableRows: AggregatableRow[] = request.materials.map((material, index) => ({
    type: material.jobType,
    position: material.position,
    prices: rows[index].prices,
  }));

  const summary = aggregate(aggregatableRows, summaryType, discountBase) as PriceValidateSummary;
  const summaryMaterial = aggregate(aggregatableRows, summaryType, discountBase, [
    ...DISTRIBUTABLE_POSITIONS,
  ]) as PriceValidateSummaryMaterial;

  return { rows, summary, summaryMaterial };
}
