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
import { useDebouncedValue } from "../../../../hooks/useDebouncedValue";

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
  discountHidden: string;
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
  /** When true, skip onUserEdit to prevent dirty-marking during validation API in-flight. */
  isValidating?: boolean;
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

const detectChangedField = (
  prev: SparePartValues,
  cur: SparePartValues,
): { changedField: FieldName | null; changedValue: number } => {
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
};

const buildPriceInputs = (
  // isInitialRecalculation: boolean,
  cur: SparePartValues,
  // prev: SparePartValues,
): PriceInputs => {
  return {
    quantity: cur.quantity,
    unitPrice: cur.unitPrice,
    taxPercent: cur.tax,
    discountPercent: cur.discount,
    grossAmount: cur.grossAmount,
    netAmount: cur.netAmount,
    suggestedNetPrice: cur.suggestedNetPrice,
    totalAmount: cur.totalAmount,
    taxAmount: cur.taxAmount,
  };
};

type InitialRecalcDecision =
  | { outcome: "skip" }
  | { outcome: "proceed"; changedField: FieldName; changedValue: number }
  | { outcome: "continue" };

const resolveInitialRecalculation = (
  prev: SparePartValues,
  cur: SparePartValues,
  prevRef: { current: SparePartValues },
): InitialRecalcDecision => {
  const isPrevAllZero =
    !prev ||
    (prev.quantity === 0 &&
      prev.unitPrice === 0 &&
      prev.netAmount === 0 &&
      prev.grossAmount === 0 &&
      prev.grossAmount === 0);

  const hasAnyNewValue =
    cur &&
    cur.unitPrice !== 0 &&
    (cur.netAmount !== 0 || cur.grossAmount !== 0 || cur.totalAmount !== 0 || cur.quantity !== 0);

  if (!isPrevAllZero) return { outcome: "continue" };
  if (!hasAnyNewValue) return { outcome: "skip" };
  prevRef.current = cur;
  const needsInitialRecalculation =
    cur.unitPrice > 0 &&
    cur.quantity > 0 &&
    cur.grossAmount === 0 &&
    cur.netAmount === 0 &&
    cur.totalAmount === 0;
  // Backend may have updated unitPrice/tax while keeping stale downstream prices.
  const needsStaleRecalculation =
    !needsInitialRecalculation &&
    cur.unitPrice > 0 &&
    cur.quantity > 0 &&
    roundToTwo(cur.quantity * cur.unitPrice) !== cur.suggestedNetPrice;
  if (!needsInitialRecalculation && !needsStaleRecalculation) return { outcome: "skip" };
  return { outcome: "proceed", changedField: "unitPrice", changedValue: cur.unitPrice };
};

const shouldSkipEmptyFieldChange = (
  changedField: FieldName,
  changedValue: number,
  isInitialRecalculation: boolean,
  rawValues: {
    unitPrice: unknown;
    netAmount: unknown;
    grossAmount: unknown;
    totalAmount: unknown;
    discount: unknown;
    taxPercent: unknown;
  },
  prevRef: { current: SparePartValues },
): boolean => {
  if (isInitialRecalculation) return false;
  const emptyFieldMap: Partial<Record<FieldName, keyof typeof rawValues>> = {
    unitPrice: "unitPrice",
    netAmount: "netAmount",
    grossAmount: "grossAmount",
    totalAmount: "totalAmount",
    discountPercent: "discount",
    taxPercent: "taxPercent",
  };
  const rawKey = emptyFieldMap[changedField];
  if (rawKey === undefined || rawValues[rawKey] !== "") return false;
  const prevKeyMap: Partial<Record<FieldName, keyof SparePartValues>> = {
    unitPrice: "unitPrice",
    netAmount: "netAmount",
    grossAmount: "grossAmount",
    totalAmount: "totalAmount",
    discountPercent: "discount",
    taxPercent: "tax",
  };
  const prevKey = prevKeyMap[changedField];
  if (prevKey !== undefined) {
    prevRef.current = { ...prevRef.current, [prevKey]: changedValue };
  }
  return true;
};

const clampChangedValue = (
  changedField: FieldName,
  changedValue: number,
  prev: SparePartValues,
  discountBase: discountBase | undefined,
): number => {
  if (changedValue < 0) return 0;
  if (changedField === "totalAmount" && discountBase !== "NET_PRICE") {
    if (prev.grossAmount > 0 && changedValue > prev.grossAmount) return prev.grossAmount;
  }
  if (changedField === "netAmount" && discountBase === "NET_PRICE") {
    if (prev.suggestedNetPrice > 0 && changedValue > prev.suggestedNetPrice)
      return prev.suggestedNetPrice;
  }
  return changedValue;
};

/**
 * Custom hook to handle automatic price calculations for spare part fields
 * Watches for changes in quantity, unit price, tax, or discount and recalculates all dependent fields
 *
 * @param fieldNames - Object containing the field names for all price-related fields
 */
