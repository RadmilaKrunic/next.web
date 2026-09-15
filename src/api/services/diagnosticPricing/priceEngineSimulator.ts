import {
  calculatePrices,
  DISTRIBUTABLE_POSITIONS,
  roundToTwo,
  type FieldName,
  type PriceInputs,
} from "utils/priceCalculator";
import {
  type DiagnosticMaterialResponse,
  type DiagnosticPriceBlock,
  type DiagnosticPriceSummaryBlock,
  type DiagnosticPriceSummaryByJobType,
  type DiagnosticPriceSummaryDetailed,
  type DiagnosticPricingChangeType,
  type DiagnosticPricingLine,
  type DiagnosticPricingRequest,
  type DiagnosticPricingResponse,
} from "./diagnosticPricing.types";

/**
 * DEV-only stand-in for `POST /v1/jobs/{jobId}/diagnostic/price-calculation`, following this
 * codebase's established build-ahead-of-backend pattern (see getUIConfiguration/getCountryConfig/
 * getItemPolicy). Reuses the same pure math as the client preview (`priceCalculator.ts`) rather
 * than re-deriving pricing rules — this file only decides *which* line/field drives the recompute
 * for a given request and aggregates the per-line results into a diagnostic-shaped response.
 */
const CHANGE_TYPE_TO_FIELD: Partial<Record<DiagnosticPricingChangeType, FieldName>> = {
  SET_QUANTITY: "quantity",
  SET_UNIT_PRICE: "unitPrice",
  SET_DISCOUNT: "discountPercent",
  SET_NET_AMOUNT: "netAmount",
  SET_TOTAL_AMOUNT: "totalAmount",
};

const readFieldValue = (line: DiagnosticPricingLine, field: FieldName): number => {
  switch (field) {
    case "quantity":
      return line.quantity;
    case "unitPrice":
      return line.unitPrice;
    case "discountPercent":
      return line.discountPercentage;
    case "netAmount":
      return line.totalNetAmount;
    case "totalAmount":
      return line.totalAmount;
    default:
      return line.quantity;
  }
};

const priceLine = (
  line: DiagnosticPricingLine,
  order: number,
  request: DiagnosticPricingRequest,
): DiagnosticMaterialResponse => {
  const isChangedLine = request.changes.lineId === line.lineId;
  const field = isChangedLine ? CHANGE_TYPE_TO_FIELD[request.changes.type] : undefined;
  const changedValue = field ? readFieldValue(line, field) : line.quantity;

  const inputs: PriceInputs = {
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    taxPercent: line.taxPercentage,
    discountPercent: line.discountPercentage,
    suggestedNetPrice: line.totalNetAmount,
    netAmount: line.totalNetAmount,
    grossAmount: 0,
    totalAmount: line.totalAmount,
    taxAmount: 0,
  };
  const result = calculatePrices(inputs, field ?? "quantity", changedValue);

  return {
    id: line.lineId.startsWith("row-") ? undefined : line.lineId,
    position: line.position,
    partNumber: line.partNumber,
    jobType: line.jobType,
    quantity: line.quantity,
    status: "PENDING",
    isPriceSetManually: false,
    notBelongsToTool: false,
    order,
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

const sumPriceBlocks = (blocks: DiagnosticPriceBlock[]): DiagnosticPriceSummaryBlock => {
  const sum = (key: keyof DiagnosticPriceBlock) =>
    roundToTwo(blocks.reduce((total, block) => total + (block[key] as number), 0));
  const netAmount = sum("netAmount");
  const grossAmount = sum("grossAmount");
  const discountAmount = sum("discountAmount");
  const taxAmount = sum("taxAmount");
  return {
    discount: grossAmount > 0 ? roundToTwo((discountAmount / grossAmount) * 100) : 0,
    discountAmount,
    suggestedNetPrice: sum("suggestedNetPrice"),
    netAmount,
    taxAmount,
    grossAmount,
    totalAmount: sum("totalAmount"),
  };
};

const buildSummaryByJobType = (
  materials: DiagnosticMaterialResponse[],
): Record<string, DiagnosticPriceSummaryByJobType> => {
  const jobTypes = [...new Set(materials.map((m) => m.jobType))];
  const result: Record<string, DiagnosticPriceSummaryByJobType> = {};
  for (const jobType of jobTypes) {
    const rows = materials.filter((m) => m.jobType === jobType);
    const materialRows = rows.filter((m) => DISTRIBUTABLE_POSITIONS.has(m.position));
    const serviceRows = rows.filter((m) => !DISTRIBUTABLE_POSITIONS.has(m.position));
    result[jobType] = {
      total: sumPriceBlocks(rows.map((m) => m.price as DiagnosticPriceBlock)),
      materialRelated: materialRows.length
        ? sumPriceBlocks(materialRows.map((m) => m.price as DiagnosticPriceBlock))
        : undefined,
      serviceRelated: serviceRows.length
        ? sumPriceBlocks(serviceRows.map((m) => m.price as DiagnosticPriceBlock))
        : undefined,
    };
  }
  return result;
};

const buildPriceSummaryDetailed = (
  materials: DiagnosticMaterialResponse[],
): DiagnosticPriceSummaryDetailed => ({
  total: sumPriceBlocks(materials.map((m) => m.price as DiagnosticPriceBlock)),
  byJobType: buildSummaryByJobType(materials),
});

export const simulateDiagnosticPricing = (
  request: DiagnosticPricingRequest,
): DiagnosticPricingResponse => {
  const materials = request.lines.map((line, index) => priceLine(line, index + 1, request));
  const priceSummaryDetailed = buildPriceSummaryDetailed(materials);
  return {
    materials,
    archivedMaterials: [],
    priceSummary: priceSummaryDetailed.total,
    priceSummaryDetailed,
    errorMessages: [],
  };
};
