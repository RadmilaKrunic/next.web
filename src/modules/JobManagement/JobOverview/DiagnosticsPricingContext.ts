import { createContext, useContext } from "react";
import type {
  DiagnosticPricingChange,
  DiagnosticPricingResponse,
} from "api/services/diagnosticPricing/diagnosticPricing.types";

export interface DiagnosticsPricingContextValue {
  /** True when backend-driven pricing is active (feature flag on). */
  enabled: boolean;
  pricing: DiagnosticPricingResponse | null;
  isPricing: boolean;
  /** Requests a recalculation for a single row or summary-level edit. */
  recalculate: (change: DiagnosticPricingChange) => void;
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
