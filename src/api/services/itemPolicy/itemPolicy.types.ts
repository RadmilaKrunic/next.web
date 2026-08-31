import type { discountBase } from "api/services/countryConfiguration/countryConfiguration";
import type { Price } from "types/price.types";

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

// Price-validate contracts (see proposals/items-and-prices-backend-api-spec.md,
// "API-2/API-3/API-4: one shared payload shape for diagnostic + claim pricing"). Not wired
// into any component yet — see priceEngineSimulator.ts for the dev-mode backing.

export type PriceFieldName =
  | "quantity"
  | "unitPrice"
  | "netAmount"
  | "suggestedNetPrice"
  | "tax"
  | "grossAmount"
  | "discount"
  | "totalAmount";

// A material/spare-part row, shared by diagnostic and claim materials/archivedMaterials.
// Matches JobDiagnostic["materials"][number] (JobList.types.ts) field-for-field, plus rowId
// and isValidated.
export interface MaterialRow {
  rowId: string;
  id?: string;
  order?: number;
  position: string;
  partNumber: string;
  description: string;
  type: string;
  quantity: number;
  /** The row's real approval status ("APPROVED"/"PENDING"/"REVISED"/"REJECTED"/...), as
   *  already returned by the API today — not related to price-validation confirmation, which
   *  is MaterialRowResult.changeStatus below. */
  status?: string;
  notBelongsToTool?: boolean;
  isPriceSetManually: boolean;
  /** false until this exact row has received one "confirmed" response. Distinguishes "never
   *  priced, nothing to show" from "has a last-known price, now being revalidated" — does not
   *  gate whether a row belongs in a validate request's changedRows (see
   *  ChangedMaterialRow/PriceValidateRequest below). */
  isValidated: boolean;
  price: Price | null;
}

// Same field set as today's ValidateAndSaveResponse.priceSummary. priceSummaryMaterial is a
// new addition needed for the summaryMaterial concept from items-and-prices-refactor.md §6.
export type PriceSummary = Omit<Price, "unitPrice" | "tax"> & { discountAmount: number };
export type SummaryFieldName = keyof PriceSummary;

// The full diagnostic payload — same shape validate-and-save (API-4) already sends/returns
// today (JobDiagnostic in JobList.types.ts). This is API-4's request shape, and what every
// pricing call's *response* is built from — API-2's validate request is leaner (see
// PriceValidateRequest below), it only ever returns this shape.
export interface DiagnosticPricingPayload {
  jobId: string;
  diagnosticId?: string;
  ascId?: string;
  actionType: string;
  jobType: string;
  exchangeReason?: string;
  status: string;
  customerAnswer?: string;
  typeOfUsage: string;
  faultCode: string;
  faultCodeDescription: string;
  faultCodeLabourQuantity: number;
  technicianNote?: string;
  materials: MaterialRow[];
  archivedMaterials?: MaterialRow[];
  priceSummary: PriceSummary;
  priceSummaryMaterial?: PriceSummary;
}

// changeStatus, not status — MaterialRow.status is already the row's real approval status
// (e.g. "APPROVED"/"PENDING"/"REVISED"/"REJECTED", as returned by the API today). Reusing
// "status" here for price-validation confirmation would silently overwrite that field.
export type MaterialRowResult = MaterialRow & {
  changeStatus: "confirmed" | "error";
  errorMessage?: string;
};

export interface PriceValidateErrorMessage {
  rowId?: string;
  field?: string;
  message: string;
}

// Returned identically by API-2 (validate) and API-4 (validate-and-save) — one response
// shape, one frontend rendering path, regardless of which call produced it. Always the FULL
// current diagnostic (every row, not just the ones the request touched) — the backend merges
// whatever the request sent onto its last-saved baseline before recomputing.
export interface DiagnosticPricingResult {
  requestId?: string;
  diagnostic: Omit<DiagnosticPricingPayload, "materials" | "archivedMaterials"> & {
    materials: MaterialRowResult[];
    archivedMaterials?: MaterialRowResult[];
  };
  errorMessages?: PriceValidateErrorMessage[];
}

// The lean "what's different from the last-saved state" request a validate call sends. In the
// common case (the user edits one field, which triggers one validate call) changedRows has
// exactly one entry, with changedField set. It grows past one entry only when more than one
// row is still dirty (unsaved) at the time of the call.
export interface ChangedMaterialRow {
  rowId: string;
  row: MaterialRow;
  changedField?: PriceFieldName;
}

export interface ChangedSummary {
  target: "priceSummary" | "priceSummaryMaterial";
  summary: PriceSummary;
  changedField: SummaryFieldName;
}

export interface PriceValidateRequest {
  requestId: string;
  changedRows: ChangedMaterialRow[];
  changedSummary?: ChangedSummary;
}

export interface ClaimPriceValidateRequest {
  requestId: string;
  jobId: string;
  diagnosticId: string;
  changedRows: ChangedMaterialRow[];
  changedSummary?: ChangedSummary;
}

// Returned identically by the claim's new validate route and its existing PUT .../prices save
// — same principle as DiagnosticPricingResult above.
export interface ClaimPricingResult {
  requestId?: string;
  claim: {
    materials: MaterialRowResult[];
    archivedMaterials?: MaterialRowResult[];
    priceSummary: PriceSummary;
    priceSummaryMaterial?: PriceSummary;
  };
  errorMessages?: PriceValidateErrorMessage[];
}

export type { discountBase as DiscountBase };
