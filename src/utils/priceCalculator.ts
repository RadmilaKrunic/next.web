/**
 * Price Calculator
 * Handles price calculations for diagnostic spare parts
 */

import Field from "components/generics/Field/GenericField.types";
import type { discountBase } from "api/services/countryConfiguration/countryConfiguration";

export interface PriceInputs {
  quantity: number;
  unitPrice: number;
  taxPercent: number;
  discountPercent: number;
  suggestedNetPrice: number;
  netAmount: number;
  grossAmount: number;
  totalAmount: number;
  taxAmount: number;
}

export interface PriceResults {
  quantity: number;
  unitPrice: number;
  suggestedNetPrice: number;
  netAmount: number;
  taxPercent: number;
  taxAmount: number;
  grossAmount: number;
  discountPercent: number;
  discountAmount: number;
  totalAmount: number;
}

export type FieldName =
  | "quantity"
  | "unitPrice"
  | "netAmount"
  | "suggestedNetPrice"
  | "taxPercent"
  | "grossAmount"
  | "discountPercent"
  | "totalAmount";

export const roundToTwo = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

/** Compute discount percent and clamp negative results to zero. */
function clampDiscountPercent(
  discountAmount: number,
  netAmount: number,
  baseAmount: number,
): { netAmount: number; discountPercent: number; discountAmount: number } {
  const dp = baseAmount > 0 ? roundToTwo((discountAmount / baseAmount) * 100) : 0;
  if (dp < 0) {
    return { netAmount: baseAmount, discountPercent: 0, discountAmount: 0 };
  }
  return { netAmount, discountPercent: dp, discountAmount };
}

function applyNetPriceSwitch(
  changedField: FieldName,
  changedValue: number,
  inputs: PriceInputs,
): PriceResults {
  let {
    quantity,
    unitPrice,
    taxPercent,
    discountPercent,
    netAmount,
    suggestedNetPrice,
    grossAmount,
    totalAmount,
    taxAmount,
  } = inputs;
  let discountAmount = 0;
  const baseSugNet = suggestedNetPrice > 0 ? suggestedNetPrice : roundToTwo(quantity * unitPrice);

  switch (changedField) {
    case "quantity":
      quantity = Math.max(0, changedValue);
      suggestedNetPrice = roundToTwo(quantity * unitPrice);
      discountAmount = roundToTwo((suggestedNetPrice * discountPercent) / 100);
      netAmount = roundToTwo(suggestedNetPrice - discountAmount);
      taxAmount = roundToTwo((netAmount * taxPercent) / 100);
      grossAmount = roundToTwo(netAmount + taxAmount);
      totalAmount = grossAmount;
      break;
    case "unitPrice":
      unitPrice = Math.max(0, changedValue);
      suggestedNetPrice = roundToTwo(quantity * unitPrice);
      discountAmount = roundToTwo((suggestedNetPrice * discountPercent) / 100);
      netAmount = roundToTwo(suggestedNetPrice - discountAmount);
      taxAmount = roundToTwo((netAmount * taxPercent) / 100);
      grossAmount = roundToTwo(netAmount + taxAmount);
      totalAmount = grossAmount;
      break;
    case "netAmount":
      netAmount = Math.max(0, changedValue);
      suggestedNetPrice = roundToTwo(quantity * unitPrice);
      discountAmount = roundToTwo(suggestedNetPrice - netAmount);
      ({ netAmount, discountPercent, discountAmount } = clampDiscountPercent(
        discountAmount,
        netAmount,
        suggestedNetPrice,
      ));
      taxAmount = roundToTwo((netAmount * taxPercent) / 100);
      grossAmount = roundToTwo(netAmount + taxAmount);
      totalAmount = grossAmount;
      break;
    case "taxPercent":
      taxPercent = Math.max(0, Math.min(100, changedValue));
      suggestedNetPrice = roundToTwo(quantity * unitPrice);
      discountAmount = roundToTwo((suggestedNetPrice * discountPercent) / 100);
      netAmount = roundToTwo(suggestedNetPrice - discountAmount);
      taxAmount = roundToTwo((netAmount * taxPercent) / 100);
      grossAmount = roundToTwo(netAmount + taxAmount);
      totalAmount = grossAmount;
      break;
    case "discountPercent":
      discountPercent = Math.max(0, changedValue);
      suggestedNetPrice = roundToTwo(quantity * unitPrice);
      discountAmount = roundToTwo((suggestedNetPrice * discountPercent) / 100);
      netAmount = roundToTwo(suggestedNetPrice - discountAmount);
      taxAmount = roundToTwo((netAmount * taxPercent) / 100);
      grossAmount = roundToTwo(netAmount + taxAmount);
      totalAmount = grossAmount;
      break;
    case "totalAmount":
      totalAmount = Math.max(0, changedValue);
      grossAmount = totalAmount;
      netAmount = taxPercent > 0 ? roundToTwo(totalAmount / (1 + taxPercent / 100)) : totalAmount;
      discountAmount = roundToTwo(baseSugNet - netAmount);
      ({ netAmount, discountPercent, discountAmount } = clampDiscountPercent(
        discountAmount,
        netAmount,
        baseSugNet,
      ));
      taxAmount = roundToTwo((netAmount * taxPercent) / 100);
      grossAmount = roundToTwo(netAmount + taxAmount);
      totalAmount = grossAmount;
      suggestedNetPrice = baseSugNet;
      break;
    case "grossAmount":
      grossAmount = Math.max(0, changedValue);
      netAmount = taxPercent > 0 ? roundToTwo(grossAmount / (1 + taxPercent / 100)) : grossAmount;
      discountAmount = roundToTwo(baseSugNet - netAmount);
      ({ netAmount, discountPercent, discountAmount } = clampDiscountPercent(
        discountAmount,
        netAmount,
        baseSugNet,
      ));
      taxAmount = roundToTwo((netAmount * taxPercent) / 100);
      grossAmount = roundToTwo(netAmount + taxAmount);
      totalAmount = grossAmount;
      suggestedNetPrice = baseSugNet;
      break;
    default:
      suggestedNetPrice = roundToTwo(quantity * unitPrice);
      discountAmount = roundToTwo((suggestedNetPrice * discountPercent) / 100);
      netAmount = roundToTwo(suggestedNetPrice - discountAmount);
      taxAmount = roundToTwo((netAmount * taxPercent) / 100);
      grossAmount = roundToTwo(netAmount + taxAmount);
      totalAmount = grossAmount;
  }
  return {
    quantity,
    unitPrice,
    suggestedNetPrice,
    netAmount,
    taxPercent,
    taxAmount,
    grossAmount,
    discountPercent,
    discountAmount,
    totalAmount,
  };
}

