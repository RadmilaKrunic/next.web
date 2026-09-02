import { calculatePrices } from "utils/priceCalculator";
import { PERMISSIONS } from "utils/Permissions";
import type { TFunction } from "i18next";
import type { discountBase } from "api/services/countryConfiguration/countryConfiguration";
import type { MaterialItem, ItemsSurfaceConfig } from "hooks/itemsManager/itemsManager.types";
import { getPositionAutofill, POSITION_ORDER } from "hooks/itemsManager/materialsDerivation";

// Real job-side ItemsSurfaceConfig for Phase 5 (items-and-prices-refactor.md §15 step 8).
// Ported from useDiagnosticsManager.ts's mapPrice/POSITION_VIEW_PERMISSIONS/
// POSITION_INSERT_PERMISSIONS/onAddRow's position-selection logic/STATUSES_WITH_PERMANENT_
// DELETE/PREAPPROVAL_ACTION_TYPES — every function here is a faithful port of that file's real
// behavior, not new logic. Mirrors claimItemsSurfaceConfig.ts's structure.

export type JobApiMaterial = Record<string, unknown>;

/** Statuses where row deletion is permanent (no archiving) — moved here from
 *  useDiagnosticsManager.ts's exported STATUSES_WITH_PERMANENT_DELETE constant. */
export const STATUSES_WITH_PERMANENT_DELETE = new Set(["IN_DIAGNOSTICS"]);

const PREAPPROVAL_ACTION_TYPES = new Set([
  "NEW_TOOL_EXCHANGE",
  "SPARE_PARTS_EXCHANGE",
  "ACCESSORIES_EXCHANGE",
]);

const POSITION_VIEW_PERMISSIONS = {
  FR: PERMISSIONS.DIAGNOSTICS.CAN_VIEW_FREIGHT_ITEMS,
} as const;

const POSITION_INSERT_PERMISSIONS = {
  FR: PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_FREIGHT_ITEMS,
} as const;

// Ported verbatim from useDiagnosticsManager.ts's mapPrice — the same function, restructured
// to the ItemsSurfaceConfig.toMaterialItem(raw, mode, ctx) signature. `t` is closed over via
// buildJobItemsSurfaceConfig's factory param (job's description-autofill for LA/FR needs a
// live translation function, unlike claim's toMaterialItem which needs none — see
// getPositionAutofill in materialsDerivation.ts).
const buildToMaterialItem =
  (t: TFunction<"translation", "app">) =>
  (raw: JobApiMaterial, mode: discountBase, ctx: { forceValidated: boolean }): MaterialItem => {
    const position = (raw.position as string) ?? "";
    const price = (raw.price as Record<string, unknown>) ?? {};
    const autofill = getPositionAutofill(t);
    const description = autofill[position]?.description ?? (raw.description as string) ?? "";

    const quantity = Number(raw.quantity) || 1;
    const unitPrice = Number(price.unitPrice) || 0;
    const taxPercent = Number(price.tax) || 0;
    const discountPercent = Number(price.discount) || 0;

    const calculated = calculatePrices(
      {
        quantity,
        unitPrice,
        taxPercent,
        discountPercent,
        suggestedNetPrice: 0,
        netAmount: 0,
        grossAmount: 0,
        totalAmount: 0,
        taxAmount: 0,
      },
      "unitPrice",
      unitPrice,
      mode,
    );

    return {
      position,
      partNumber: (raw.partNumber as string) ?? "",
      description,
      type: (raw.jobType as string) ?? "",
      quantity,
      unitPrice,
      netAmount: calculated.netAmount,
      tax: taxPercent,
      taxAmount: calculated.taxAmount,
      grossAmount: calculated.grossAmount,
      discount: calculated.discountPercent,
      discountAmount: calculated.discountAmount,
      totalAmount: calculated.totalAmount,
      suggestedNetPrice: calculated.suggestedNetPrice,
      status: (raw.status as string) ?? undefined,
      materialId: (raw.id as string) ?? undefined,
      // Job's mapPrice used shouldMarkValidatedRef.current directly as isValidated (not folded
      // with any raw-material field, unlike claim) — ctx.forceValidated reproduces that exactly.
      isValidated: ctx.forceValidated,
      order: Number(raw.order) || 0,
      notBelongsToTool: (raw.notBelongsToTool as boolean) ?? undefined,
      isPriceSetManually: false,
    };
  };

// Reproduces onAddRow's exact position-selection rule: always fills the first allowed
// position (sorted by POSITION_ORDER) that still has remaining capacity, unlike claim's
// exactly-one-available-position rule.
const jobNewRowDefaults = {
  // Job's onAddRow always builds a new row with type "" regardless of currentJobType —
  // matches buildEmptyMaterial(nextPosition, "", qty, ...) in useDiagnosticsManager.ts exactly.
  resolveType: () => "",
  resolvePosition: (ctx: {
    allowed: { position: string; maxCount: number }[];
    positionCounts: Record<string, number>;
  }) =>
    [...ctx.allowed]
      .sort(
        (a, b) =>
          (POSITION_ORDER[a.position] ?? Number.MAX_SAFE_INTEGER) -
          (POSITION_ORDER[b.position] ?? Number.MAX_SAFE_INTEGER),
      )
      .find((p) => (ctx.positionCounts[p.position] ?? 0) < p.maxCount)?.position ?? "",
};

export const buildJobItemsSurfaceConfig = (
  t: TFunction<"translation", "app">,
  overrides: Partial<ItemsSurfaceConfig<JobApiMaterial>> = {},
): ItemsSurfaceConfig<JobApiMaterial> => ({
  identity: {
    surface: "jobDiagnostics",
    naming: {
      tabName: "diagnosticData",
      liveAreaMarker: "diagnosticsSpareParts",
      archivedAreaMarker: "archivedSpareParts",
      liveMarkerCollidesWithArchived: false,
    },
  },
  resetKey: undefined,
  apiMaterials: undefined,
  apiArchivedMaterials: undefined,
  toMaterialItem: buildToMaterialItem(t),
  currentActionType: "",
  currentJobType: "",
  autoBuildAutomaticRows: true,
  resyncOnApiMaterialsReferenceChange: false,
  setArePricesValidatedOnSync: false,
  bareSalesAutofill: { actionTypeGate: PREAPPROVAL_ACTION_TYPES, excludeUserType: "BOSCH_INTERNAL" },
  addSpecialMaterialsActionTypeGate: PREAPPROVAL_ACTION_TYPES,
  positionViewPermissions: POSITION_VIEW_PERMISSIONS,
  positionInsertPermissions: POSITION_INSERT_PERMISSIONS,
  newRowDefaults: jobNewRowDefaults,
  deletionPolicy: {
    permanentDeleteFromActiveStatuses: STATUSES_WITH_PERMANENT_DELETE,
    supportsPermanentArchivedDelete: false,
  },
  jobStatus: undefined,
  ...overrides,
});
