export interface Price {
  discount: number;
  suggestedNetPrice: number;
  taxAmount: number;
  unitPrice: number;
  netAmount: number;
  tax: number;
  taxTypes?: string[];
  grossAmount: number;
  totalAmount: number;
  discountAmount?: number;
}