export const calculatePrices = (
  inputs: PriceInputs,
  changedField: FieldName,
  changedValue: number,
  mode: discountBase = "GROSS_PRICE",
): PriceResults => {
  let { quantity, unitPrice, taxPercent, discountPercent } = inputs;

  taxPercent = Math.max(0, Math.min(100, taxPercent));

  let netAmount = inputs.netAmount || 0;
  let suggestedNetPrice = inputs.suggestedNetPrice || 0;
  let grossAmount = inputs.grossAmount || 0;
  let totalAmount = inputs.totalAmount || 0;
  let taxAmount = inputs.taxAmount || 0;
  let discountAmount: number;

  if (mode === "NET_PRICE") {
    return applyNetPriceSwitch(changedField, changedValue, {
      quantity,
      unitPrice,
      taxPercent,
      discountPercent,
      netAmount,
      suggestedNetPrice,
      grossAmount,
      totalAmount,
      taxAmount,
    });
  } else {
    // ── GROSS mode (default): discount on gross price ────────────────────────
    switch (changedField) {
      case "quantity":
        quantity = Math.max(0, changedValue);
        suggestedNetPrice = roundToTwo(quantity * unitPrice);
        netAmount = suggestedNetPrice;
        taxAmount = roundToTwo((suggestedNetPrice * taxPercent) / 100);
        grossAmount = roundToTwo(suggestedNetPrice + taxAmount);
        discountAmount = roundToTwo((grossAmount * discountPercent) / 100);
        totalAmount = roundToTwo(grossAmount - discountAmount);
        break;

      case "unitPrice":
        unitPrice = Math.max(0, changedValue);
        suggestedNetPrice = roundToTwo(quantity * unitPrice);
        netAmount = suggestedNetPrice;
        taxAmount = roundToTwo((suggestedNetPrice * taxPercent) / 100);
        grossAmount = roundToTwo(suggestedNetPrice + taxAmount);
        discountAmount = roundToTwo((grossAmount * discountPercent) / 100);
        totalAmount = roundToTwo(grossAmount - discountAmount);
        break;

      case "netAmount":
        netAmount = Math.max(0, changedValue);
        suggestedNetPrice = netAmount;
        taxAmount = roundToTwo((suggestedNetPrice * taxPercent) / 100);
        grossAmount = roundToTwo(suggestedNetPrice + taxAmount);
        discountAmount = roundToTwo((grossAmount * discountPercent) / 100);
        totalAmount = roundToTwo(grossAmount - discountAmount);
        break;

      case "taxPercent":
        taxPercent = Math.max(0, Math.min(100, changedValue));
        suggestedNetPrice = roundToTwo(quantity * unitPrice);
        netAmount = suggestedNetPrice;
        taxAmount = roundToTwo((suggestedNetPrice * taxPercent) / 100);
        grossAmount = roundToTwo(suggestedNetPrice + taxAmount);
        discountAmount = roundToTwo((grossAmount * discountPercent) / 100);
        totalAmount = roundToTwo(grossAmount - discountAmount);
        break;

      case "grossAmount":
        grossAmount = Math.max(0, changedValue);
        suggestedNetPrice = roundToTwo(quantity * unitPrice);
        netAmount = suggestedNetPrice;
        taxAmount = roundToTwo(grossAmount - suggestedNetPrice);
        discountAmount = roundToTwo((grossAmount * discountPercent) / 100);
        totalAmount = roundToTwo(grossAmount - discountAmount);
        break;

      case "discountPercent":
        discountPercent = Math.max(0, changedValue);
        suggestedNetPrice = roundToTwo(quantity * unitPrice);
        netAmount = suggestedNetPrice;
        taxAmount = roundToTwo((suggestedNetPrice * taxPercent) / 100);
        grossAmount = roundToTwo(suggestedNetPrice + taxAmount);
        discountAmount = roundToTwo((grossAmount * discountPercent) / 100);
        totalAmount = roundToTwo(grossAmount - discountAmount);
        break;

      case "totalAmount":
        totalAmount = Math.max(0, changedValue);
        taxAmount = roundToTwo((suggestedNetPrice * taxPercent) / 100);
        if (grossAmount > 0) {
          discountPercent = roundToTwo(((grossAmount - totalAmount) / grossAmount) * 100);
          // totalAmount cannot exceed grossAmount (would imply negative discount)
          if (discountPercent < 0) {
            discountPercent = 0;
            totalAmount = grossAmount;
          }
          discountAmount = roundToTwo((grossAmount * discountPercent) / 100);
        } else {
          discountPercent = 0;
          discountAmount = 0;
        }
        break;

      default:
        suggestedNetPrice = roundToTwo(quantity * unitPrice);
        netAmount = suggestedNetPrice;
        taxAmount = roundToTwo((suggestedNetPrice * taxPercent) / 100);
        grossAmount = roundToTwo(suggestedNetPrice + taxAmount);
        discountAmount = roundToTwo((grossAmount * discountPercent) / 100);
        totalAmount = roundToTwo(grossAmount - discountAmount);
    }
  }

  return {
    quantity,
    unitPrice,
    suggestedNetPrice,
    netAmount,
    taxPercent,
    taxAmount,
    grossAmount,
    discountPercent,
    discountAmount,
    totalAmount,
  };
};

