import type {
  AllowedPosition,
  discountBase,
} from "api/services/countryConfiguration/countryConfiguration";
import type { GenericOptionProps } from "components/generics/Field/GenericField.types";
import type { ItemSurface } from "utils/itemRulesResolver";

// Types backing the Phase 5 Job/Claim item-row unification (useItemsManager) — see
// items-and-prices-refactor.md §15. MaterialItem/ImportedMaterial moved here (from
// useDiagnosticsManager.ts, which still re-exports both for every existing import site) so
// they have a stable home once useDiagnosticsManager.ts is eventually deleted (Phase 5 step 10).

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

export interface ItemsSurfaceNaming {
  /** Section/tab name the item areas live under: "diagnosticData" | "claims". */
  tabName: string;
  /** Substring identifying a live-row Area/Field name: "diagnosticsSpareParts" | "claimSpareParts". */
  liveAreaMarker: string;
  /** Substring identifying an archived-row Area/Field name. */
  archivedAreaMarker: string;
  /** True when liveAreaMarker is itself a substring of archivedAreaMarker (claim:
   *  "claimSpareParts" is contained in "claimArchivedSpareParts") — area-name filters must
   *  then explicitly exclude the archived marker to avoid double-matching. Job's two markers
   *  ("diagnosticsSpareParts" / "archivedSpareParts") never collide this way. */
  liveMarkerCollidesWithArchived: boolean;
}

export interface NewRowDefaults {
  /** Job: always "" (ignores currentJobType — see onAddRow). Claim: always "WARRANTY", per
   *  PTBASS product requirement (also ignores currentJobType). */
  resolveType: (ctx: { currentJobType: string }) => string;
  /** Job: first allowed position (sorted by POSITION_ORDER) with remaining capacity — always
   *  fills a position if any has capacity. Claim: only auto-fills when exactly one allowed
   *  position still has capacity, else "" (user must pick from the position dropdown, which is
   *  why claim's row prepends a disabled "Select" placeholder option job's never does). */
  resolvePosition: (ctx: {
    allowed: AllowedPosition[];
    positionCounts: Record<string, number>;
  }) => string;
}

export interface DeletionPolicy {
  /** Job: {"IN_DIAGNOSTICS"} — deleting a row in one of these statuses is permanent, no
   *  archiving. Claim: undefined — onDeleteRow always archives, regardless of status. */
  permanentDeleteFromActiveStatuses?: Set<string>;
  /** Claim only: whether onDeleteArchivedRow (permanently remove an archived row) exists.
   *  Job has no such action at all. */
  supportsPermanentArchivedDelete: boolean;
}

