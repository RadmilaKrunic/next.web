import axiosClient from "api/axios-client/axiosClient";
import type {
  DiagnosticPricingRequestInput,
  DiagnosticPricingResponse,
} from "./diagnosticPricing.types";
import { simulateDiagnosticPricing } from "./priceEngineSimulator";

/**
 * TEMPORARY (PTBASS-0000): POST /v1/jobs/{jobId}/diagnostic/price-calculation doesn't exist on
 * the backend yet. Flip this to true the moment it ships — the real call below is untouched and
 * ready to go, nothing else in this file needs to change. Once it's true for good, delete this
 * flag and the `if (!BACKEND_ENDPOINT_READY)` block.
 */
const BACKEND_ENDPOINT_READY = false;

export const postDiagnosticPricing = async (
  jobId: string,
  payload: DiagnosticPricingRequestInput,
): Promise<DiagnosticPricingResponse> => {
  const request = { requestId: crypto.randomUUID(), ...payload };
  if (import.meta.env.DEV && !import.meta.env.TEST) {
    return simulateDiagnosticPricing(request);
  }
  if (!BACKEND_ENDPOINT_READY) {
    console.log(
      `[diagnosticPricing] backend not ready — would POST to /v1/jobs/${jobId}/diagnostic/price-calculation`,
      request,
    );
    return simulateDiagnosticPricing(request);
  }
  const response = await axiosClient.post<DiagnosticPricingResponse>(
    `/v1/jobs/${jobId}/diagnostic/price-calculation`,
    request,
  );
  return response.data;
};
