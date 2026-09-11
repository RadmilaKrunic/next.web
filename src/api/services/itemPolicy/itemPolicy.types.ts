export interface ItemPositionPermissions {
  canView: string;
  canDelete: string;
  canEditUnits: string;
  canEditUnitPrice: string;
  canEditDiscount: string;
  canEditTotal: string;
}

export interface ItemPositionAutofill {
  partNumber: string;
  /** i18n key resolved at render time. */
  descriptionKey: string;
}

export interface ItemPositionPolicy {
  position: string;
  isProtected: boolean;
  /** Eligible for summary-level discount distribution. */
  isDistributable?: boolean;
  autofill?: ItemPositionAutofill;
  permissions: ItemPositionPermissions;
}

export type PolicyContextType = "jobType" | "jobStatus" | "claimStatus";

export interface PriceEditabilityRule {
  /** Field subtypes this rule covers. Omitted/empty = all price subtypes. */
  fieldSubTypes?: string[];
  contextType: PolicyContextType;
  contextValue: string;
  /** When true the rule only matches protected positions; when false it matches any position. */
  appliesToProtectedPositionsOnly: boolean;
  isEditable: boolean;
  /** Row value is driven by the summary panel rather than edited inline. */
  controlledBySummary: boolean;
}

export interface WarrantyGating {
  gatedTypes: string[];
  disableTypeOptionsWhenInvalidSparePart: boolean;
}

export interface ItemPolicySurfaceOverride {
  priceEditability?: PriceEditabilityRule[];
}

export type ItemPolicySurface = string;

export interface ItemPolicy {
  version: string;
  countryCode: string;
  positions: ItemPositionPolicy[];
  priceEditability: PriceEditabilityRule[];
  /** Subtypes only editable in one discount base, e.g. totalAmount is GROSS_PRICE-only. */
  fieldModeRestrictions?: Record<string, string>;
  /** Job statuses where deleting a row removes it instead of archiving it. */
  statusesWithPermanentDelete?: string[];
  warrantyGating: WarrantyGating;
  surfaceOverrides?: Record<ItemPolicySurface, ItemPolicySurfaceOverride>;
}
