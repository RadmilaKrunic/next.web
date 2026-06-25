import { useEffect, useRef } from "react";
import { useFormikContext } from "formik";
import type { RefObject } from "react";
import {
  calculatePrices,
  roundToTwo,
  type FieldName,
  type PriceInputs,
} from "../../../../utils/priceCalculator";
import type { discountBase } from "../../../../api/services/countryConfiguration/countryConfiguration";

interface SparePartFieldNames {
  quantity: string;
  unitPrice: string;
  netAmount: string;
  tax: string;
  grossAmount: string;
  discount: string;
  /** The sibling discount field (opposite mode). Updated in sync with `discount`. */
  discountSibling?: string;
  /** Hidden field that always holds the current discount value for API mapping. */
  discountHidden?: string;
  /** Hidden field that always holds the calculated discount amount for API mapping. */
  discountAmountHidden?: string;
  taxAmount: string;
  totalAmount: string;
  suggestedNetPrice: string;
  /** Prefix shared by all fields in this area (fieldMapping.nameStartsWith). */
  areaNamePrefix?: string;
  onUserEdit?: () => void;
  /** When true, price changes are treated as API-driven reinitialization, not user input. */
  isResyncingRef?: RefObject<boolean>;
  /**
   * Country-level price calculation mode.
   */
  discountBase?: discountBase;
}

interface SparePartValues {
  quantity: number;
  unitPrice: number;
  netAmount: number;
  suggestedNetPrice: number;
  tax: number;
  taxAmount: number;
  grossAmount: number;
  discount: number;
  totalAmount: number;
}

function detectChangedField(
  prev: SparePartValues,
  cur: SparePartValues,
): { changedField: FieldName | null; changedValue: number } {
  if (cur.quantity !== prev.quantity)
    return { changedField: "quantity", changedValue: cur.quantity };
  if (cur.unitPrice !== prev.unitPrice)
    return { changedField: "unitPrice", changedValue: cur.unitPrice };
  if (cur.discount !== prev.discount)
    return { changedField: "discountPercent", changedValue: cur.discount };
  if (cur.netAmount !== prev.netAmount)
    return { changedField: "netAmount", changedValue: cur.netAmount };
  if (cur.tax !== prev.tax) return { changedField: "taxPercent", changedValue: cur.tax };
  if (cur.grossAmount !== prev.grossAmount)
    return { changedField: "grossAmount", changedValue: cur.grossAmount };
  if (cur.totalAmount !== prev.totalAmount)
    return { changedField: "totalAmount", changedValue: cur.totalAmount };
  return { changedField: null, changedValue: 0 };
}

function buildPriceInputs(
  isInitialRecalculation: boolean,
  cur: SparePartValues,
  prev: SparePartValues,
): PriceInputs {
  return isInitialRecalculation
    ? {
        quantity: cur.quantity,
        unitPrice: cur.unitPrice,
        taxPercent: cur.tax,
        discountPercent: cur.discount,
        grossAmount: cur.grossAmount,
        netAmount: cur.netAmount,
        suggestedNetPrice: cur.suggestedNetPrice,
        totalAmount: cur.totalAmount,
        taxAmount: cur.taxAmount,
      }
    : {
        quantity: prev.quantity,
        unitPrice: prev.unitPrice,
        taxPercent: prev.tax,
        discountPercent: prev.discount,
        grossAmount: prev.grossAmount,
        netAmount: prev.netAmount,
        suggestedNetPrice: prev.suggestedNetPrice,
        totalAmount: prev.totalAmount,
        taxAmount: prev.taxAmount,
      };
}

type InitialRecalcDecision =
  | { outcome: "skip" }
  | { outcome: "proceed"; changedField: FieldName; changedValue: number }
  | { outcome: "continue" };

