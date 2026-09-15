import type Field from "components/generics/Field/GenericField.types";
import type {
  DiagnosticPriceSummaryBlock,
  DiagnosticPriceSummaryDetailed,
  DiagnosticPricingChange,
  DiagnosticPricingLine,
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

/** The row's own backend id, falling back to an order-based placeholder for a not-yet-saved row. */
const lineIdFor = (row: RowFieldGroup, values: Record<string, unknown>): string =>
  str(values, row.bySubtype.diagnosticMaterialId) || `row-${row.order}`;

export const buildPricingLines = (
  rows: RowFieldGroup[],
  values: Record<string, unknown>,
): DiagnosticPricingLine[] =>
  rows.map((row) => {
    const s = row.bySubtype;
    return {
      lineId: lineIdFor(row, values),
      position: str(values, s.diagnosticPosition),
      partNumber: str(values, s.diagnosticPartNumber),
      jobType: str(values, s.diagnosticType),
      quantity: num(values, s.diagnosticQuantity),
      unitPrice: num(values, s.diagnosticUnitPrice),
      taxPercentage: num(values, s.diagnosticTax),
      discountPercentage: num(values, s.diagnosticDiscountHidden || s.diagnosticDiscount),
      totalNetAmount: num(values, s.diagnosticNetAmount),
      totalAmount: num(values, s.diagnosticTotalAmount),
    };
  });

/** Field the user edited, in priority order — first match wins. Position/partNumber/type are
 * deliberately excluded: editing those now archives the row and creates a new one instead of
 * driving a price recalculation (see the "archive on type/partNumber edit" behavior). */
const SUBTYPE_TO_CHANGE_TYPE: Partial<Record<string, DiagnosticPricingChange["type"]>> = {
  diagnosticQuantity: "SET_QUANTITY",
  diagnosticUnitPrice: "SET_UNIT_PRICE",
  diagnosticDiscount: "SET_DISCOUNT",
  diagnosticDiscountHidden: "SET_DISCOUNT",
  diagnosticNetAmount: "SET_NET_AMOUNT",
  diagnosticGrossAmount: "SET_GROSS_AMOUNT",
  diagnosticTotalAmount: "SET_TOTAL_AMOUNT",
};

export const PRICE_INPUT_SUBTYPES = Object.keys(SUBTYPE_TO_CHANGE_TYPE);

const parseChangeValue = (raw: string): number | string => {
  const asNumber = Number(raw);
  return raw !== "" && Number.isFinite(asNumber) ? asNumber : raw;
};

/** Finds the first row/field that changed since the last settled snapshot, in field priority
 * order, and builds the `DiagnosticPricingChange` the backend expects for it. */
export const findRowChange = (
  rows: RowFieldGroup[],
  values: Record<string, unknown>,
  prev: Map<string, string> | null,
  next: Map<string, string>,
): DiagnosticPricingChange | null => {
  if (!prev) return null;
  for (const row of rows) {
    for (const subtype of PRICE_INPUT_SUBTYPES) {
      const key = `${row.order}:${subtype}`;
      const nextValue = next.get(key);
      if (prev.get(key) === nextValue) continue;
      const type = SUBTYPE_TO_CHANGE_TYPE[subtype];
      if (!type) continue;
      return { type, lineId: lineIdFor(row, values), value: parseChangeValue(nextValue ?? "") };
    }
  }
  return null;
};

const MATERIAL_SUFFIX = "Material";

const SUMMARY_SUBTYPE_TO_PRICE_KEY: Record<string, keyof DiagnosticPriceSummaryBlock> = {
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

/** Converts a UI summary type ("chargeable", "totalSummary") to the backend summary type. */
export const toBackendSummaryType = (uiSummaryType: string): string => {
  if (!uiSummaryType || uiSummaryType === "totalSummary") return TOTAL_SUMMARY_TYPE;
  return uiSummaryType.replaceAll(/([A-Z])/g, "_$1").toUpperCase();
};

/** Maps `priceSummaryDetailed` for the currently-selected summary type onto the summary area's
 * Formik field names — `*Material`-suffixed subtypes read the materials-only sub-block. */
export const buildPriceSummaryPatch = (
  summaryAreaFields: Field[],
  detailed: DiagnosticPriceSummaryDetailed | null | undefined,
  currentSummaryType: string,
): Record<string, number> => {
  if (!detailed) return {};
  const backendType = toBackendSummaryType(currentSummaryType);
  const isTotal = backendType === TOTAL_SUMMARY_TYPE;
  const byType = isTotal ? undefined : detailed.byJobType[backendType];
  const totalBlock = isTotal ? detailed.total : byType?.total;
  const materialBlock = byType?.materialRelated;

  const patch: Record<string, number> = {};
  for (const field of summaryAreaFields) {
    const subtype = field.subtype ?? "";
    const isMaterial = subtype.endsWith(MATERIAL_SUFFIX);
    const baseSubtype = isMaterial ? subtype.slice(0, -MATERIAL_SUFFIX.length) : subtype;
    const key = SUMMARY_SUBTYPE_TO_PRICE_KEY[baseSubtype];
    if (!key) continue;
    const block = isMaterial ? materialBlock : totalBlock;
    const value = block?.[key];
    if (value === undefined) continue;
    patch[field.name] = value;
  }
  return patch;
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
