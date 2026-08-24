import axiosClient from "api/axios-client/axiosClient";
import { ItemRulesConfig } from "./itemRules.types";

const localItemRulesFiles = import.meta.glob("../../../../data/itemRules*.json");

export const getItemRulesConfig = async (countryCode: string): Promise<ItemRulesConfig> => {
  if (import.meta.env.DEV) {
    const key = `../../../../data/itemRules${countryCode.toUpperCase()}.json`;
    const loader = localItemRulesFiles[key];
    if (loader) {
      const data = (await loader()) as { default: ItemRulesConfig };
      return data.default;
    }
    console.warn(
      `[ItemRulesConfig] No local file found for country "${countryCode}". ` +
        `Expected: data/itemRules${countryCode.toUpperCase()}.json`,
    );
  }

  try {
    const response = await axiosClient.get(`/v1/countries/${countryCode}/item-rules`);
    return response.data;
  } catch (error) {
    console.error("Error fetching item rules configuration:", error);
    throw error;
  }
};
