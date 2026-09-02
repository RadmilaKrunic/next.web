import type { RefObject, Dispatch, SetStateAction } from "react";
import type {
  AllowedPosition,
  discountBase,
} from "api/services/countryConfiguration/countryConfiguration";
import type { GenericOptionProps } from "components/generics/Field/GenericField.types";
import type { ItemPolicyConfig } from "api/services/itemPolicy/itemPolicy.types";
import type { MaterialItem, ImportedMaterial } from "./itemsManager.types";
// Material (raw claim API shape) is claim-specific, unlike MaterialItem (the shared
// client-side row model both surfaces use) — archivedMaterials on the context is claim's own
// untranslated archived list (useClaimMaterialsManager.ts's return value, pre-merge), not
// mapped through toMaterialItem. Confirmed via ClaimOverview.tsx's claimContextValue
// construction, which assigns the claim hook's own Material[] return value directly.
import type { Material } from "modules/ClaimManagement/ClaimOverview/Claims.types";

// Merged shape backing both DiagnosticsContext (job) and ClaimContext (claim) — Phase 5
// unification, items-and-prices-refactor.md §15 step 5. The two stay separate React.Context
// objects (see DiagnosticsContext.tsx/ClaimContext.tsx) because ClaimOverview.tsx provides two
// different values simultaneously in the same tree: a fully-stubbed read-only one (for the
// embedded job-diagnostic mirror tab) and the real claim one — a single shared context
// couldn't hold two different values for two different subtrees at once. Confirmed field-by-
// field against the pre-merge DiagnosticsContextValue (24 fields) and ClaimContextValue (19
// fields) by direct read of both files during planning.
export interface ItemsContextValue {
  /** Source-of-truth list of spare-part rows */
  materials: MaterialItem[];
  setMaterials: Dispatch<SetStateAction<MaterialItem[]>>;
  /** Add a single empty row (triggered by "Add Row" button) */
  onAddRow: (formValues: Record<string, unknown>) => void;
  /** Add one or more rows from external material sources (explosion diagram / special materials) */
  onAddMaterials: (
    materials: ImportedMaterial[],
    setFieldValue?: (field: string, value: unknown) => void,
  ) => void;
  /** Remove a spare-parts row by its area name */
  onDeleteRow: (areaName: string) => void;
  /** Restore an archived spare-parts row back to the active list */
  onRestoreRow: (areaName: string) => void;
  /** Whether adding special materials is allowed by country config */
  addSpecialMaterialsAllowed: boolean;
  /** Dropdown options for the position field */
  positionDropdownOptions: GenericOptionProps[];
  /** Allowed positions from country diagnostic config */
  allowedPositions: AllowedPosition[];
  /** Returns the set of part numbers already present in the form */
  getExistingPartNumbers: (formValues: Record<string, unknown>) => Set<string>;
  isDistributingRef: RefObject<boolean>;
  isResyncingRef: RefObject<boolean>;
  /** Set to true after the onValidate action callback completes successfully */
  arePricesValidated: boolean;
  setArePricesValidated: Dispatch<SetStateAction<boolean>>;
  /** True when at least one material row has any non-zero price value */
  hasPricesPopulated: boolean;
  /** Marks all materials as validated (called on successful validate-and-save) */
  markAllValidated: () => void;
  /** Marks a single row as dirty/unvalidated (called when user edits prices) */
  markRowDirty: (areaIndex: number) => void;
  /** Radio-button options for the summary type selector; computed inside SummaryArea */
  summaryTypeOptions: { label: string; value: string }[];
  setSummaryTypeOptions: Dispatch<SetStateAction<{ label: string; value: string }[]>>;
  /** Whether the archived spare parts section is expanded */
  isArchivedExpanded: boolean;
  setIsArchivedExpanded: Dispatch<SetStateAction<boolean>>;
  /** Country-level price calculation mode: GROSS (discount on gross) or NET (discount on total net). */
  discountBase: discountBase;
  /** Positions auto-created by the matched diagnostic rule (e.g. ["LA","AC","FR"]) */
  automaticRows: string[];