export const useSparePartPriceCalculation = (fieldNames: SparePartFieldNames) => {
  const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();
  const isCalculatingRef = useRef(false);

  // Raw field values for empty-check (before Number() coercion)
  const rawUnitPrice = values[fieldNames.unitPrice];
  const rawNetAmount = values[fieldNames.netAmount];
  const rawGrossAmount = values[fieldNames.grossAmount];
  const rawTotalAmount = values[fieldNames.totalAmount];
  const rawDiscount = values[fieldNames.discount];
  const rawTaxPercent = values[fieldNames.tax];

  const quantity = Number(values[fieldNames.quantity]) || 0;
  const unitPrice = Number(rawUnitPrice) || 0;
  const netAmount = Number(rawNetAmount) || 0;
  const suggestedNetPrice = Number(values[fieldNames.suggestedNetPrice]) || 0;
  const tax = Number(rawTaxPercent) || 0;
  const taxAmount = Number(values[fieldNames.taxAmount]) || 0;
  const grossAmount = Number(rawGrossAmount) || 0;
  const discount = Number(rawDiscount) || 0;
  const totalAmount = Number(rawTotalAmount) || 0;

  const recalculationTriggerSnapshot = JSON.stringify([
    values[fieldNames.quantity],
    rawUnitPrice,
    rawNetAmount,
    values[fieldNames.suggestedNetPrice],
    rawTaxPercent,
    values[fieldNames.taxAmount],
    rawGrossAmount,
    rawDiscount,
    rawTotalAmount,
  ]);
  const debouncedRecalculationTrigger = useDebouncedValue(recalculationTriggerSnapshot, 300);

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

  const setInputsOnPriceOrQuantityChange = (
    changedField: string,
    changedValue: number,
    inputs: PriceInputs,
  ) => {
    if (changedField === "unitPrice" || changedField === "quantity") {
      const freshQty = changedField === "quantity" ? changedValue : inputs.quantity;
      const freshPrice = changedField === "unitPrice" ? changedValue : inputs.unitPrice;
      inputs.suggestedNetPrice = roundToTwo(freshQty * freshPrice);
    }
    return inputs;
  };
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
    if (!changedField) {
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
      return;
    }
    const skipIfFocused = (
      name: string | undefined,
      focusedFieldName: string | null,
      value: number,
      setFieldCalls: Array<Promise<unknown>>,
    ) => {
      if (name && focusedFieldName !== name) {
        setFieldCalls.push(setFieldValue(name, value));
      }
    };
    let isInitialRecalculation = false;
    const initDecision = resolveInitialRecalculation(prev, cur, prevValuesRef);
    if (initDecision.outcome === "skip") return;
    if (initDecision.outcome === "proceed") {
      changedField = initDecision.changedField;
      changedValue = initDecision.changedValue;
      isInitialRecalculation = true;
    }

    // Always recalculate during initial recalc (isResyncingRef must not block it).
    const hasMissingPrices =
      cur.unitPrice > 0 &&
      cur.quantity > 0 &&
      (cur.suggestedNetPrice === 0 ||
        cur.netAmount === 0 ||
        cur.grossAmount === 0 ||
        cur.totalAmount === 0);

    const fieldManuallyChanged =
      prev.discount !== cur.discount ||
      prev.netAmount !== cur.netAmount ||
      prev.totalAmount !== cur.totalAmount ||
      prev.tax !== cur.tax;
    const shouldSkipCalc =
      !fieldManuallyChanged &&
      !hasMissingPrices &&
      !isInitialRecalculation &&
      (!!fieldNames.isResyncingRef?.current || (cur.unitPrice === 0 && prev.unitPrice === 0));

    if (shouldSkipCalc) {
      prevValuesRef.current = cur;
      return;
    }

    if (
      shouldSkipEmptyFieldChange(
        changedField,
        changedValue,
        isInitialRecalculation,
        {
          unitPrice: rawUnitPrice,
          netAmount: rawNetAmount,
          grossAmount: rawGrossAmount,
          totalAmount: rawTotalAmount,
          discount: rawDiscount,
          taxPercent: rawTaxPercent,
        },
        prevValuesRef,
      )
    ) {
      return;
    }

    // Clamp values to valid ranges
    changedValue = clampChangedValue(changedField, changedValue, prev, fieldNames.discountBase);

    if (!isInitialRecalculation && !fieldNames.isValidating) {
      fieldNames.onUserEdit?.();
    }

    isCalculatingRef.current = true;

    let inputs: PriceInputs = buildPriceInputs(cur);

    inputs = setInputsOnPriceOrQuantityChange(changedField, changedValue, inputs);

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

    // Helper to skip setting a field if it's currently focused (user is typing)
    // Use document.activeElement to detect the focused field by matching its name attribute
    const activeElement = document.activeElement as HTMLInputElement | null;
    const focusedFieldName = activeElement?.getAttribute?.("name") || null;
    const setIfNotFocused = (name: string, value: unknown) => {
      if (focusedFieldName !== name) {
        return setFieldValue(name, value);
      }
      return Promise.resolve();
    };
    const setFieldCalls: Array<Promise<unknown>> = [
      setIfNotFocused(fieldNames.quantity, results.quantity),
      setIfNotFocused(fieldNames.unitPrice, results.unitPrice),
      setIfNotFocused(fieldNames.netAmount, results.netAmount),
      setIfNotFocused(fieldNames.suggestedNetPrice, results.suggestedNetPrice),
      setIfNotFocused(fieldNames.tax, results.taxPercent),
      setIfNotFocused(fieldNames.grossAmount, results.grossAmount),
      setIfNotFocused(fieldNames.discount, results.discountPercent),
      setIfNotFocused(fieldNames.taxAmount, results.taxAmount),
      setIfNotFocused(fieldNames.totalAmount, results.totalAmount),
    ];

    skipIfFocused(
      fieldNames.discountSibling,
      focusedFieldName,
      results.discountPercent,
      setFieldCalls,
    );
    skipIfFocused(
      fieldNames.discountHidden,
      focusedFieldName,
      results.discountPercent,
      setFieldCalls,
    );
    skipIfFocused(
      fieldNames.discountAmountHidden,
      focusedFieldName,
      results.discountAmount,
      setFieldCalls,
    );

    void Promise.all(setFieldCalls).then(() => {
      isCalculatingRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: gated on the
  }, [debouncedRecalculationTrigger, fieldNames, setFieldValue]);
};