export const resetRowPrices = (
  quantity: number,
  unitPrice: number,
  taxPercent = 0,
  mode: discountBase = "GROSS_PRICE",
): PriceResults => {
  return calculatePrices(
    {
      quantity,
      unitPrice,
      taxPercent,
      discountPercent: 0,
      grossAmount: 0,
      suggestedNetPrice: 0,
      netAmount: 0,
      totalAmount: 0,
      taxAmount: 0,
    },
    "unitPrice",
    unitPrice,
    mode,
  );
};

export const SUMMARY_TYPE_FILTER: Record<string, (type: string) => boolean> = {
  totalSummary: () => true,
  warranty: (t) => t === "WARRANTY",
  specialContract: (t) => t === "SPECIAL_CONTRACT",
  chargeable: (t) => t === "CHARGEABLE",
  commercialGoodwill: (t) => t === "COMMERCIAL_GOODWILL",
  serviceOffering: (t) => t === "SERVICE_OFFERING",
};

export function calculateSummaryTotalAmountDistribution(
  totalAmountValue: number,
  currentGrossAmountSum: number,
): number {
  if (currentGrossAmountSum <= 0) {
    return 0;
  }
  return roundToTwo(((currentGrossAmountSum - totalAmountValue) / currentGrossAmountSum) * 100);
}

