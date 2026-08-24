import type { FieldName, PriceInputs, PriceResults } from "utils/priceCalculator";

export type DiscountBase = "GROSS_PRICE" | "NET_PRICE";

export interface PositionPermissions {
  canView: string;
  canDelete: string;
  canEditUnits: string;
  canEditUnitPrice: string;
  canEditDiscount: string;
  canEditTotal: string;
}

export interface PositionRule {
  position: string;
  isProtected: boolean;
  minCount: number;
  maxCount: number;
  quantitySource: string;
  unitPriceSource: string;
  permissions: PositionPermissions;
}

export interface EditabilityRule {
  contextType: "jobType" | "claimStatus";
  contextValue: string;
  appliesToProtectedPositionsOnly: boolean;
  fields: {
    discount: boolean;
    totalAmount: boolean;
    netAmount: boolean;
  };
  controlledBySummary: boolean;
}

export interface AutomaticRowRule {
  actionType: string;
  jobType: string;
  automaticPositions: string[];
}

export interface WarrantyGatingRule {
  gatedTypes: string[];
  disableTypeOptionsWhenInvalidSparePart: boolean;
}

export interface ItemRulesConfig {
  version: string;
  countryCode: string;
  discountBase: DiscountBase;
  addSpecialMaterialsAllowed: boolean;
  positions: PositionRule[];
  editability: EditabilityRule[];
  automaticRows: AutomaticRowRule[];
  warrantyGating: WarrantyGatingRule;
  surfaceOverrides: {
    jobDiagnostics?: Partial<ItemRulesConfig>;
    claimDiagnosticsReadOnly?: Partial<ItemRulesConfig>;
    claimSpareParts?: Partial<ItemRulesConfig>;
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
