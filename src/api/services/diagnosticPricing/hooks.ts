import { useMutation } from "@tanstack/react-query";
import { postDiagnosticPricing } from "./action";
import type {
  DiagnosticPricingRequest,
  DiagnosticPricingResponse,
} from "./diagnosticPricing.types";

export const useDiagnosticPricing = (
  jobId: string,
  onSuccess?: (data: DiagnosticPricingResponse) => void,
) =>
  useMutation({
    mutationKey: ["diagnosticPricing", jobId],
    mutationFn: (payload: DiagnosticPricingRequest) => postDiagnosticPricing(jobId, payload),
    onSuccess,
  });
