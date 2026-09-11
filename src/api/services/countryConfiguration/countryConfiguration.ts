import axiosClient from "api/axios-client/axiosClient";
const localCountryConfigFiles = import.meta.glob("../../../../data/countryConfiguration*.json");
interface TaxRate {
  type: string;
  rate: number;
}

export interface LocalizationConfig {
  locale: string;
  language: string;
  primary: boolean;
}

interface Link {
  name: string;
  value: string;
}

interface Links {
  footer: Link[];
  header: Link[];
}

export interface Quantity {
  quantitySource: string;
  defaultQuantity: number;
}

export interface AllowedPosition {
  position: string;
  minCount: number;
  maxCount: number;
  quantity: Quantity;
  unitPriceSource: string;
}

export interface DiagnosticsRule {
  automaticRows: string[];
  allowedPositions: AllowedPosition[];
}

export interface DiagnosticsRuleEntry {
  actionType: string;
  jobType: string;
  rule: DiagnosticsRule;
}

export type discountBase = "GROSS_PRICE" | "NET_PRICE";

export interface DiagnosticsConfiguration {
  addSpecialMaterialsAllowed: boolean;
  discountBase?: discountBase;
  rules: DiagnosticsRuleEntry[];
}

export interface ReimbursementConfiguration {
  category: string;
  reimbursementMethods: {
    REPAIR: string;
    EXCHANGE: string;
  };
}

export interface CountryConfig {
  id: string;
  countryName: string;
  active: boolean;
  description: string;
  dateFormat: string;
  currency: string;
  currencySymbol: string;
  currencyDecimalSeparator: string;
  currencyThousandSeparator: string;
  taxRates: TaxRate[];
  localizationConfiguration: LocalizationConfig[];
  links: Links;
  diagnosticsConfiguration: DiagnosticsConfiguration;
  reimbursementConfig: ReimbursementConfiguration[];
  reimbursementCreateOn: string;
  reimbursementPeriodType: string;
}

export const getCountryConfig = async (countryCode: string) => {
  if (import.meta.env.DEV && !import.meta.env.TEST) {
    const key = `../../../../data/countryConfiguration${countryCode.toUpperCase()}.json`;
    const loader = localCountryConfigFiles[key];
    if (loader) {
      const data = (await loader()) as { default: CountryConfig };
      return data.default;
    }
    console.warn(
      `[CountryConfig] No local file found for country "${countryCode}". ` +
        `Expected: data/countryConfiguration${countryCode.toUpperCase()}.json`,
    );
  }
  try {
    const response = await axiosClient.get(`/v1/countries/${countryCode}/country-configuration`);
    return response.data;
  } catch (error) {
    console.error("Error fetching country configuration:", error);
    throw error;
  }
};
