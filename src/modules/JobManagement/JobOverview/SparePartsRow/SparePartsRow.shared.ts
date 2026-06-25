import type { RefObject } from "react";
import Field from "components/generics/Field/GenericField.types";
import type { discountBase } from "api/services/countryConfiguration/countryConfiguration";
import { useSparePartPriceCalculation } from "./useSparePartPriceCalculation";

function getSubtypeName(fields: Field[], subtype: string): string {
  return fields.find((f) => f.subtype === subtype)?.name || "";
}

export function resolveDiscountFieldNames(fields: Field[], discountBase: discountBase | undefined) {
  const discountHiddenFieldName = getSubtypeName(fields, "diagnosticDiscountHidden");
  const discountAmountHiddenFieldName = getSubtypeName(fields, "diagnosticDiscountAmountHidden");
  const activeDiscountFieldName =
    fields.find(
      (f) =>
        f.subtype === "diagnosticDiscount" &&
        f.dependentFields?.some((df) => df.fieldValue === (discountBase ?? "GROSS_PRICE")),
    )?.name || getSubtypeName(fields, "diagnosticDiscount");
  const discountSiblingFieldName =
    fields.find(
      (f) =>
        f.subtype === "diagnosticDiscount" &&
        !f.dependentFields?.some((df) => df.fieldValue === (discountBase ?? "GROSS_PRICE")),
    )?.name || "";
  return {
    discountHiddenFieldName,
    discountAmountHiddenFieldName,
    activeDiscountFieldName,
    discountSiblingFieldName,
  };
}

export function useSparePartsRowCommon({
  fields,
  activeDiscountFieldName,
  discountSiblingFieldName,
  discountHiddenFieldName,
  discountAmountHiddenFieldName,
  areaNamePrefix,
  isResyncingRef,
  discountBase,
  values,
  markRowDirty,
  areaIndex,
}: {
  fields: Field[];
  activeDiscountFieldName: string;
  discountSiblingFieldName: string;
  discountHiddenFieldName: string;
  discountAmountHiddenFieldName: string;
  areaNamePrefix: string;
  isResyncingRef: RefObject<boolean>;
  discountBase: discountBase | undefined;
  values: Record<string, unknown>;
  markRowDirty: (i: number) => void;
  areaIndex: number;
}): string {
  useSparePartPriceCalculation({
    quantity: getSubtypeName(fields, "diagnosticQuantity"),
    unitPrice: getSubtypeName(fields, "diagnosticUnitPrice"),
    netAmount: getSubtypeName(fields, "diagnosticNetAmount"),
    suggestedNetPrice: getSubtypeName(fields, "diagnosticSuggestedNetPrice"),
    tax: getSubtypeName(fields, "diagnosticTax"),
    grossAmount: getSubtypeName(fields, "diagnosticGrossAmount"),
    taxAmount: getSubtypeName(fields, "diagnosticTaxAmount"),
    discount: activeDiscountFieldName,
    discountSibling: discountSiblingFieldName || undefined,
    discountHidden: discountHiddenFieldName || undefined,
    discountAmountHidden: discountAmountHiddenFieldName || undefined,
    totalAmount: getSubtypeName(fields, "diagnosticTotalAmount"),
    areaNamePrefix,
    isResyncingRef,
    discountBase,
    onUserEdit: () => {
      markRowDirty(areaIndex);
    },
  });
  const nonPriceInputKey = JSON.stringify([
    values[getSubtypeName(fields, "diagnosticPosition")],
    values[getSubtypeName(fields, "diagnosticPartNumber")],
    values[getSubtypeName(fields, "diagnosticDescription")],
    values[getSubtypeName(fields, "diagnosticType")],
  ]);
  return nonPriceInputKey;
}
