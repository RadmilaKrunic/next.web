import axiosClient from "api/axios-client/axiosClient";
import GenericForm from "components/generics/Form/GenericForm.types";

export interface UIConfiguration {
  forms: GenericForm[];
}

const localUIConfigFiles = import.meta.glob("../../../../data/data*.json");

export const getUIConfiguration = async (countryCode: string): Promise<UIConfiguration> => {
  if (import.meta.env.DEV) {
    const key = `../../../../data/data${countryCode.toUpperCase()}.json`;
    const loader = localUIConfigFiles[key];
    if (loader) {
      const data = (await loader()) as { default: UIConfiguration };
      return data.default;
    }
    console.warn(
      `[UIConfiguration] No local file found for country "${countryCode}". ` +
        `Expected: data/data${countryCode.toUpperCase()}.json`,
    );
  }

  try {
    const response = await axiosClient.get(`/v1/countries/${countryCode}/ui-configuration`);
    return response.data;
  } catch (error) {
    console.error("Error fetching UI configuration:", error);
    throw error;
  }
};
