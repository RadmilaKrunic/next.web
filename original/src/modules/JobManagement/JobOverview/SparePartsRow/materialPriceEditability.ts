import type { discountBase } from "api/services/countryConfiguration/countryConfiguration";

/**
 * Positions with backend-driven / protected pricing rules: Labour, Freight, Protected-config.
 * These are auto-created rows per the matched diagnostic rule, distinct from user-added
 * material positions (PN spare-tool, SP spare-part, AC accessory).
 */
const PROTECTED_POSITIONS = new Set(["LA", "FR", "PC"]);

export const isProtectedPosition = (position: string): boolean =>
  PROTECTED_POSITIONS.has((position ?? "").toUpperCase());

export interface PriceFieldEditability {
  /** The discount field (visible one depends on mode — `discount` in GROSS, `discountNet` in NET). */
  discount: boolean;
  /** The totalAmount field — only ever editable in GROSS_PRICE mode. */
  totalAmount: boolean;
  /** The netAmount field — only ever editable in NET_PRICE mode. */
  netAmount: boolean;
}

const NOT_EDITABLE: PriceFieldEditability = {
  discount: false,
  totalAmount: false,
  netAmount: false,
};

export function getPriceFieldEditability(
  position: string,
  jobType: string,
  discountBase: discountBase,
): PriceFieldEditability {
  const normalizedJobType = (jobType ?? "").toUpperCase();
  const isProtected = isProtectedPosition(position);

  const isEditableJobType =
    normalizedJobType === "COMMERCIAL_GOODWILL" ||
    (normalizedJobType === "CHARGEABLE" && isProtected);

  if (!isEditableJobType) return NOT_EDITABLE;

  return {
    discount: true,
    totalAmount: discountBase !== "NET_PRICE",
    netAmount: discountBase === "NET_PRICE",
  };
}

/**
 * True when this row's discount is controlled from the summary panel rather than
 * editable on the row itself — i.e. a material-position row with jobType CHARGEABLE.
 * Used to decide whether to show a "controlled by summary" affordance / disabled state
 * with a different visual treatment than "not editable for this jobType at all".
 */
export function isSummaryControlledRow(position: string, jobType: string): boolean {
  const normalizedJobType = (jobType ?? "").toUpperCase();
  return !isProtectedPosition(position) && normalizedJobType === "CHARGEABLE";
}
