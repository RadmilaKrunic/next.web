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
}

export const getCountryConfig = async (countryCode: string) => {
  try {
    const response = await axiosClient.get(`/v1/countries/${countryCode}/country-configuration`);
    return response.data;
  } catch (error) {
    console.error("Error fetching country configuration:", error);
    throw error;
  }
};
