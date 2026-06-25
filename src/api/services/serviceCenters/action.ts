import axiosClient from "api/axios-client/axiosClient";
import { ServiceCenterName, ServiceCenterNamesResponse } from "./serviceCenters.types";

export const fetchServiceCenterNames = async (): Promise<ServiceCenterName[]> => {
  try {
    const response = await axiosClient.get<ServiceCenterNamesResponse>("/v1/service-centers/names");
    return response.data.serviceCenterNames;
  } catch (error) {
    console.error("Failed to fetch ASC names", error);
    throw error;
  }
};
