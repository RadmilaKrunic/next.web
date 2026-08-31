import axiosClient from "api/axios-client/axiosClient";
import { AxiosResponse } from "axios";
import { BareSalesRelationParams, BareSalesRelationResponse } from "./bareSalesRelation.types";

export const fetchBareSalesRelation = async (
  params: BareSalesRelationParams,
): Promise<BareSalesRelationResponse> => {
  try {
    const response: AxiosResponse<BareSalesRelationResponse> =
      await axiosClient.get<BareSalesRelationResponse>("/v1/bare-sales-relation", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching bare-sales-relation:", error);
    throw error;
  }
};