export function calculateSummaryNetAmountDistribution(
  netAmountValue: number,
  suggestedNetPriceSum: number,
): number {
  if (suggestedNetPriceSum <= 0) {
    return 0;
  }
  return roundToTwo(((suggestedNetPriceSum - netAmountValue) / suggestedNetPriceSum) * 100);
}

export function calculateSummaryDiscountDistribution(
  discountPercent: number,
  suggestedNetPriceSum: number,
  grossAmountSum: number,
  mode: discountBase = "GROSS_PRICE",
): number {
  if (mode === "NET_PRICE") {
    return roundToTwo(suggestedNetPriceSum * (1 - discountPercent / 100));
  }
  return roundToTwo(grossAmountSum * (1 - discountPercent / 100));
}

/** Positions eligible to receive a summary-level discount distribution. */
export const DISTRIBUTABLE_POSITIONS = new Set(["SP", "PN", "AC"]);

const isActive = (field: Field, discountBase: string) => {
  return field.dependentFields?.some((df) => df.fieldValue === discountBase);
};

function distributeToRows(
  mode: discountBase,
  discountPercent: number,
  typeFilter: (type: string) => boolean,
  values: Record<string, unknown>,
  setFieldValue: (field: string, val: unknown) => unknown,
  allFields: Field[],
): void {
  const rows: Record<
    string,
    { discount: number; discountFieldName: string; type: string; position: string }
  > = {};
  const temp = allFields.filter((f) => f.subtype === "diagnosticDiscount");

  let index = 0;
  for (const field of temp) {
    if (!isActive(field, mode)) continue;
    const sibling = (f: Field) =>
      f.fieldMapping?.nameStartsWith === field.fieldMapping?.nameStartsWith;
    const tempTypeField = allFields.find((f) => f.subtype === "diagnosticType" && sibling(f));
    const tempPositionField = allFields.find(
      (f) => f.subtype === "diagnosticPosition" && sibling(f),
    );
    rows[index] = {
      discount: Number(values[field.name] || 0),
      discountFieldName: field.name,
      type: (values[tempTypeField?.name || ""] as string) || "",
      position: (values[tempPositionField?.name || ""] as string) || "",
    };
    index++;
  }

  const filtered = Object.values(rows).filter(
    (r) => r.discountFieldName && typeFilter(r.type) && DISTRIBUTABLE_POSITIONS.has(r.position),
  );
  if (filtered.length === 0) return;

  filtered.forEach((row) => {
    setFieldValue(row.discountFieldName, roundToTwo(discountPercent));
  });
}

export function distributeGrossToRows(
  discountPercent: number,
  typeFilter: (type: string) => boolean,
  values: Record<string, unknown>,
  setFieldValue: (field: string, val: unknown) => unknown,
  allFields: Field[],
): void {
  distributeToRows("GROSS_PRICE", discountPercent, typeFilter, values, setFieldValue, allFields);
}

export function distributeNetToRows(
  discountPercent: number,
  typeFilter: (type: string) => boolean,
  values: Record<string, unknown>,
  setFieldValue: (field: string, val: unknown) => unknown,
  allFields: Field[],
): void {
  distributeToRows("NET_PRICE", discountPercent, typeFilter, values, setFieldValue, allFields);
}

export interface RowAggregate {
  suggestedNetPrice: number;
  netAmount: number;
  grossAmount: number;
  totalAmount: number;
  discount: number;
  taxAmount: number;
  discountAmount: number;
}

function buildPositionByRow(
  allFields: Field[],
  positionKey: string,
  values: Record<string, unknown>,
  positionFilter?: (position: string) => boolean,
): Map<string, string> {
  const positionByRow = new Map<string, string>();
  if (positionFilter) {
    allFields.forEach((f) => {
      if (f.subtype === positionKey && f.fieldMapping?.nameStartsWith) {
        positionByRow.set(f.fieldMapping.nameStartsWith, (values[f.name] as string) || "");
      }
    });
  }
  return positionByRow;
}

