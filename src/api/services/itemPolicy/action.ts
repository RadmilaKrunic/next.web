import axiosClient from "api/axios-client/axiosClient";
import { ItemPolicyConfig } from "./itemPolicy.types";

const localItemPolicyFiles = import.meta.glob("../../../../data/itemPolicy*.json");

export const getItemPolicyConfig = async (countryCode: string): Promise<ItemPolicyConfig> => {
  if (import.meta.env.DEV) {
    const key = `../../../../data/itemPolicy${countryCode.toUpperCase()}.json`;
    const loader = localItemPolicyFiles[key];
    if (loader) {
      const data = (await loader()) as { default: ItemPolicyConfig };
      return data.default;
    }
    console.warn(
      `[ItemPolicyConfig] No local file found for country "${countryCode}". ` +
        `Expected: data/itemPolicy${countryCode.toUpperCase()}.json`,
    );
  }

  try {
    const response = await axiosClient.get(`/v1/countries/${countryCode}/item-policy`);
    return response.data;
  } catch (error) {
    console.error("Error fetching item policy configuration:", error);
    throw error;
  }
};
