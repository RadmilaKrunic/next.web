import { FieldValueType } from "components/generics/Field/GenericField.types";
import axiosClient from "../../axios-client/axiosClient";

export const fetchDynamicOptions = async (
  url: string,
  method: string,
  queryParams?: { key: string; value: FieldValueType }[],
): Promise<{ value: string; name: string }[]> => {
  const params: Record<string, FieldValueType> = {};

  if (queryParams) {
    queryParams.forEach((param) => {
      params[param.key] = param.value;
    });
  }

  const response = await axiosClient.request({
    url: `v1${url}`,
    method,
    params,
  });

  // Handle nested serviceCenterNames response
  if (response?.data?.serviceCenterNames) {
    return response.data.serviceCenterNames;
  }

  return response.data;
};
