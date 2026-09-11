import axiosClient from "api/axios-client/axiosClient";
import type {
  DiagnosticPricingRequest,
  DiagnosticPricingResponse,
} from "./diagnosticPricing.types";

export const postDiagnosticPricing = async (
  jobId: string,
  payload: DiagnosticPricingRequest,
): Promise<DiagnosticPricingResponse> => {
  const response = await axiosClient.post<DiagnosticPricingResponse>(
    `/v1/jobs/${jobId}/diagnostic/price-calculation`,
    payload,
  );
  return response.data;
};
