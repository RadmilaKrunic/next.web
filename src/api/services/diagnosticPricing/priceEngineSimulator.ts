import {
  calculatePrices,
  DISTRIBUTABLE_POSITIONS,
  roundToTwo,
  type FieldName,
  type PriceInputs,
} from "utils/priceCalculator";
import {
  TOTAL_SUMMARY_TYPE,
  type DiagnosticPriceBlock,
  type DiagnosticPricingMaterialInput,
  type DiagnosticPricingMaterialResult,
  type DiagnosticPricingRequest,
  type DiagnosticPricingResponse,
  type DiagnosticPricingSummary,
  type DiagnosticPricingTrigger,
} from "./diagnosticPricing.types";

/**
 * DEV-only stand-in for `POST /v1/jobs/{jobId}/diagnostic/price-calculation`, following this
 * codebase's established build-ahead-of-backend pattern (see getUIConfiguration/getCountryConfig/
 * getItemPolicy). Reuses the same pure math as the client preview (`priceCalculator.ts`) rather
 * than re-deriving pricing rules — this file only decides *which* field drives the recompute for
 * a given request and aggregates the per-row results into summaries.
 */
const TRIGGER_TO_FIELD: Partial<Record<DiagnosticPricingTrigger, FieldName>> = {
  quantity: "quantity",
  unitPrice: "unitPrice",
  discount: "discountPercent",
  netAmount: "netAmount",
  grossAmount: "grossAmount",
  totalAmount: "totalAmount",
};

const readFieldValue = (material: DiagnosticPricingMaterialInput, field: FieldName): number => {
  switch (field) {
    case "quantity":
      return material.quantity;
    case "unitPrice":
      return material.unitPrice;
    case "discountPercent":
      return material.discount;
    case "netAmount":
      return material.netAmount;
    case "grossAmount":
      return material.grossAmount;
    case "totalAmount":
      return material.totalAmount;
    default:
      return material.quantity;
  }
};

const simulateMaterial = (
  material: DiagnosticPricingMaterialInput,
  request: DiagnosticPricingRequest,
): DiagnosticPricingMaterialResult => {
  const isTriggerRow =
    request.triggeredByOrder === undefined || request.triggeredByOrder === material.order;
  const field = isTriggerRow ? (TRIGGER_TO_FIELD[request.trigger] ?? "quantity") : "quantity";
  const changedValue = readFieldValue(material, field);

  const inputs: PriceInputs = {
    quantity: material.quantity,
    unitPrice: material.unitPrice,
    taxPercent: material.tax,
    discountPercent: material.discount,
    suggestedNetPrice: material.netAmount,
    netAmount: material.netAmount,
    grossAmount: material.grossAmount,
    totalAmount: material.totalAmount,
    taxAmount: 0,
  };
  const result = calculatePrices(inputs, field, changedValue);

  return {
    id: material.id,
    order: material.order,
    position: material.position,
    price: {
      discount: result.discountPercent,
      discountAmount: result.discountAmount,
      suggestedNetPrice: result.suggestedNetPrice,
      unitPrice: result.unitPrice,
      netAmount: result.netAmount,
      tax: result.taxPercent,
      taxAmount: result.taxAmount,
      grossAmount: result.grossAmount,
      totalAmount: result.totalAmount,
    },
  };
};

const sumPriceBlocks = (blocks: DiagnosticPriceBlock[]): DiagnosticPriceBlock => {
  const sum = (key: keyof DiagnosticPriceBlock) =>
    roundToTwo(blocks.reduce((total, block) => total + block[key], 0));
  const netAmount = sum("netAmount");
  const grossAmount = sum("grossAmount");
  const discountAmount = sum("discountAmount");
  const taxAmount = sum("taxAmount");
  return {
    discount: grossAmount > 0 ? roundToTwo((discountAmount / grossAmount) * 100) : 0,
    discountAmount,
    suggestedNetPrice: sum("suggestedNetPrice"),
    unitPrice: 0,
    netAmount,
    tax: netAmount > 0 ? roundToTwo((taxAmount / netAmount) * 100) : 0,
    taxAmount,
    grossAmount,
    totalAmount: sum("totalAmount"),
  };
};

const buildSummary = (
  type: string,
  materials: DiagnosticPricingMaterialResult[],
): DiagnosticPricingSummary => {
  const materialRows = materials.filter((m) => DISTRIBUTABLE_POSITIONS.has(m.position));
  return {
    type,
    price: sumPriceBlocks(materials.map((m) => m.price)),
    materialPrice: materialRows.length ? sumPriceBlocks(materialRows.map((m) => m.price)) : undefined,
  };
};

export const simulateDiagnosticPricing = (
  request: DiagnosticPricingRequest,
): DiagnosticPricingResponse => {
  const materials = request.materials.map((material) => simulateMaterial(material, request));
  const types = [...new Set(request.materials.map((m) => m.type))];
  const summaries = types.map((type) =>
    buildSummary(
      type,
      materials.filter((m, i) => request.materials[i].type === type),
    ),
  );
  summaries.push(buildSummary(TOTAL_SUMMARY_TYPE, materials));
  return { materials, summaries };
};