function resolveInitialRecalculation(
  prev: SparePartValues,
  cur: SparePartValues,
  prevRef: { current: SparePartValues },
): InitialRecalcDecision {
  const isPrevAllZero =
    prev.quantity === 0 && prev.unitPrice === 0 && prev.netAmount === 0 && prev.grossAmount === 0;
  const hasAnyNewValue =
    cur.unitPrice !== 0 || cur.netAmount !== 0 || cur.grossAmount !== 0 || cur.totalAmount !== 0;
  if (!isPrevAllZero || !hasAnyNewValue) return { outcome: "continue" };
  prevRef.current = cur;
  const needsInitialRecalculation =
    cur.unitPrice > 0 &&
    cur.quantity > 0 &&
    cur.tax > 0 &&
    cur.grossAmount === 0 &&
    cur.totalAmount === 0;
  // Backend may have updated unitPrice/tax while keeping stale downstream prices.
  const needsStaleRecalculation =
    !needsInitialRecalculation &&
    cur.unitPrice > 0 &&
    cur.quantity > 0 &&
    roundToTwo(cur.quantity * cur.unitPrice) !== cur.suggestedNetPrice;
  if (!needsInitialRecalculation && !needsStaleRecalculation) return { outcome: "skip" };
  return { outcome: "proceed", changedField: "unitPrice", changedValue: cur.unitPrice };
}

function shouldSkipEmptyFieldChange(
  changedField: FieldName,
  changedValue: number,
  isInitialRecalculation: boolean,
  values: Record<string, unknown>,
  fieldNames: SparePartFieldNames,
  prevRef: { current: SparePartValues },
): boolean {
  if (isInitialRecalculation) return false;
  const emptyFieldMap: Partial<Record<FieldName, string>> = {
    unitPrice: fieldNames.unitPrice,
    netAmount: fieldNames.netAmount,
    grossAmount: fieldNames.grossAmount,
    totalAmount: fieldNames.totalAmount,
    discountPercent: fieldNames.discount,
  };
  const rawKey = emptyFieldMap[changedField];
  if (rawKey === undefined || values[rawKey] !== "") return false;
  const prevKeyMap: Partial<Record<FieldName, keyof SparePartValues>> = {
    unitPrice: "unitPrice",
    netAmount: "netAmount",
    grossAmount: "grossAmount",
    totalAmount: "totalAmount",
    discountPercent: "discount",
  };
  const prevKey = prevKeyMap[changedField];
  if (prevKey !== undefined) {
    prevRef.current = { ...prevRef.current, [prevKey]: changedValue };
  }
  return true;
}

function clampChangedValue(
  changedField: FieldName,
  changedValue: number,
  prev: SparePartValues,
  discountBase: discountBase | undefined,
): number {
  if (changedValue < 0) return 0;
  if (changedField === "totalAmount" && discountBase !== "NET_PRICE") {
    if (prev.grossAmount > 0 && changedValue > prev.grossAmount) return prev.grossAmount;
  }
  if (changedField === "netAmount" && discountBase === "NET_PRICE") {
    if (prev.suggestedNetPrice > 0 && changedValue > prev.suggestedNetPrice)
      return prev.suggestedNetPrice;
  }
  return changedValue;
}

function buildOptionalFieldCalls(
  fieldNames: SparePartFieldNames,
  results: { discountPercent: number; discountAmount: number },
  setFieldValue: (name: string, value: unknown) => Promise<unknown>,
): Promise<unknown>[] {
  const calls: Promise<unknown>[] = [];
  if (fieldNames.discountSibling) {
    calls.push(setFieldValue(fieldNames.discountSibling, results.discountPercent));
  }
  if (fieldNames.discountHidden) {
    calls.push(setFieldValue(fieldNames.discountHidden, results.discountPercent));
  }
  if (fieldNames.discountAmountHidden) {
    calls.push(setFieldValue(fieldNames.discountAmountHidden, results.discountAmount));
  }
  return calls;
}

/**
 * Custom hook to handle automatic price calculations for spare part fields
 * Watches for changes in quantity, unit price, tax, or discount and recalculates all dependent fields
 *
 * @param fieldNames - Object containing the field names for all price-related fields
 */
