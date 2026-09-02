import { calculatePrices } from "utils/priceCalculator";
import { PERMISSIONS } from "utils/Permissions";
import type { discountBase } from "api/services/countryConfiguration/countryConfiguration";
import type { MaterialItem, ItemsSurfaceConfig } from "hooks/itemsManager/itemsManager.types";
import type { Material } from "./Claims.types";

// Real claim-side ItemsSurfaceConfig for Phase 5 (items-and-prices-refactor.md §15). Ported
// from useClaimMaterialsManager.ts's claimMaterialToMaterialItem/materialItemToMaterial/
// buildEmptyClaimMaterial/onAddRow's position-selection logic — every function here is a
// faithful port of that file's real behavior, not new logic. Not wired into ClaimOverview.tsx
// yet (that's step 8) — this file exists now so useItemsManager.test.ts can prove the
// full-recomputation switch against claim's real config, not a synthetic stand-in.

export const claimMaterialToMaterialItem = (m: Material, mode: discountBase): MaterialItem => {
  const price = m.price ?? ({} as Material["price"]);
  const quantity = m.quantity ?? 1;
  const unitPrice = price?.unitPrice ?? 0;
  const taxPercent = price?.tax ?? 0;
  const discountPercent = price?.discount ?? 0;

  const calculated = calculatePrices(
    {
      quantity,
      unitPrice,
      taxPercent,
      discountPercent,
      suggestedNetPrice: price?.suggestedNetPrice ?? 0,
      netAmount: price?.netAmount ?? 0,
      grossAmount: price?.grossAmount ?? 0,
      totalAmount: price?.totalAmount ?? 0,
      taxAmount: price?.taxAmount ?? 0,
    },
    "unitPrice",
    unitPrice,
    mode,
  );

  return {
    position: m.position ?? "",
    partNumber: m.partNumber ?? "",
    description: m.description ?? "",
    type: m.jobType ?? "",
    quantity,
    unitPrice,
    suggestedNetPrice: calculated.suggestedNetPrice,
    netAmount: calculated.netAmount,
    tax: taxPercent,
    grossAmount: calculated.grossAmount,
    discount: calculated.discountPercent,
    discountAmount: calculated.discountAmount,
    totalAmount: calculated.totalAmount,
    taxAmount: calculated.taxAmount,
    status: m.status,
    // isValidated folds in forceValidated per ItemsSurfaceConfig.toMaterialItem's contract —
    // claim's shouldMarkValidatedRef equivalent is never set (claim never calls
    // resyncMaterialsFromAPI(true)), so this is effectively always `m.isValidated` in
    // practice, matching claim's original mapper exactly.
    order: Number(m.order) || 0,
    reimbursementPaymentMethod: m.reimbursementPaymentMethod,
    // Deliberately no materialId — claim's raw Material shape has no equivalent field, and
    // useItemsManager.ts's Effect 1 "allHaveIds" branch (job-only behavior: force
    // isValidated/isResyncingRef when every row already has a materialId) must stay a no-op
    // for claim exactly as it was before this merge — see items-and-prices-refactor.md §15.
  };
};

export const materialItemToMaterial = (item: MaterialItem): Material => ({
  position: item.position,
  partNumber: item.partNumber,
  jobType: item.type,
  status: item.status ?? "PENDING",
  approvedBy: "",
  approvedByName: "",
  approvedAt: "",
  description: item.description,
  quantity: item.quantity,
  isValidated: item.isValidated ?? false,
  isPriceManuallySet: true,
  reimbursementPaymentMethod: item.reimbursementPaymentMethod,
  price: {
    unitPrice: item.unitPrice,
    suggestedNetPrice: item.suggestedNetPrice ?? 0,
    netAmount: item.netAmount,
    tax: item.tax,
    taxAmount: item.taxAmount,
    grossAmount: item.grossAmount,
    discount: item.discount,
    totalAmount: item.totalAmount ?? 0,
  },
});

const buildToMaterialItem =
  () =>
  (raw: Material, mode: discountBase, ctx: { forceValidated: boolean }): MaterialItem => {
    const mapped = claimMaterialToMaterialItem(raw, mode);
    return { ...mapped, isValidated: ctx.forceValidated || mapped.isValidated };
  };

// Reproduces onAddRow's exact position-selection rule: auto-select only when exactly one
// allowed position still has remaining capacity, otherwise leave it blank ("") so the user
// picks from the position dropdown — this is why ClaimSparePartsRow prepends a disabled
// "Select" placeholder option job's row never does (see items-and-prices-refactor.md §15).
const claimNewRowDefaults = {
  // New rows added via "add row" default to WARRANTY regardless of the claim's overall
  // jobType, per PTBASS product requirement — matches buildEmptyClaimMaterial's caller exactly.
  resolveType: () => "WARRANTY",
  resolvePosition: (ctx: {
    allowed: { position: string; maxCount: number }[];
    positionCounts: Record<string, number>;
  }) => {
    const availablePositions = ctx.allowed.filter(
      (p) => (ctx.positionCounts[p.position] ?? 0) < p.maxCount,
    );
    return availablePositions.length === 1 ? availablePositions[0].position : "";
  },
};

export const buildClaimItemsSurfaceConfig = (
  overrides: Partial<ItemsSurfaceConfig<Material>> = {},
): ItemsSurfaceConfig<Material> => ({
  identity: {
    surface: "claimSpareParts",
    naming: {
      tabName: "claims",
      liveAreaMarker: "claimSpareParts",
      archivedAreaMarker: "claimArchivedSpareParts",
      liveMarkerCollidesWithArchived: true,
    },
  },
  resetKey: undefined,
  apiMaterials: undefined,
  apiArchivedMaterials: undefined,
  toMaterialItem: buildToMaterialItem(),
  fromMaterialItem: materialItemToMaterial,
  currentActionType: "",
  currentJobType: "",
  // Claim never auto-builds automatic rows today — a real pre-existing product gap, not
  // silently fixed by this merge (see items-and-prices-refactor.md §15).
  autoBuildAutomaticRows: false,
  bareSalesAutofill: undefined,
  addSpecialMaterialsActionTypeGate: undefined,
  // Claim's own position-view gate (useClaimMaterialsManager.ts's local POSITION_PERMISSIONS)
  // — deliberately NOT the same object as job's row-editability POSITION_PERMISSIONS table
  // (SparePartsRow.tsx, a different shape for a different purpose — see
  // items-and-prices-refactor.md §15's collision note).
  positionViewPermissions: { PN: PERMISSIONS.DIAGNOSTICS.CAN_VIEW_NET_DEALER_PRICE },
  positionInsertPermissions: undefined,
  newRowDefaults: claimNewRowDefaults,
  deletionPolicy: {
    permanentDeleteFromActiveStatuses: undefined,
    supportsPermanentArchivedDelete: true,
  },
  resyncOnApiMaterialsReferenceChange: true,
  setArePricesValidatedOnSync: true,
  jobStatus: undefined,
  ...overrides,
});
