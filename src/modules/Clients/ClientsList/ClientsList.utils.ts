import { QuickFilter, Filter } from "components/ui/List/List.types";

const QUICK_FILTER_CUSTOMER_TYPE: Record<string, string> = {
  INDIVIDUAL_PRIVATE: "INDIVIDUAL_PRIVATE",
  INDIVIDUAL_PRO: "INDIVIDUAL_PRO",
  COMPANY: "COMPANY",
  DEALERSHIP: "DEALERSHIP",
};

export function resolveCustomerTypeFilter(
  quickFilters: QuickFilter[],
  advancedFilters: Filter[] = [],
): string[] | undefined {
  const advancedCustomerType = advancedFilters.find(
    (filter) => filter.name === "customerType" && filter.value,
  )?.value;
  if (advancedCustomerType) {
    return Array.isArray(advancedCustomerType)
      ? advancedCustomerType.map(String)
      : [String(advancedCustomerType)];
  }

  const selectedKeys = quickFilters
    .filter((f) => f.selected)
    .map((f) => QUICK_FILTER_CUSTOMER_TYPE[f.key])
    .filter(Boolean);

  return selectedKeys.length > 0 ? selectedKeys : undefined;
}