export interface ItemsSurfaceConfig<TApiMaterial = unknown> {
  identity: { surface: ItemSurface; naming: ItemsSurfaceNaming };
  /** jobId | claimId — materials/archivedMaterials state resets when this changes. */
  resetKey: string | undefined;
  apiMaterials: TApiMaterial[] | undefined;
  apiArchivedMaterials: TApiMaterial[] | undefined;
  /** `forceValidated` carries the hook's own shouldMarkValidatedRef signal (set by
   *  resyncMaterialsFromAPI(true), e.g. after a successful validate-and-save) — job's mapper
   *  uses it directly as isValidated; claim's own material shape already carries a real
   *  `isValidated` field from the API and is expected to fold this in rather than ignore it
   *  (e.g. `forceValidated || raw.isValidated`). Not baked into a single shared mapping
   *  because it's the one field this hook's internal state (not the raw material) decides. */
  toMaterialItem: (
    raw: TApiMaterial,
    mode: discountBase,
    ctx: { forceValidated: boolean },
  ) => MaterialItem;
  /** Claim only — needed by onDeleteRow (archives as the API material shape) and
   *  onDeleteArchivedRow. Undefined for job (job's own save-payload builder lives outside
   *  this hook, in JobOverview.tsx, and doesn't need this). */
  fromMaterialItem?: (item: MaterialItem) => TApiMaterial;
  currentActionType: string;
  currentJobType: string;
  /** Job: true — Effect 2 rebuilds automatic rows on every actionType/jobType change. Claim:
   *  false — claim never auto-builds automatic rows today (a real product gap, not fixed
   *  silently by this merge; flip only on explicit product sign-off, see items-and-prices-
   *  refactor.md §15). */
  autoBuildAutomaticRows: boolean;
  /** Job: false — once Effect 1 has synced from the API for this resetKey, it never re-syncs
   *  until resyncMaterialsFromAPI() explicitly resets it, even if apiMaterials gets a new
   *  array reference in the meantime (e.g. an unrelated background refetch) — by design.
   *  Claim: true — claim's original hook (useClaimMaterialsManager.ts's lastSyncedMaterialsRef)
   *  re-syncs automatically whenever apiMaterials is a genuinely new reference, without
   *  needing an explicit reset call. Both still skip a re-sync when the reference is
   *  unchanged. */
  resyncOnApiMaterialsReferenceChange: boolean;
  /** Job: false — arePricesValidated is owned by the caller (JobOverview.tsx), Effect 1 never
   *  touches it. Claim: true — claim's original Effect 1 additionally calls
   *  setArePricesValidated(every synced item already validated) on every sync, computed from
   *  the mapped items' own isValidated (which toMaterialItem is expected to have already
   *  folded the raw material's real isValidated field into, per its own docstring above). */
  setArePricesValidatedOnSync: boolean;
  /** Job only (PN row autofill from bareSalesRelation). Undefined for claim. */
  bareSalesAutofill?: { actionTypeGate: Set<string>; excludeUserType: string };
  /** Job only — addSpecialMaterialsAllowed is additionally gated off for these action types
   *  even when country config says true. Undefined for claim (no such gate). */
  addSpecialMaterialsActionTypeGate?: Set<string>;
  /** Position-view gate (filters allowedPositions) — kept separate from row-level action
   *  permissions (ItemRowSurfaceConfig.positionActionPermissions, step 6) because the two
   *  existing POSITION_PERMISSIONS constants (job's SparePartsRow.tsx 6-key table vs claim's
   *  useClaimMaterialsManager.ts position-view map) are different shapes for different
   *  purposes and must not be merged — see items-and-prices-refactor.md §15. */
  positionViewPermissions: Record<string, string>;
  /** Job only (POSITION_INSERT_PERMISSIONS) — gates onAddRow. Undefined for claim. */
  positionInsertPermissions?: Record<string, string>;
  newRowDefaults: NewRowDefaults;
  deletionPolicy: DeletionPolicy;
  jobStatus?: string;
}

export interface UseItemsManagerReturn {
  materials: MaterialItem[];
  /** Rows removed from the active list (archived, not yet permanently deleted). Job's own
   *  archived-row UI derives everything from tabs/allFields (Effect 3b) and never reads this
   *  field; claim needs it directly — both for ItemsContextValue.archivedMaterials and for
   *  building the validate-and-save payload (see ClaimOverview.tsx's onValidateClaim). */
  archivedMaterials: MaterialItem[];
  apiMaterialsLoaded: boolean;
  apiMaterialsEmpty: boolean;
  hasExistingDiagnostic: boolean;
  setMaterials: React.Dispatch<React.SetStateAction<MaterialItem[]>>;
  allowedPositions: AllowedPosition[];
  automaticRows: string[];
  positionDropdownOptions: GenericOptionProps[];
  addSpecialMaterialsAllowed: boolean;
  discountBase: discountBase;
  getPositionConfig: (position: string) => AllowedPosition | undefined;
  getQuantityForPosition: (
    position: string,
    faultCodeValue?: string,
    faultCodeLabourQuantity?: number,
  ) => number | undefined;
  onAddRow: (formValues?: Record<string, unknown>) => void;
  onDeleteRow: (areaName: string) => void;
  /** Present only when config.deletionPolicy.supportsPermanentArchivedDelete is true
   *  (claim). Undefined for job. */
  onDeleteArchivedRow?: (areaName: string) => void;
  onRestoreRow: (areaName: string) => void;
  onAddMaterials: (
    items: ImportedMaterial[],
    setFieldValue?: (field: string, value: unknown) => void,
  ) => void;
  getExistingPartNumbers: (formValues: Record<string, unknown>) => Set<string>;
  markAllValidated: () => void;
  markRowDirty: (areaIndex: number) => void;
  enableValidate: () => boolean;
  resyncMaterialsFromAPI: (markValidated?: boolean) => void;
  setRevisedRejectedRowPending: (areaName: string) => void;
  canArchiveOnDelete: boolean;
}
