import axiosClient from "api/axios-client/axiosClient";
import { AxiosResponse } from "axios";
import {
  Reimbursement,
  ReimbursementResponse,
  ReimbursementAscResponse,
  ReimbursementPerAscResponse,
  ReimbursementDryRunInfo,
} from "./reimbursements.types";

const formatDateForApi = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
};

export const fetchReimbursementASCs = async (
  searchTerm?: string,
  page?: number,
  size?: number,
): Promise<ReimbursementAscResponse> => {
  try {
    const params = new URLSearchParams();

    if (searchTerm) {
      params.append("searchTerm", searchTerm);
    }
    if (page !== undefined) {
      params.append("page", String(page));
    }
    if (size !== undefined) {
      params.append("size", String(size));
    }
    const url = `/v1/reimbursements/service-centers${params.toString() ? `?${params.toString()}` : ""}`;
    const response: AxiosResponse<ReimbursementAscResponse> =
      await axiosClient.get<ReimbursementAscResponse>(url);
    return response.data;
  } catch (error) {
    console.error("Failed to search ASC names", error);
    throw error;
  }
};

export const fetchReimbursements = async (
  fromDate?: Date,
  toDate?: Date,
  searchTerm?: string,
  page?: number,
  size?: number,
): Promise<ReimbursementResponse> => {
  try {
    const params = new URLSearchParams();
    if (fromDate && toDate) {
      params.append("fromDate", formatDateForApi(fromDate));
      params.append("toDate", formatDateForApi(toDate));
    }
    if (searchTerm) {
      params.append("searchTerm", searchTerm);
    }
    if (page !== undefined) {
      params.append("page", String(page));
    }
    if (size !== undefined) {
      params.append("size", String(size));
    }

    let url = "/v1/reimbursements";

    if (params.toString()) {
      url = `${url}?${params.toString()}`;
    }

    const response: AxiosResponse<ReimbursementResponse> =
      await axiosClient.get<ReimbursementResponse>(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching reimbursements:", error);
    throw error;
  }
};

export const fetchReimbursementsByAscId = async (
  ascId: string,
  fromDate?: Date,
  toDate?: Date,
  searchTerm?: string,
  page?: number,
  size?: number,
): Promise<ReimbursementPerAscResponse> => {
  try {
    const params = new URLSearchParams();
    if (fromDate && toDate) {
      params.append("fromDate", formatDateForApi(fromDate));
      params.append("toDate", formatDateForApi(toDate));
    }
    if (searchTerm) {
      params.append("searchTerm", searchTerm);
    }
    if (page !== undefined) {
      params.append("page", String(page));
    }
    if (size !== undefined) {
      params.append("size", String(size));
    }

    let url = `/v1/reimbursements/asc/${ascId}`;

    if (params.toString()) {
      url = `${url}?${params.toString()}`;
    }
    const response: AxiosResponse<ReimbursementPerAscResponse> =
      await axiosClient.get<ReimbursementPerAscResponse>(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching reimbursements for ASC ${ascId}:`, error);
    throw error;
  }
};

export const fetchReimbursementClaims = async (reimbursementId: string): Promise<Reimbursement> => {
  try {
    const response: AxiosResponse<Reimbursement> = await axiosClient.get<Reimbursement>(
      `/v1/reimbursements/${reimbursementId}`,
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching claims for reimbursement ${reimbursementId}:`, error);
    throw error;
  }
};

export const getReimbursementReceipt = async (reimbursementId: string): Promise<Blob | null> => {
  try {
    const response: AxiosResponse<Blob> = await axiosClient.get<Blob>(
      `/v1/pdf/reimbursement-receipt/${reimbursementId}`,
      {
        responseType: "blob",
        headers: {
          Accept: "application/pdf",
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching reimbursement receipt:", error);
    return null;
  }
};

export const generateReimbursement = async (reimbursementDetails: {
  serviceCenterIds: string[];
  startDate: string;
  endDate: string;
  dryRun: boolean;
}): Promise<ReimbursementDryRunInfo> => {
  try {
    const response: AxiosResponse<ReimbursementDryRunInfo> =
      await axiosClient.post<ReimbursementDryRunInfo>(
        `/v1/reimbursements/generate`,
        reimbursementDetails,
      );
    return response.data;
  } catch (error) {
    console.error("Error generating reimbursement:", error);
    throw error;
  }
};
