import type Field from "components/generics/Field/GenericField.types";
import type {
  DiagnosticPriceBlock,
  DiagnosticPricingMaterialInput,
  DiagnosticPricingResponse,
  DiagnosticPricingSummary,
} from "api/services/diagnosticPricing/diagnosticPricing.types";
import { TOTAL_SUMMARY_TYPE } from "api/services/diagnosticPricing/diagnosticPricing.types";

export interface RowFieldGroup {
  prefix: string;
  order: number;
  /** Field name keyed by subtype. */
  bySubtype: Record<string, string>;
}

const ROW_INDEX_PATTERN = /#(\d+)/;

const getRowIndex = (prefix: string): number => {
  const match = ROW_INDEX_PATTERN.exec(prefix);
  return match ? Number(match[1]) : 0;
};

/** Groups row fields by their area prefix, ordered by row index. */
export const groupRowFields = (
  allFields: Field[] | null,
  areaNameContains: string,
): RowFieldGroup[] => {
  if (!allFields) return [];
  const groups = new Map<string, RowFieldGroup>();
  for (const field of allFields) {
    const prefix = field.fieldMapping?.nameStartsWith;
    if (!prefix?.includes(areaNameContains)) continue;
    let group = groups.get(prefix);
    if (!group) {
      group = { prefix, order: getRowIndex(prefix), bySubtype: {} };
      groups.set(prefix, group);
    }
    if (field.subtype) group.bySubtype[field.subtype] = field.name;
  }
  return [...groups.values()].toSorted((a, b) => a.order - b.order);
};

const num = (values: Record<string, unknown>, name?: string): number =>
  name ? Number(values[name]) || 0 : 0;

const str = (values: Record<string, unknown>, name?: string): string => {
  if (!name) return "";
  const value = values[name];
  if (value === null || value === undefined) return "";

  if (typeof value === "object") return JSON.stringify(value);

  return value as string;
};

export const buildPricingMaterials = (
  rows: RowFieldGroup[],
  values: Record<string, unknown>,
): DiagnosticPricingMaterialInput[] =>
  rows.map((row) => {
    const s = row.bySubtype;
    return {
      id: str(values, s.diagnosticMaterialId) || undefined,
      order: row.order,
      position: str(values, s.diagnosticPosition),
      partNumber: str(values, s.diagnosticPartNumber),
      type: str(values, s.diagnosticType),
      quantity: num(values, s.diagnosticQuantity),
      unitPrice: num(values, s.diagnosticUnitPrice),
      discount: num(values, s.diagnosticDiscountHidden || s.diagnosticDiscount),
      tax: num(values, s.diagnosticTax),
      netAmount: num(values, s.diagnosticNetAmount),
      grossAmount: num(values, s.diagnosticGrossAmount),
      totalAmount: num(values, s.diagnosticTotalAmount),
    };
  });

const ROW_SUBTYPE_TO_PRICE_KEY: Record<string, keyof DiagnosticPriceBlock> = {
  diagnosticUnitPrice: "unitPrice",
  diagnosticSuggestedNetPrice: "suggestedNetPrice",
  diagnosticNetAmount: "netAmount",
  diagnosticTax: "tax",
  diagnosticTaxAmount: "taxAmount",
  diagnosticGrossAmount: "grossAmount",
  diagnosticDiscount: "discount",
  diagnosticDiscountHidden: "discount",
  diagnosticDiscountAmountHidden: "discountAmount",
  diagnosticTotalAmount: "totalAmount",
};

const SUMMARY_SUBTYPE_TO_PRICE_KEY: Record<string, keyof DiagnosticPriceBlock> = {
  diagnosticSummarySuggestedNetPrice: "suggestedNetPrice",
  diagnosticSummaryNetAmount: "netAmount",
  diagnosticSummaryTaxAmount: "taxAmount",
  diagnosticSummaryGrossAmount: "grossAmount",
  diagnosticSummaryTotalAmount: "totalAmount",
  diagnosticSummaryDiscount: "discount",
  diagnosticSummaryDiscountNet: "discount",
  diagnosticSummaryDiscountHidden: "discount",
  diagnosticSummaryDiscountAmountHidden: "discountAmount",
};

const MATERIAL_SUFFIX = "Material";

/** Maps backend row prices onto Formik field names. Rows are matched by `order`. */
export const buildMaterialPricePatch = (
  rows: RowFieldGroup[],
  response: DiagnosticPricingResponse,
): Record<string, number> => {
  const byOrder = new Map(response.materials.map((m) => [m.order, m.price]));
  const patch: Record<string, number> = {};
  for (const row of rows) {
    const price = byOrder.get(row.order);
    if (!price) continue;
    for (const [subtype, fieldName] of Object.entries(row.bySubtype)) {
      const key = ROW_SUBTYPE_TO_PRICE_KEY[subtype];
      if (key) patch[fieldName] = price[key];
    }
  }
  return patch;
};

export const findSummary = (
  response: DiagnosticPricingResponse | null,
  summaryType: string,
): DiagnosticPricingSummary | null =>
  response?.summaries.find((s) => s.type.toUpperCase() === summaryType.toUpperCase()) ?? null;

/** Maps a backend summary block onto the summary area's Formik field names. */
export const buildSummaryPricePatch = (
  summaryAreaFields: Field[],
  summary: DiagnosticPricingSummary | null,
): Record<string, number> => {
  if (!summary) return {};
  const patch: Record<string, number> = {};
  for (const field of summaryAreaFields) {
    const subtype = field.subtype ?? "";
    const isMaterial = subtype.endsWith(MATERIAL_SUFFIX);
    const baseSubtype = isMaterial ? subtype.slice(0, -MATERIAL_SUFFIX.length) : subtype;
    const key = SUMMARY_SUBTYPE_TO_PRICE_KEY[baseSubtype];
    if (!key) continue;
    const block = isMaterial ? summary.materialPrice : summary.price;
    if (!block) continue;
    patch[field.name] = block[key];
  }
  return patch;
};

/** Converts a UI summary type ("chargeable", "totalSummary") to the backend summary type. */
export const toBackendSummaryType = (uiSummaryType: string): string => {
  if (!uiSummaryType || uiSummaryType === "totalSummary") return TOTAL_SUMMARY_TYPE;
  return uiSummaryType.replaceAll(/([A-Z])/g, "_$1").toUpperCase();
};

/** Writes a patch into Formik, skipping unchanged values and the field being edited. */
export const applyPricePatch = (
  patch: Record<string, number>,
  values: Record<string, unknown>,
  setFieldValue: (field: string, value: unknown) => void,
  skipFieldName?: string | null,
): void => {
  for (const [name, value] of Object.entries(patch)) {
    if (name === skipFieldName) continue;
    if (Math.abs((Number(values[name]) || 0) - value) < 0.0001) continue;
    setFieldValue(name, value);
  }
};
