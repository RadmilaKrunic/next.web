import axiosClient from "api/axios-client/axiosClient";
import type {
  DiagnosticPricingRequest,
  DiagnosticPricingResponse,
} from "./diagnosticPricing.types";
import { simulateDiagnosticPricing } from "./priceEngineSimulator";

export const postDiagnosticPricing = async (
  jobId: string,
  payload: DiagnosticPricingRequest,
): Promise<DiagnosticPricingResponse> => {
  if (import.meta.env.DEV && !import.meta.env.TEST) {
    return simulateDiagnosticPricing(payload);
  }
  const response = await axiosClient.post<DiagnosticPricingResponse>(
    `/v1/jobs/${jobId}/diagnostic/price-calculation`,
    payload,
  );
  return response.data;
};
