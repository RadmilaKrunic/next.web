import { calculatePrices, roundToTwo, DISTRIBUTABLE_POSITIONS, SUMMARY_TYPE_FILTER } from "utils/priceCalculator";
import type { FieldName, PriceInputs, PriceResults } from "utils/priceCalculator";
import type { discountBase as DiscountBase } from "api/services/countryConfiguration/countryConfiguration";
import type { Price } from "types/price.types";
import type {
  ChangedMaterialRow,
  ChangedSummary,
  ClaimPriceValidateRequest,
  ClaimPricingResult,
  DiagnosticPricingPayload,
  DiagnosticPricingResult,
  MaterialRow,
  MaterialRowResult,
  PriceFieldName,
  PriceSummary,
  PriceValidateRequest,
} from "./itemPolicy.types";
import type { PutClaimPricesRequest } from "../claims/claims.types";

// Maps the wire contract's persisted-price field names (tax/discount, matching Price) onto
// priceCalculator.ts's internal calculation-engine field names (taxPercent/discountPercent) —
// see the companion spec's shared-types section for why the wire contract standardized on the
// persisted names.
const PRICE_FIELD_TO_CALC_FIELD: Record<PriceFieldName, FieldName> = {
  quantity: "quantity",
  unitPrice: "unitPrice",
  netAmount: "netAmount",
  suggestedNetPrice: "suggestedNetPrice",
  tax: "taxPercent",
  grossAmount: "grossAmount",
  discount: "discountPercent",
  totalAmount: "totalAmount",
};

function priceToInputs(price: Price | null, quantity: number): PriceInputs {
  return {
    quantity,
    unitPrice: price?.unitPrice ?? 0,
    taxPercent: price?.tax ?? 0,
    discountPercent: price?.discount ?? 0,
    suggestedNetPrice: price?.suggestedNetPrice ?? 0,
    netAmount: price?.netAmount ?? 0,
    grossAmount: price?.grossAmount ?? 0,
    totalAmount: price?.totalAmount ?? 0,
    taxAmount: price?.taxAmount ?? 0,
  };
}

function resultsToPrice(results: PriceResults): Price {
  return {
    unitPrice: results.unitPrice,
    tax: results.taxPercent,
    discount: results.discountPercent,
    suggestedNetPrice: results.suggestedNetPrice,
    netAmount: results.netAmount,
    grossAmount: results.grossAmount,
    totalAmount: results.totalAmount,
    taxAmount: results.taxAmount,
    discountAmount: results.discountAmount,
  };
}

/**
 * Recomputes one row via calculatePrices() — the same, already-tested engine the frontend
 * uses for optimistic preview — and reshapes the result into a MaterialRowResult.
 *
 * A row with no changedField and an existing price is a row still dirty from an earlier edit
 * this session (not this call's trigger): its price is already internally consistent from a
 * prior confirmed response, so it's passed through rather than recomputed. Pass forceRecompute
 * to override this (used for a full save, where every row needs a fresh, consistent
 * computation regardless of what triggered the call).
 */
function computeRowResult(
  row: MaterialRow,
  changedField: PriceFieldName | undefined,
  discountBase: DiscountBase,
  forceRecompute = false,
): MaterialRowResult {
  if (!changedField && !forceRecompute && row.price !== null) {
    return { ...row, isValidated: true, changeStatus: "confirmed" };
  }

  const inputs = priceToInputs(row.price, row.quantity);
  const calcField = changedField ? PRICE_FIELD_TO_CALC_FIELD[changedField] : "quantity";
  const results = calculatePrices(inputs, calcField, inputs[calcField], discountBase);
  const price = resultsToPrice(results);
  const isNegative = price.netAmount < 0 || price.grossAmount < 0 || price.totalAmount < 0;

  return {
    ...row,
    price,
    isValidated: !isNegative,
    changeStatus: isNegative ? "error" : "confirmed",
    ...(isNegative ? { errorMessage: "Computed price would be negative" } : {}),
  };
}