export const useSparePartPriceCalculation = (fieldNames: SparePartFieldNames) => {
  const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();
  const isCalculatingRef = useRef(false);

  useEffect(() => {
    const current = values[fieldNames.discount];
    if (current === "" || current == null) {
      void setFieldValue(fieldNames.discount, 0);
    }
  }, [fieldNames.discount, setFieldValue, values]);

  const quantity = Number(values[fieldNames.quantity]) || 0;
  const unitPrice = Number(values[fieldNames.unitPrice]) || 0;
  const netAmount = Number(values[fieldNames.netAmount]) || 0;
  const suggestedNetPrice = Number(values[fieldNames.suggestedNetPrice]) || 0;
  const tax = Number(values[fieldNames.tax]) || 0;
  const taxAmount = Number(values[fieldNames.taxAmount]) || 0;
  const grossAmount = Number(values[fieldNames.grossAmount]) || 0;
  const discount = Number(values[fieldNames.discount]) || 0;
  const totalAmount = Number(values[fieldNames.totalAmount]) || 0;

  const prevValuesRef = useRef({
    quantity,
    unitPrice,
    suggestedNetPrice,
    netAmount,
    tax,
    taxAmount,
    grossAmount,
    discount,
    totalAmount,
  });

  useEffect(() => {
    if (isCalculatingRef.current) return;

    const prev = prevValuesRef.current;
    const cur: SparePartValues = {
      quantity,
      unitPrice,
      netAmount,
      suggestedNetPrice,
      tax,
      taxAmount,
      grossAmount,
      discount,
      totalAmount,
    };
    let { changedField, changedValue } = detectChangedField(prev, cur);

    if (changedField) {
      let isInitialRecalculation = false;

      const initDecision = resolveInitialRecalculation(prev, cur, prevValuesRef);
      if (initDecision.outcome === "skip") return;
      if (initDecision.outcome === "proceed") {
        changedField = initDecision.changedField;
        changedValue = initDecision.changedValue;
        isInitialRecalculation = true;
      }

      const shouldSkipCalc =
        (cur.unitPrice === 0 && prev.unitPrice === 0) || !!fieldNames.isResyncingRef?.current;
      if (shouldSkipCalc) {
        prevValuesRef.current = cur;
        return;
      }

      if (
        shouldSkipEmptyFieldChange(
          changedField,
          changedValue,
          isInitialRecalculation,
          values,
          fieldNames,
          prevValuesRef,
        )
      ) {
        return;
      }

      // Clamp values to valid ranges
      changedValue = clampChangedValue(changedField, changedValue, prev, fieldNames.discountBase);

      if (!isInitialRecalculation) {
        fieldNames.onUserEdit?.();
      }

      isCalculatingRef.current = true;

      // For initial recalculation use the current values; for user-driven changes use prev
      const inputs: PriceInputs = buildPriceInputs(isInitialRecalculation, cur, prev);

      const results = calculatePrices(
        inputs,
        changedField,
        changedValue,
        fieldNames.discountBase ?? "GROSS_PRICE",
      );

      prevValuesRef.current = {
        quantity: results.quantity,
        unitPrice: results.unitPrice,
        netAmount: results.netAmount,
        suggestedNetPrice: results.suggestedNetPrice,
        tax: results.taxPercent,
        taxAmount: results.taxAmount,
        grossAmount: results.grossAmount,
        discount: results.discountPercent,
        totalAmount: results.totalAmount,
      };

      const setFieldCalls: Array<Promise<unknown>> = [
        setFieldValue(fieldNames.quantity, results.quantity),
        setFieldValue(fieldNames.unitPrice, results.unitPrice),
        setFieldValue(fieldNames.netAmount, results.netAmount),
        setFieldValue(fieldNames.suggestedNetPrice, results.suggestedNetPrice),
        setFieldValue(fieldNames.tax, results.taxPercent),
        setFieldValue(fieldNames.grossAmount, results.grossAmount),
        setFieldValue(fieldNames.discount, results.discountPercent),
        setFieldValue(fieldNames.taxAmount, results.taxAmount),
        setFieldValue(fieldNames.totalAmount, results.totalAmount),
      ];

      setFieldCalls.push(...buildOptionalFieldCalls(fieldNames, results, setFieldValue));

      void Promise.all(setFieldCalls).then(() => {
        isCalculatingRef.current = false;
      });
    } else {
      prevValuesRef.current = {
        quantity,
        unitPrice,
        netAmount,
        suggestedNetPrice,
        tax,
        taxAmount,
        grossAmount,
        discount,
        totalAmount,
      };
    }
  }, [
    quantity,
    unitPrice,
    netAmount,
    tax,
    taxAmount,
    grossAmount,
    discount,
    totalAmount,
    suggestedNetPrice,
    fieldNames,
    setFieldValue,
    values,
  ]);
};
