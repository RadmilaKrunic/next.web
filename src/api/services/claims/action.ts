import axiosClient from "api/axios-client/axiosClient";
import { AxiosResponse } from "axios";
import { ClaimItem } from "modules/ClaimManagement/ClaimOverview/Claims.types";
import {
  Claim,
  ClaimListResponse,
} from "../../../modules/ClaimManagement/ClaimList/ClaimList.types";
import { ClaimColumnConfiguration } from "modules/ClaimManagement/ClaimList/ClaimListTable/ClaimListColumns.config";

export const fetchClaimById = async (claimId: string): Promise<ClaimItem> => {
  try {
    const response: AxiosResponse<ClaimItem> = await axiosClient.get<ClaimItem>(
      `/v1/claims/${claimId}`,
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching claim ${claimId}:`, error);
    throw error;
  }
};

export type ClaimDecision = "APPROVED" | "REJECTED" | "REVISED";

export interface ClaimDecisionPayload {
  jobId: string;
  message: string;
  decision: ClaimDecision;
}

export const postClaimDecision = async (
  claimId: string,
  payload: ClaimDecisionPayload,
): Promise<void> => {
  try {
    await axiosClient.post(`/v1/claims/${claimId}/decision`, payload);
  } catch (error) {
    console.error(`Error posting decision for claim ${claimId}:`, error);
    throw error;
  }
};

export const fetchClaims = async (): Promise<Claim[]> => {
  try {
    const response: AxiosResponse<ClaimListResponse> =
      await axiosClient.get<ClaimListResponse>("/v1/claims");
    return response.data.claims || [];
  } catch (error) {
    console.error("Error fetching claims:", error);
    throw error;
  }
};

export interface BulkApproveClaimsPayload {
  claimIds: string[];
  decision: ClaimDecision;
  message: string;
}

export const postBulkApproveClaims = async (payload: BulkApproveClaimsPayload): Promise<void> => {
  try {
    await axiosClient.post("/v1/claims/bulk-approve", payload);
  } catch (error) {
    console.error("Error bulk approving claims:", error);
    throw error;
  }
};

export const putClaimPrices = async (
  claimId: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  try {
    const response = await axiosClient.put<Record<string, unknown>>(
      `/v1/claims/${claimId}/prices`,
      payload,
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating prices for claim ${claimId}:`, error);
    throw error;
  }
};

export const patchClaimStatusPending = async (claimId: string, jobId?: string): Promise<void> => {
  try {
    await axiosClient.patch(
      `/v1/claims/${claimId}/status/pending`,
      undefined,
      jobId ? { params: { jobId } } : undefined,
    );
  } catch (error) {
    console.error(`Error setting claim ${claimId} status to pending:`, error);
    throw error;
  }
};

export const saveClaimListColumns = async (columns: ClaimColumnConfiguration[]): Promise<void> => {
  try {
    const selectedColumnKeys = columns.filter((col) => col.isChecked).map((col) => col.key);
    await axiosClient.post(`/v1/profile/preferences/claim`, selectedColumnKeys);
  } catch (error) {
    console.error("Error saving claim list columns:", error);
    throw error;
  }
};