/**
 * The backend-merge-semantics step (see the companion spec's "Backend merge semantics"):
 * overlays a validate request's changedRows onto the last-saved baseline rows, keyed by
 * rowId. A row present in changedRows but not the baseline is a brand-new, not-yet-saved row.
 */
function computeMergedRows(
  baselineRows: MaterialRow[],
  changedRows: ChangedMaterialRow[],
  discountBase: DiscountBase,
): MaterialRowResult[] {
  const merged = new Map<string, { row: MaterialRow; changedField?: PriceFieldName }>();
  baselineRows.forEach((row) => merged.set(row.rowId, { row }));
  changedRows.forEach((entry) => merged.set(entry.rowId, { row: entry.row, changedField: entry.changedField }));

  return Array.from(merged.values()).map(({ row, changedField }) =>
    computeRowResult(row, changedField, discountBase),
  );
}

/**
 * Models the one summary-edit mode the real UI exercises today (onSummaryDiscountChange /
 * distributeGrossToRows / distributeNetToRows): setting every eligible row's discount% to a
 * flat value. Other summary fields aren't redistributable in the current UI, so they're not
 * modeled here — see priceCalculator.ts's distributeToRows for the production behavior this
 * mirrors.
 */
function applySummaryRedistribution(
  rows: MaterialRowResult[],
  changedSummary: ChangedSummary | undefined,
  discountBase: DiscountBase,
  typeFilter: (type: string) => boolean,
): MaterialRowResult[] {
  if (!changedSummary || changedSummary.field !== "discount") return rows;

  const isEligible = (row: MaterialRowResult) =>
    row.price !== null &&
    typeFilter(row.type) &&
    (changedSummary.target !== "priceSummaryMaterial" || DISTRIBUTABLE_POSITIONS.has(row.position));

  return rows.map((row) => {
    if (!isEligible(row)) return row;
    return computeRowResult(
      { ...row, price: { ...(row.price as Price), discount: changedSummary.summary.discount } },
      "discount",
      discountBase,
      true,
    );
  });
}

function aggregate(
  rows: MaterialRowResult[],
  discountBase: DiscountBase,
  typeFilter: (type: string) => boolean,
  positionFilter?: (position: string) => boolean,
): PriceSummary {
  const scoped = rows.filter(
    (r) => r.price !== null && typeFilter(r.type) && (!positionFilter || positionFilter(r.position)),
  );

  const sum = (pick: (price: Price) => number) =>
    roundToTwo(scoped.reduce((total, r) => total + pick(r.price as Price), 0));

  const suggestedNetPrice = sum((p) => p.suggestedNetPrice);
  const netAmount = sum((p) => p.netAmount);
  const grossAmount = sum((p) => p.grossAmount);
  const totalAmount = sum((p) => p.totalAmount);
  const taxAmount = sum((p) => p.taxAmount);

  const discount =
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

  return { suggestedNetPrice, netAmount, grossAmount, totalAmount, taxAmount, discount, discountAmount };
}

/**
 * Local stand-in for POST /v1/diagnostic/{jobId}/prices/validate (see
 * proposals/items-and-prices-backend-api-spec.md, API-2). `baseline` stands in for the
 * diagnostic's last-saved state a real backend would load by jobId — everything else
 * (merging, recomputation, aggregation) reuses the existing, already-tested priceCalculator.ts
 * math. Used as the dev-mode backing until the real endpoint exists.
 */
