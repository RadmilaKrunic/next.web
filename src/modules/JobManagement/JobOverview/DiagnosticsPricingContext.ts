import { createContext, useContext } from "react";
import type {
  DiagnosticPricingResponse,
  DiagnosticPricingTrigger,
} from "api/services/diagnosticPricing/diagnosticPricing.types";

export interface DiagnosticsPricingContextValue {
  /** True when backend-driven pricing is active (feature flag on). */
  enabled: boolean;
  pricing: DiagnosticPricingResponse | null;
  isPricing: boolean;
  recalculate: (trigger: DiagnosticPricingTrigger, triggeredByOrder?: number) => void;
}

const defaultValue: DiagnosticsPricingContextValue = {
  enabled: false,
  pricing: null,
  isPricing: false,
  recalculate: () => {},
};

export const DiagnosticsPricingContext =
  createContext<DiagnosticsPricingContextValue>(defaultValue);

export const useDiagnosticsPricingContext = () => useContext(DiagnosticsPricingContext);
