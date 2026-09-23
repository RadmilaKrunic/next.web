import { Customer } from "api/services/customers/customers.types";
import { QuickFilter, Filter } from "components/ui/List/List.types";
import { matchesFilter } from "components/ui/List/List.utils";

const INDIVIDUAL_CUSTOMER_TYPES = new Set(["INDIVIDUAL_PRIVATE", "INDIVIDUAL_PRO"]);

export const getClientDisplayName = (customer: Customer): string => {
  switch (customer.customerType) {
    case "COMPANY":
      return customer.companyName;
    case "DEALERSHIP":
      return customer.dealershipName;
    default:
      return [customer.firstName, customer.lastName].filter(Boolean).join(" ");
  }
};

export function flattenCustomerForSearch(customer: Customer): string[] {
  return [
    getClientDisplayName(customer),
    customer.primaryEmail,
    customer.phoneNumber,
    customer.mobileNumber,
    customer.companyName,
    customer.dealershipName,
    customer.boschCustomerNumber,
  ].filter((value): value is string => Boolean(value));
}

export function filterClients(
  customers: Customer[],
  quickFilters: QuickFilter[],
  searchValue: string,
  advancedFilters: Filter[] = [],
): Customer[] {
  const activeQuickFilterKeys = quickFilters.filter((f) => f.selected).map((f) => f.key);

  return customers.filter((customer) => {
    if (activeQuickFilterKeys.length > 0) {
      const matchesQuickFilter = activeQuickFilterKeys.some((key) => {
        switch (key) {
          case "individual":
            return INDIVIDUAL_CUSTOMER_TYPES.has(customer.customerType);
          case "company":
            return customer.customerType === "COMPANY";
          case "dealership":
            return customer.customerType === "DEALERSHIP";
          default:
            return false;
        }
      });
      if (!matchesQuickFilter) return false;
    }

    if (searchValue.trim()) {
      const query = searchValue.toLowerCase();
      const values = flattenCustomerForSearch(customer);
      const matches = values.some((v) => v.toLowerCase().includes(query));
      if (!matches) return false;
    }

    if (advancedFilters.length > 0) {
      const matchesAdvanced = advancedFilters.every((filter) => {
        const value = filter.value;
        if (value === "" || value == null) return true;

        switch (filter.name) {
          case "customerType":
            return matchesFilter(value, customer.customerType);
          case "typeOfIndustry":
            return matchesFilter(value, customer.typeOfIndustry);
          default:
            return true;
        }
      });
      if (!matchesAdvanced) return false;
    }

    return true;
  });
}
