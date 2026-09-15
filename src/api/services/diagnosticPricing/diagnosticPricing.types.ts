export interface DiagnosticErpTax {
  type: string;
  value: number;
}

export interface DiagnosticErpPrice {
  priceType: string;
  unitPrice: number;
  taxes: DiagnosticErpTax[];
}

export interface DiagnosticPriceBlock {
  discount: number;
  discountAmount: number;
  suggestedNetPrice: number;
  unitPrice: number;
  netAmount: number;
  tax: number;
  taxAmount: number;
  grossAmount: number;
  totalAmount: number;
  erpPrices?: DiagnosticErpPrice[];
  taxTypes?: string[];
}

/** One priced/priceable row sent to POST /price-calculation. */
export interface DiagnosticPricingLine {
  lineId: string;
  position: string;
  partNumber: string;
  jobType: string;
  quantity: number;
  unitPrice: number;
  taxPercentage: number;
  discountPercentage: number;
  totalNetAmount: number;
  totalAmount: number;
}

export type DiagnosticPricingChangeType =
  | "SET_QUANTITY"
  | "SET_UNIT_PRICE"
  | "SET_DISCOUNT"
  | "SET_NET_AMOUNT"
  | "SET_GROSS_AMOUNT"
  | "SET_TOTAL_AMOUNT"
  | "SET_SUMMARY_DISCOUNT"
  | "SET_SUMMARY_TOTAL_AMOUNT";

export interface DiagnosticPricingChangeScope {
  positions: string[];
  jobTypes: string[];
}

/** The single edit driving this recalculation — a row edit (`lineId`) or a summary-level edit (`scope`). */
export interface DiagnosticPricingChange {
  type: DiagnosticPricingChangeType;
  lineId?: string;
  scope?: DiagnosticPricingChangeScope;
  value: number | string | null;
}

export interface DiagnosticPricingRequestContext {
  country: string;
  ascId: string;
  /** Decimal scale (places) the backend should round to. */
  scale: number;
}

export interface DiagnosticPricingRequest {
  requestId: string;
  pricingContext: DiagnosticPricingRequestContext;
  lines: DiagnosticPricingLine[];
  changes: DiagnosticPricingChange;
}

/** What a caller supplies — `requestId` is transport plumbing, attached by `action.ts`. */
export type DiagnosticPricingRequestInput = Omit<DiagnosticPricingRequest, "requestId">;

export interface DiagnosticMaterialResponse {
  id?: string;
  position: string;
  partNumber: string;
  description?: string;
  jobType: string;
  quantity: number;
  status: string;
  isPriceSetManually: boolean;
  notBelongsToTool: boolean;
  order: number;
  approvedBy?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  approvalRemarks?: string | null;
  price?: DiagnosticPriceBlock | null;
}

export interface DiagnosticPriceSummaryBlock {
  netAmount: number;
  suggestedNetPrice: number;
  taxAmount: number;
  grossAmount: number;
  discount: number;
  totalAmount: number;
  discountAmount?: number;
}

export interface DiagnosticPriceSummaryByJobType {
  total: DiagnosticPriceSummaryBlock;
  serviceRelated?: DiagnosticPriceSummaryBlock;
  materialRelated?: DiagnosticPriceSummaryBlock;
}

export interface DiagnosticPriceSummaryDetailed {
  total: DiagnosticPriceSummaryBlock;
  byJobType: Record<string, DiagnosticPriceSummaryByJobType>;
}

/**
 * Full diagnostic state, as returned by both POST /price-calculation and the
 * validate-and-save endpoint — the backend recomputes and hands back the whole
 * diagnostic either way, so the frontend applies both responses the same way.
 */
export interface DiagnosticPricingResponse {
  jobId?: string;
  diagnosticId?: string;
  ascId?: string;
  actionType?: string;
  jobType?: string;
  typeOfUsage?: string;
  faultCode?: string;
  faultCodeDescription?: string;
  faultCodeLabourQuantity?: number;
  exchangeReason?: string | null;
  technicianNote?: string | null;
  status?: string;
  customerAnswer?: unknown;
  materials: DiagnosticMaterialResponse[];
  archivedMaterials?: DiagnosticMaterialResponse[];
  priceSummary: DiagnosticPriceSummaryBlock | null;
  priceSummaryDetailed?: DiagnosticPriceSummaryDetailed;
  errorMessages?: string[];
}

export const TOTAL_SUMMARY_TYPE = "TOTAL";
