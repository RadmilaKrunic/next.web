import axiosClient from "api/axios-client/axiosClient";
import {
  DraftServiceCenter,
  ServiceCenter,
  ServiceCenterName,
  ServiceCenterNamesResponse,
} from "./serviceCenters.types";

export const fetchServiceCenterNames = async (): Promise<ServiceCenterName[]> => {
  try {
    const response = await axiosClient.get<ServiceCenterNamesResponse>("/v1/service-centers/names");
    return response.data.serviceCenterNames;
  } catch (error) {
    console.error("Failed to fetch ASC names", error);
    throw error;
  }
};

export const getAllASCs = async (): Promise<ServiceCenter[]> => {
  try {
    const response = await axiosClient.post("/v1/service-centers/search?page=0&size=200", {});
    return response.data?.content;
  } catch (error) {
    console.error("Failed to search ASC names", error);
    throw error;
  }
};

export const createASC = async (
  ascData: ServiceCenter,
  isDraft: boolean,
): Promise<ServiceCenter> => {
  try {
    const response = await axiosClient.post(
      `/v1/service-centers${isDraft ? "?isDraft=true" : "?isDraft=false"}`,
      ascData,
    );
    return response.data;
  } catch (error) {
    console.error("Failed to create ASC", error);
    throw error;
  }
};

export const getASCById = async (ascId: string): Promise<ServiceCenter> => {
  try {
    const response = await axiosClient.get(`/v1/service-centers/${ascId}`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch ASC by ID", error);
    throw error;
  }
};

export const getDraftAscById = async (ascId: string): Promise<DraftServiceCenter> => {
  try {
    const response = await axiosClient.get(`/v1/service-centers/draft/${ascId}`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch ASC by ID", error);
    throw error;
  }
};