export function simulatePriceValidate(
  baseline: DiagnosticPricingPayload,
  request: PriceValidateRequest,
  discountBase: DiscountBase,
  summaryType = "totalSummary",
): DiagnosticPricingResult {
  const typeFilter = SUMMARY_TYPE_FILTER[summaryType] ?? SUMMARY_TYPE_FILTER.totalSummary;

  let materials = computeMergedRows(baseline.materials, request.changedRows, discountBase);
  materials = applySummaryRedistribution(materials, request.changedSummary, discountBase, typeFilter);

  const archivedMaterials = (baseline.archivedMaterials ?? []).map(
    (row): MaterialRowResult => ({ ...row, changeStatus: "confirmed" }),
  );

  return {
    requestId: request.requestId,
    diagnostic: {
      jobId: baseline.jobId,
      diagnosticId: baseline.diagnosticId,
      ascId: baseline.ascId,
      actionType: baseline.actionType,
      jobType: baseline.jobType,
      exchangeReason: baseline.exchangeReason,
      status: baseline.status,
      customerAnswer: baseline.customerAnswer,
      typeOfUsage: baseline.typeOfUsage,
      faultCode: baseline.faultCode,
      faultCodeDescription: baseline.faultCodeDescription,
      faultCodeLabourQuantity: baseline.faultCodeLabourQuantity,
      technicianNote: baseline.technicianNote,
      materials,
      archivedMaterials,
      priceSummary: aggregate(materials, discountBase, typeFilter),
      priceSummaryMaterial: aggregate(materials, discountBase, typeFilter, (p) =>
        DISTRIBUTABLE_POSITIONS.has(p),
      ),
    },
  };
}

/**
 * Local stand-in for the claim's net-new POST /v1/claims/{claimId}/prices/validate (API-3).
 * Same merge-onto-last-saved-baseline behavior as simulatePriceValidate, scoped to the
 * claim's own materials.
 */
export function simulateClaimPriceValidate(
  baseline: Pick<DiagnosticPricingPayload, "materials" | "archivedMaterials">,
  request: ClaimPriceValidateRequest,
  discountBase: DiscountBase,
  summaryType = "chargeable",
): ClaimPricingResult {
  const typeFilter = SUMMARY_TYPE_FILTER[summaryType] ?? SUMMARY_TYPE_FILTER.totalSummary;

  let materials = computeMergedRows(baseline.materials, request.changedRows, discountBase);
  materials = applySummaryRedistribution(materials, request.changedSummary, discountBase, typeFilter);

  const archivedMaterials = (baseline.archivedMaterials ?? []).map(
    (row): MaterialRowResult => ({ ...row, changeStatus: "confirmed" }),
  );

  return {
    requestId: request.requestId,
    claim: {
      materials,
      archivedMaterials,
      priceSummary: aggregate(materials, discountBase, typeFilter),
      priceSummaryMaterial: aggregate(materials, discountBase, typeFilter, (p) =>
        DISTRIBUTABLE_POSITIONS.has(p),
      ),
    },
  };
}

/**
 * Local stand-in for the claim's existing PUT /v1/claims/{claimId}/prices full save,
 * reshaped onto ClaimPricingResult (API-3's shared response type) instead of the unused
 * placeholder response the real endpoint returns today. Consumes today's actually-shipped
 * PutClaimPricesRequest (claims/claims.types.ts) as-is — rowId is synthesized from
 * partNumber since that shape predates this proposal's MaterialRow.
 */
export function simulateClaimPricesSave(
  request: PutClaimPricesRequest,
  discountBase: DiscountBase,
  summaryType = "chargeable",
): ClaimPricingResult {
  const typeFilter = SUMMARY_TYPE_FILTER[summaryType] ?? SUMMARY_TYPE_FILTER.totalSummary;

  const toRow = (
    material: { position: string; partNumber: string; description: string; jobType: string; quantity: number; order?: number; price: Price },
    index: number,
  ): MaterialRow => ({
    rowId: material.partNumber || `row-${index}`,
    position: material.position,
    partNumber: material.partNumber,
    description: material.description,
    type: material.jobType,
    quantity: material.quantity,
    order: material.order,
    isPriceSetManually: false,
    isValidated: true,
    price: material.price,
  });

  const materials = request.materials
    .map((material, index) => toRow(material, index))
    .map((row) => computeRowResult(row, "unitPrice", discountBase, true));

  const archivedMaterials = (request.archivedMaterials ?? [])
    .map((material, index) => toRow(material, index))
    .map((row): MaterialRowResult => ({ ...row, changeStatus: "confirmed" }));

  return {
    claim: {
      materials,
      archivedMaterials,
      priceSummary: aggregate(materials, discountBase, typeFilter),
      priceSummaryMaterial: aggregate(materials, discountBase, typeFilter, (p) =>
        DISTRIBUTABLE_POSITIONS.has(p),
      ),
    },
  };
}
