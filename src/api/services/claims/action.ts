import axiosClient from "api/axios-client/axiosClient";
import { AxiosResponse } from "axios";
import { ClaimItem } from "modules/ClaimManagement/ClaimOverview/Claims.types";
import {
  Claim,
  ClaimListResponse,
} from "../../../modules/ClaimManagement/ClaimList/ClaimList.types";
import { ClaimColumnConfiguration } from "modules/ClaimManagement/ClaimList/ClaimListTable/ClaimListColumns.config";
import { PutClaimPricesRequest, PutClaimPricesResponse } from "./claims.types";
import { simulateClaimPriceValidate } from "api/services/itemPolicy/priceEngineSimulator";
import type {
  ClaimPriceValidateRequest,
  ClaimPricingResult,
  DiagnosticPricingPayload,
} from "api/services/itemPolicy/itemPolicy.types";
import type { discountBase as DiscountBase } from "api/services/countryConfiguration/countryConfiguration";

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
  payload: PutClaimPricesRequest,
): Promise<PutClaimPricesResponse> => {
  try {
    const response = await axiosClient.put<PutClaimPricesResponse>(
      `/v1/claims/${claimId}/prices`,
      payload,
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating prices for claim ${claimId}:`, error);
    throw error;
  }
};

/**
 * Backend-mock context a real POST /v1/claims/{claimId}/prices/validate call wouldn't need
 * (see the "Backend merge semantics" section of proposals/items-and-prices-backend-api-spec.md)
 * — required only so the DEV-mode branch below can simulate that merge locally via
 * priceEngineSimulator.ts's simulateClaimPriceValidate.
 */
export interface ClaimPriceValidateMockContext {
  baseline: Pick<DiagnosticPricingPayload, "materials" | "archivedMaterials">;
  discountBase: DiscountBase;
  summaryType?: string;
}

/**
 * POST /v1/claims/{claimId}/prices/validate (proposals/items-and-prices-backend-api-spec.md
 * API-3). Not called by any component yet — see items-and-prices-refactor.md §15/Phase 3,
 * gated behind ENABLE_PRICE_VALIDATE_API (src/utils/itemRulesResolver.ts). In DEV mode, backed
 * by the local price-engine simulator (same dev-local-mock convention as
 * postValidateDiagnosticPrices/itemPolicy/action.ts's getItemPolicyConfig) since the real
 * endpoint doesn't exist yet.
 */
export const postValidateClaimPrices = async (
  claimId: string,
  request: ClaimPriceValidateRequest,
  mockContext: ClaimPriceValidateMockContext,
): Promise<ClaimPricingResult> => {
  if (import.meta.env.DEV) {
    return simulateClaimPriceValidate(
      mockContext.baseline,
      request,
      mockContext.discountBase,
      mockContext.summaryType,
    );
  }

  try {
    const response = await axiosClient.post(`/v1/claims/${claimId}/prices/validate`, request);
    return response.data;
  } catch (error) {
    console.error(`Error validating claim prices for claim ${claimId}:`, error);
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
