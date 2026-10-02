import axiosClient from "api/axios-client/axiosClient";
import { AxiosResponse } from "axios";
import {
  ClientManagementCustomersRequest,
  ClientManagementCustomersResponse,
} from "./clientManagement.types";

export const fetchClientManagementCustomers = async (
  request: ClientManagementCustomersRequest,
  page?: number,
  size?: number,
): Promise<ClientManagementCustomersResponse> => {
  try {
    const params = new URLSearchParams();
    if (page !== undefined) {
      params.append("page", String(page));
    }
    if (size !== undefined) {
      params.append("size", String(size));
    }

    let url = "/v1/data/client-management/customers";
    if (params.toString()) {
      url = `${url}?${params.toString()}`;
    }

    const response: AxiosResponse<ClientManagementCustomersResponse> =
      await axiosClient.post<ClientManagementCustomersResponse>(url, request);
    return response.data;
  } catch (error) {
    console.error("Error fetching client management customers:", error);
    throw error;
  }
};
