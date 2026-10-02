export interface CustomerChangeFieldComparison {
  fieldName: string;
  fieldLabel: string;
  originalValue: unknown;
  currentValue: unknown;
}
export interface CustomerChangeConfirmationData {
  comparisons: CustomerChangeFieldComparison[];
  signature: string;
}

export interface CustomerChangeComparisonSection {
  titleKey: string;
  comparisons: CustomerChangeFieldComparison[];
}

export interface VisibleCustomerField {
  fieldName: string;
  fieldLabel: string;
}

export function formatPrimitiveFieldValue(
  value: string | number | bigint | boolean,
  t: (key: string) => string,
): string {
  if (typeof value === "boolean") {
    return value ? t("yes") : t("no");
  }

  if (typeof value === "string") {
    return value.trim() === "" ? t("customerChangeEmptyValue") : value;
  }

  return value.toString();
}

export function formatObjectFieldValue(value: object, t: (key: string) => string): string {
  try {
    const serializedValue = JSON.stringify(value);
    return serializedValue && serializedValue !== "{}"
      ? serializedValue
      : t("customerChangeEmptyValue");
  } catch {
    return t("customerChangeEmptyValue");
  }
}

export function formatFieldValue(value: unknown, t: (key: string) => string): string {
  if (value === undefined || value === null) {
    return t("customerChangeEmptyValue");
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint" ||
    typeof value === "boolean"
  ) {
    return formatPrimitiveFieldValue(value, t);
  }

  if (Array.isArray(value)) {
    return value.length === 0
      ? t("customerChangeEmptyValue")
      : value.map((item) => formatFieldValue(item, t)).join(", ");
  }

  if (typeof value === "object") {
    return formatObjectFieldValue(value, t);
  }

  return t("customerChangeEmptyValue");
}

export function getComparisonSectionKey(fieldName: string): string {
  if (fieldName.startsWith("delivery") || fieldName === "addressLineTwoDelivery") {
    return "deliveryAddressData";
  }

  if (
    fieldName === "streetName" ||
    fieldName === "houseNumber" ||
    fieldName === "neighborhood" ||
    fieldName === "postalCode" ||
    fieldName === "district" ||
    fieldName === "city" ||
    fieldName === "state" ||
    fieldName === "countryCode" ||
    fieldName === "addressLineTwo"
  ) {
    return "billingAddressData";
  }

  return "commonCustomerData";
}

export function getComparisonSections(
  fieldComparisons: CustomerChangeFieldComparison[],
): CustomerChangeComparisonSection[] {
  const sectionOrder = ["commonCustomerData", "billingAddressData", "deliveryAddressData"];
  const sections = new Map<string, CustomerChangeFieldComparison[]>();

  for (const comparison of fieldComparisons) {
    const sectionKey = getComparisonSectionKey(comparison.fieldName);
    const currentComparisons = sections.get(sectionKey) ?? [];
    currentComparisons.push(comparison);
    sections.set(sectionKey, currentComparisons);
  }

  return sectionOrder
    .map((titleKey) => ({
      titleKey,
      comparisons: sections.get(titleKey) ?? [],
    }))
    .filter((section) => section.comparisons.length > 0);
}
