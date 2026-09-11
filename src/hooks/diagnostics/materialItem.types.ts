export interface MaterialItem {
  position: string;
  partNumber: string;
  description: string;
  type: string;
  quantity: number;
  unitPrice: number;
  netAmount: number;
  tax: number;
  grossAmount: number;
  discount: number;
  discountAmount?: number;
  taxAmount: number;
  totalAmount: number;
  suggestedNetPrice?: number;
  status?: string;
  materialId?: string;
  origin?: "specialMaterial" | "explosionDrawing";
  isValidated?: boolean;
  /** True for rows added manually by the user (not loaded from API) */
  isNew?: boolean;
  order?: number;
  notBelongsToTool?: boolean;
  isPriceSetManually?: boolean;
  reimbursementPaymentMethod?: string | null;
}

export interface ImportedMaterial {
  position?: string;
  partNumber: string;
  description?: string;
  type?: string;
  quantity?: number;
  unitPrice?: number | null;
  origin?: "specialMaterial" | "explosionDrawing";
}

export const POSITION_ORDER: Record<string, number> = {
  LA: 0,
  PN: 1,
  SP: 2,
  AC: 3,
  FR: 4,
  PC: 5,
};

export const sortByPositionOrder = (positions: string[]): string[] =>
  [...positions].sort(
    (a, b) =>
      (POSITION_ORDER[a] ?? Number.MAX_SAFE_INTEGER) - (POSITION_ORDER[b] ?? Number.MAX_SAFE_INTEGER),
  );

export const getOrderValue = (item: MaterialItem, fallbackIndex: number): number => {
  const parsed = Number(item.order);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackIndex + 1;
  return parsed;
};

export const normalizeMaterialOrders = (items: MaterialItem[]): MaterialItem[] =>
  items.map((item, index) => ({ ...item, order: getOrderValue(item, index) }));

export const sortMaterialsByOrder = (items: MaterialItem[]): MaterialItem[] =>
  [...normalizeMaterialOrders(items)].sort((a, b) => {
    const byOrder = getOrderValue(a, 0) - getOrderValue(b, 0);
    if (byOrder !== 0) return byOrder;
    return (
      (POSITION_ORDER[a.position] ?? Number.MAX_SAFE_INTEGER) -
      (POSITION_ORDER[b.position] ?? Number.MAX_SAFE_INTEGER)
    );
  });

export enum QuantitySource {
  DEFAULT = "DEFAULT",
  FAULT_CODES = "FAULT_CODES",
  USER = "USER",
}