function findTypeSiblingPrefixes(
  allFields: Field[],
  typeKey: string,
  values: Record<string, unknown>,
  typeFilter?: (type: string) => boolean,
  positionFilter?: (position: string) => boolean,
  positionByRow?: Map<string, string>,
): (string | undefined)[] {
  return allFields.map((f) => {
    if (f.subtype === typeKey && typeFilter?.(values[f.name] as string)) {
      if (positionFilter) {
        const ns = f.fieldMapping?.nameStartsWith ?? "";
        if (!positionFilter(positionByRow?.get(ns) ?? "")) return undefined;
      }
      return f.fieldMapping?.nameStartsWith;
    }
    return undefined;
  });
}

function sumPriceSubtypes(
  temp: Field[],
  values: Record<string, unknown>,
  keys: {
    suggestedNetPriceKey: string;
    netAmountKey: string;
    grossAmountKey: string;
    totalAmountKey: string;
    taxAmountKey: string;
  },
): {
  suggestedNetPriceSum: number;
  netAmountSum: number;
  grossAmountSum: number;
  totalAmountSum: number;
  taxAmountSum: number;
} {
  let suggestedNetPriceSum = 0;
  let netAmountSum = 0;
  let grossAmountSum = 0;
  let totalAmountSum = 0;
  let taxAmountSum = 0;
  for (const field of temp) {
    const val = values[field.name] ? Number(values[field.name]) || 0 : 0;
    if (field.subtype === keys.suggestedNetPriceKey) suggestedNetPriceSum += val;
    else if (field.subtype === keys.netAmountKey) netAmountSum += val;
    else if (field.subtype === keys.grossAmountKey) grossAmountSum += val;
    else if (field.subtype === keys.totalAmountKey) totalAmountSum += val;
    else if (field.subtype === keys.taxAmountKey) taxAmountSum += val;
  }
  return { suggestedNetPriceSum, netAmountSum, grossAmountSum, totalAmountSum, taxAmountSum };
}

export const aggregateRowPrices = (
  values: Record<string, unknown>,
  allFields: Field[],
  typeFilter?: (type: string) => boolean,
  mode: discountBase = "GROSS_PRICE",
  positionFilter?: (position: string) => boolean,
): RowAggregate => {
  const priceKeys = {
    suggestedNetPriceKey: "diagnosticSuggestedNetPrice",
    netAmountKey: "diagnosticNetAmount",
    grossAmountKey: "diagnosticGrossAmount",
    totalAmountKey: "diagnosticTotalAmount",
    taxAmountKey: "diagnosticTaxAmount",
  };
  const typeKey = "diagnosticType";
  const positionKey = "diagnosticPosition";
  const priceFieldsSubtypes = Object.values(priceKeys);

  const positionByRow = buildPositionByRow(allFields, positionKey, values, positionFilter);
  const siblingsFromTypeFilter = findTypeSiblingPrefixes(
    allFields,
    typeKey,
    values,
    typeFilter,
    positionFilter,
    positionByRow,
  );

  const temp = allFields.filter(
    (f) =>
      priceFieldsSubtypes.includes(f.subtype || "") &&
      siblingsFromTypeFilter.includes(f.fieldMapping?.nameStartsWith),
  );

  const { suggestedNetPriceSum, netAmountSum, grossAmountSum, totalAmountSum, taxAmountSum } =
    sumPriceSubtypes(temp, values, priceKeys);

  const suggestedNetPrice = roundToTwo(suggestedNetPriceSum);
  const gross = roundToTwo(grossAmountSum);
  const netAmount = roundToTwo(netAmountSum);
  const final = roundToTwo(totalAmountSum);
  const taxAmount = roundToTwo(taxAmountSum);

  let discount = 0;
  if (mode === "NET_PRICE") {
    discount =
      suggestedNetPrice > 0
        ? roundToTwo(((suggestedNetPrice - netAmount) / suggestedNetPrice) * 100)
        : 0;
  } else {
    discount = gross > 0 ? roundToTwo(((gross - final) / gross) * 100) : 0;
  }

  return {
    suggestedNetPrice,
    netAmount,
    grossAmount: gross,
    totalAmount: final,
    discount,
    taxAmount,
    discountAmount:
      mode === "NET_PRICE" ? roundToTwo(suggestedNetPrice - netAmount) : roundToTwo(gross - final),
  };
};
