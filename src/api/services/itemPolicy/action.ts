import axiosClient from "api/axios-client/axiosClient";
import type { ItemPolicy } from "./itemPolicy.types";

const localItemPolicyFiles = import.meta.glob("../../../../data/itemPolicy*.json");

export const getItemPolicy = async (countryCode: string): Promise<ItemPolicy | null> => {
  if (import.meta.env.DEV && !import.meta.env.TEST) {
    const key = `../../../../data/itemPolicy${countryCode.toUpperCase()}.json`;
    const loader = localItemPolicyFiles[key];
    if (loader) {
      const data = (await loader()) as { default: ItemPolicy };
      return data.default;
    }
    console.warn(
      `[ItemPolicy] No local file found for country "${countryCode}". ` +
        `Expected: data/itemPolicy${countryCode.toUpperCase()}.json`,
    );
  }
  try {
    const response = await axiosClient.get(`/v1/countries/${countryCode}/item-policy`);
    return response.data as ItemPolicy;
  } catch (error) {
    console.error("Error fetching item policy:", error);
    return null;
  }
};
