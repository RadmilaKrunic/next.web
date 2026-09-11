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
}

export interface DiagnosticPricingMaterialInput {
  id?: string;
  order: number;
  position: string;
  partNumber: string;
  type: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  netAmount: number;
  grossAmount: number;
  totalAmount: number;
  isPriceSetManually?: boolean;
}

/** Field the user edited, so the backend knows which direction to back-calculate. */
export type DiagnosticPricingTrigger =
  | "quantity"
  | "unitPrice"
  | "discount"
  | "netAmount"
  | "grossAmount"
  | "totalAmount"
  | "summaryDiscount"
  | "summaryTotalAmount"
  | "load";

export interface DiagnosticPricingRequest {
  actionType: string;
  jobType: string;
  typeOfUsage?: string;
  faultCode?: string;
  trigger: DiagnosticPricingTrigger;
  /** `order` of the edited material; omitted for summary-level triggers. */
  triggeredByOrder?: number;
  materials: DiagnosticPricingMaterialInput[];
  summaryDiscount?: number;
  summaryTotalAmount?: number;
}

export interface DiagnosticPricingMaterialResult {
  id?: string;
  order: number;
  position: string;
  price: DiagnosticPriceBlock;
}

/** One summary block per cost-allocation type plus the `TOTAL` roll-up. */
export interface DiagnosticPricingSummary {
  type: string;
  price: DiagnosticPriceBlock;
  /** Roll-up restricted to material positions (spare parts, tools, accessories). */
  materialPrice?: DiagnosticPriceBlock;
}

export interface DiagnosticPricingResponse {
  materials: DiagnosticPricingMaterialResult[];
  summaries: DiagnosticPricingSummary[];
}

export const TOTAL_SUMMARY_TYPE = "TOTAL";