  // ── Job-only (claim passes inert defaults) ────────────────────────────────
  apiMaterialsLoaded: boolean;
  apiMaterialsEmpty: boolean;
  hasExistingDiagnostic: boolean;
  /** Reset a row status from REVISED to PENDING after user edits */
  setRevisedRejectedRowPending: (areaName: string) => void;
  /** True when deleting a row moves it to archived instead of permanently removing it. */
  canArchiveOnDelete: boolean;
  /** Resets the API-sync flag so the next diagnosticData update re-applies to the form */
  resyncMaterialsFromAPI: () => void;
  /** Current job status (e.g., "IN_DIAGNOSTICS", "REPAIR_DONE", etc.) */
  jobStatus?: string;
  /** True while validateAndSave mutation is pending — all row inputs locked */
  isValidating: boolean;
  /** Frontend-policy overlay (permissions, editability, protected positions) for the
   *  "jobDiagnostics" surface — see itemRulesResolver.ts. Undefined while loading, if the
   *  backing endpoint isn't available yet, or for a surface that hasn't wired it (claim, as
   *  of this step) — consumers must fall back to their prior hardcoded defaults in that case
   *  (see SparePartsRow.tsx). */
  itemPolicy?: ItemPolicyConfig;

  // ── Claim-only (job passes inert defaults) ────────────────────────────────
  /** Permanently remove an archived row — job has no equivalent concept at all. */
  onDeleteArchivedRow?: (areaName: string) => void;
  /** True when rows can be deleted (edit mode + status is REVISED) */
  canDeleteRows: boolean;
  /** Materials deleted from the active list (sent to BE on validate) — claim's own raw,
   *  untranslated archived list (not mapped through toMaterialItem). */
  archivedMaterials: Material[];
  /** True when claim status is PENDING and material-level inputs must stay locked */
  isClaimPending: boolean;
}

const DEFAULT_SUMMARY_TYPE_OPTIONS = [{ value: "totalSummary", label: "totalSummary" }];

const noop = () => {};

const createDefaultRef = (): RefObject<boolean> => ({ current: false });

const baseDefaultItemsContextValue: ItemsContextValue = {
  materials: [],
  setMaterials: noop,
  onAddRow: noop,
  onAddMaterials: noop,
  onDeleteRow: noop,
  onRestoreRow: noop,
  addSpecialMaterialsAllowed: false,
  positionDropdownOptions: [],
  allowedPositions: [],
  getExistingPartNumbers: () => new Set(),
  isDistributingRef: createDefaultRef(),
  isResyncingRef: createDefaultRef(),
  arePricesValidated: false,
  setArePricesValidated: noop,
  hasPricesPopulated: false,
  markAllValidated: noop,
  markRowDirty: noop,
  summaryTypeOptions: DEFAULT_SUMMARY_TYPE_OPTIONS,
  setSummaryTypeOptions: noop,
  isArchivedExpanded: false,
  setIsArchivedExpanded: noop,
  discountBase: "GROSS_PRICE",
  automaticRows: [],
  // Job-only fields, inert defaults:
  apiMaterialsLoaded: false,
  apiMaterialsEmpty: false,
  hasExistingDiagnostic: false,
  setRevisedRejectedRowPending: noop,
  canArchiveOnDelete: false,
  resyncMaterialsFromAPI: noop,
  jobStatus: "",
  isValidating: false,
  itemPolicy: undefined,
  // Claim-only fields, inert defaults:
  onDeleteArchivedRow: undefined,
  canDeleteRows: false,
  archivedMaterials: [],
  isClaimPending: false,
};

/** Builds a default ItemsContextValue, overridden per-surface (see DiagnosticsContext.tsx /
 *  ClaimContext.tsx) — replaces the two near-identical defaultDiagnosticsContextValue /
 *  defaultClaimContextValue blocks that existed before this merge. */
export const createDefaultItemsContextValue = (
  overrides: Partial<ItemsContextValue> = {},
): ItemsContextValue => ({
  ...baseDefaultItemsContextValue,
  ...overrides,
});
