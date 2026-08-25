import type { discountBase } from "api/services/countryConfiguration/countryConfiguration";
import type { FieldName, PriceInputs, PriceResults } from "utils/priceCalculator";

// NOTE: automaticRows/allowedPositions/discountBase/addSpecialMaterialsAllowed/
// enforceSparepartExists are NOT modeled here — that data already exists as
// CountryConfig.diagnosticsConfiguration (countryConfiguration.ts) and is served by
// GET /v1/countries/{countryCode}/country-configuration. Resolve those via
// itemRulesResolver.ts's resolveAllowedPositions/resolveAutomaticRows/
// resolveEnforceSparepartExists, which operate on DiagnosticsRuleEntry[] directly.
// ItemPolicyConfig below covers only what has no backend representation today:
// per-position permissions/protection, editability-by-context, warranty gating,
// and per-surface (job/claim) overrides.

export interface PositionPermissions {
  canView: string;
  canDelete: string;
  canEditUnits: string;
  canEditUnitPrice: string;
  canEditDiscount: string;
  canEditTotal: string;
}

export interface PositionPolicy {
  position: string;
  isProtected: boolean;
  permissions: PositionPermissions;
}

export interface EditabilityRule {
  contextType: "jobType" | "claimStatus";
  contextValue: string;
  appliesToProtectedPositionsOnly: boolean;
  /** Whether price fields are editable at all in this context. Which specific field
   *  (totalAmount vs netAmount) is exposed is derived from discountBase at resolve time —
   *  that's universal GROSS/NET math, not a per-country policy difference. */
  isEditable: boolean;
  controlledBySummary: boolean;
}

export interface WarrantyGatingRule {
  gatedTypes: string[];
  disableTypeOptionsWhenInvalidSparePart: boolean;
}

export interface ItemPolicyConfig {
  version: string;
  countryCode: string;
  positions: PositionPolicy[];
  editability: EditabilityRule[];
  warrantyGating: WarrantyGatingRule;
  surfaceOverrides: {
    jobDiagnostics?: Partial<ItemPolicyConfig>;
    claimDiagnosticsReadOnly?: Partial<ItemPolicyConfig>;
    claimSpareParts?: Partial<ItemPolicyConfig>;
  };
}

// Price-validate contracts (see proposals/items-and-prices-backend-api-spec.md, API-2/API-3).
// Not wired into any component yet — see priceEngineSimulator.ts for the dev-mode backing.

export interface ChangedRow {
  rowId: string;
  position: string;
  /** The diagnostic row's type (WARRANTY/CHARGEABLE/COMMERCIAL_GOODWILL/...), used to
   *  scope summary/summaryMaterial aggregation — see priceCalculator.ts's SUMMARY_TYPE_FILTER. */
  type: string;
  changedField: FieldName;
  values: PriceInputs;
}

export interface PriceValidateRequest {
  jobId: string;
  actionType: string;
  jobType: string;
  requestId: string;
  changedRows: ChangedRow[];
  unchangedRowIds: string[];
}

export interface RowPriceResult {
  rowId: string;
  status: "confirmed" | "error";
  prices: PriceResults;
  errorMessage?: string;
}

export interface PriceValidateSummary extends PriceResults {
  type: string;
}

export interface PriceValidateSummaryMaterial extends PriceResults {
  type: string;
  positions: string[];
}

export interface PriceValidateErrorMessage {
  rowId?: string;
  field?: string;
  message: string;
}

export interface PriceValidateResponse {
  requestId: string;
  rows: RowPriceResult[];
  summary: PriceValidateSummary;
  summaryMaterial: PriceValidateSummaryMaterial;
  errorMessages?: PriceValidateErrorMessage[];
}

// The proposed *upgraded* PUT /v1/claims/{claimId}/prices response (API-3's follow-up ticket) —
// distinct from claims/claims.types.ts's PutClaimPricesResponse, which types today's real,
// unused-by-the-frontend response body. This shape is only produced by priceEngineSimulator.ts
// for local/dev demonstration of the proposed upgrade; no component consumes it yet.
export interface PutClaimPricesResponseUpgraded {
  requestId?: string;
  rows: RowPriceResult[];
  summary: PriceValidateSummary;
  summaryMaterial: PriceValidateSummaryMaterial;
}

export type { discountBase as DiscountBase };
