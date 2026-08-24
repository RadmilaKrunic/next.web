import { isProtectedPosition } from "./materialPriceEditability";

const CHARGEABLE = "CHARGEABLE";
const COMMERCIAL_GOODWILL = "COMMERCIAL_GOODWILL";

export function resolveDiscountOnJobTypeChange(
  previousJobType: string,
  newJobType: string,
  position: string,
  siblingChargeableDiscounts: number[],
): number | null {
  const previous = (previousJobType ?? "").toUpperCase();
  const next = (newJobType ?? "").toUpperCase();

  if (next === CHARGEABLE) {
    if (isProtectedPosition(position)) return 0;
    return siblingChargeableDiscounts.length > 0 ? siblingChargeableDiscounts[0] : 0;
  }

  if (previous === CHARGEABLE) return 0;
  if (previous === COMMERCIAL_GOODWILL) return 0;

  return null;
}
