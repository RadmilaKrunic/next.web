import type Field from "components/generics/Field/GenericField.types";
import type { GenericOptionProps } from "components/generics/Field/GenericField.types";
import type { AllowedPosition } from "api/services/countryConfiguration/countryConfiguration";
import type { ItemPolicyConfig } from "api/services/itemPolicy/itemPolicy.types";
import type { ItemSurface } from "utils/itemRulesResolver";
import type { PriceFieldEditability } from "./materialPriceEditability";

// Phase 5 unification (items-and-prices-refactor.md §15 step 6) — every field here names one
// real, traced divergence between SparePartsRow.tsx (job) and ClaimSparePartsRow.tsx (claim),
// found by reading both files in full. resolveFieldPermissions/resolvePositionFieldOptions/
// resolveCanShowDeleteIcon are deliberately FULL per-surface functions rather than decomposed
// into shared sub-pieces with knobs: claim's real editability rule ("row is new" + a type-
// field special case) and job's (per-price-field editability + per-subtype position/quantity/
// partNumber/description disabling) are different SHAPES of logic, not the same algorithm
// with different inputs — forcing them through one shared algorithm would risk distorting
// one or both. Each implementation (built in step 8, wired into JobOverview.tsx/
// ClaimOverview.tsx) is a verified, traced port of that surface's real pre-merge body.

export interface IsRowFullyDisabledContext {
  isDisabled: boolean;
  isApproved: boolean;
  isStatusDisabled: boolean;
  /** Job only (no equivalent lock mechanism on claim — see items-and-prices-refactor.md §15). */
  isValidating: boolean;
  /** Claim only. */
  isClaimPending: boolean;
}

export interface FieldPermissionContext {
  isDisabled: boolean;
  /** Job: isDisabled || isApproved || isStatusDisabled || isValidating. Claim: isDisabled ||
   *  isClaimPending — genuinely different formulas, resolved via resolveIsRowFullyDisabled
   *  below rather than computed inline in ItemRow.tsx. */
  isRowFullyDisabled: boolean;
  /** Job only — resolveEditability/getPriceFieldEditability's per-price-field result.
   *  Always computed (harmless if a surface's resolver ignores it). */
  priceFieldEditability: PriceFieldEditability;
  /** Job only — per-subtype disablement (position/quantity/partNumber/description). */
  mappedPositionOptions: Record<string, boolean>;
  /** Claim only — materials[areaIndex]?.isNew === true. */
  isNewRow: boolean;
}

export interface PositionOptionsContext {
  allFormFields: Field[];
  values: Record<string, unknown>;
  allowedPositions: AllowedPosition[];
  userPermissions: string[];
  itemPolicy: ItemPolicyConfig | undefined;
  /** Claim only — country-config-derived fallback options when a field has none of its own. */
  positionDropdownOptions: GenericOptionProps[];
}

export interface DeleteIconContext {
  isDisabled: boolean;
  isApproved: boolean;
  isPending: boolean;
  positionValue: string;
  jobStatus: string | undefined;
  canArchiveOnDelete: boolean;
  isRepairAnswerLocked: boolean | undefined;
  isJobOnHold: boolean;
  /** Job only — position-permission-based (POSITION_PERMISSIONS/itemPolicy canDelete). */
  canDeleteRow: boolean;
  /** Job only — STATUSES_BLOCKING_DELETION.has(jobStatus). */
  isDeletionBlocked: boolean;
  /** Claim only. */
  canDeleteRows: boolean;
  isAutomaticRow: boolean;
}

export interface ItemRowSurfaceConfig {
  surface: ItemSurface;
  resolveIsRowFullyDisabled: (ctx: IsRowFullyDisabledContext) => boolean;
  resolveFieldPermissions: (field: Field, ctx: FieldPermissionContext) => Field;
  resolvePositionFieldOptions: (fields: Field[], ctx: PositionOptionsContext) => Field[];
  resolveCanShowDeleteIcon: (ctx: DeleteIconContext) => boolean;
  /** Job: true — an exchange-action-type automatic row (EXCHANGE_ACTION_TYPES +
   *  automaticRows.includes(position)) renders NO row actions at all: neither the goodwill
   *  flyout nor the delete icon. Claim: false — claim's own automatic-row check
   *  (!isAutomaticRow) already fully gates its single delete-icon affordance; there's no
   *  separate flyout path to also gate. */
  hasExchangeAutoRowGate: boolean;
  /** Job: true (further gated internally on hasApproveCommercialGoodwillPermission +
   *  isPending). Claim: false — no goodwill/approval concept on the claim row at all. */
  hasApprovalFlyout: boolean;
  extraEffects: {
    /** Syncs the active visible discount field from the hidden discount field on initial
     *  resync load. Job only. */
    discountHiddenSync: boolean;
    /** Nulls price fields + materialId when the part number genuinely changes (not a
     *  formatting-only edit or an API-driven resync). Job only — claim doesn't track
     *  materialId or have this concept of "the old price belongs to a different part". */
    partNumberReset: boolean;
    /** Preserves a row's price fields across a type toggle into/out of an editable type,
     *  restoring them if the user toggles back. Job only. */
    pricePreservationOnTypeToggle: boolean;
    /** Repopulates the discount % when jobType changes (CHARGEABLE/COMMERCIAL_GOODWILL
     *  rules, sibling-row discount collection). Job only — claim's row-level "type" field
     *  is unrelated to this whole-diagnostic-level jobType concept. */
    jobTypeDiscountRepopulation: boolean;
  };
  /** Job: true — isResyncingRef is shared across every row via DiagnosticsContext, so a
   *  newly-added second row's own setup effects suppress dirty-tracking on ALL rows for
   *  that render cycle unless explicitly guarded (areaIndex === 1 special-case, see
   *  items-and-prices-refactor.md §14). Claim: false — claim's isResyncingRef sharing
   *  never triggered this bug pattern (traced: claim has no incremental-add-triggered
   *  cross-row effect timing issue, since Phase 5 step 4 already made its row derivation
   *  full-recomputation, not incremental). */
  areaIndexOneSharedRefGuard: boolean;
  /** Job: hasPricesPopulated || Boolean(materialId). Claim: hasPricesPopulated only —
   *  claim doesn't track materialId on the row at all. */
  hasExpandablePricesIncludesMaterialId: boolean;
  /** Job: true (isWarrantyIneligible gates type-option disabling alongside
   *  isSparePartTypeRestricted). Claim: false — no warranty-panel concept on the claim row. */
  hasWarrantyGating: boolean;
  /** Job: true (the wrapper div's onChange handler resets REVISED/REJECTED rows to PENDING
   *  on any field edit other than type/partNumber/position). Claim: false — claim's wrapper
   *  has no onChange handler at all. */
  hasOnChangeRevisedRejectedReset: boolean;
}
