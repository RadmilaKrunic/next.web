import axiosClient from "api/axios-client/axiosClient";

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
  quantitySource: string | null;
  defaultQuantity: number | null;
}

export interface AllowedPosition {
  position: string;
  minCount: number;
  maxCount: number;
  quantity: Quantity;
  unitPriceSource: string | null;
}

export interface DiagnosticsRule {
  automaticRows: string[];
  allowedPositions: AllowedPosition[];
  enforceSparepartExists: boolean;
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
  // Observed as null for every country configured today (TR/ZA) — tax percent currently
  // comes from elsewhere (fault code / SAP price lookup), not this field.
  taxRates: TaxRate[] | null;
  localizationConfiguration: LocalizationConfig[];
  links: Links;
  diagnosticsConfiguration: DiagnosticsConfiguration;
  reimbursementConfig: ReimbursementConfiguration[];
  // Real payloads send a number (e.g. 1), not a string.
  reimbursementCreateOn: number;
  reimbursementPeriodType: string;
}

const localCountryConfigFiles = import.meta.glob("../../../../data/countryConfiguration*.json");

export const getCountryConfig = async (countryCode: string): Promise<CountryConfig> => {
  if (import.meta.env.DEV) {
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
