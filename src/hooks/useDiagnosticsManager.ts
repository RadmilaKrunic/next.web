import Field from "components/generics/Field/GenericField.types";
import {
  getPositionAutofill,
  buildRowValues,
  buildMaterialsRowValues,
  deriveSparePartsAreasAndFields,
} from "./itemsManager/materialsDerivation";

// Re-exported for backward compatibility — moved to itemsManager/materialsDerivation.ts
// (Phase 5 unification, items-and-prices-refactor.md §15 step 2) so useItemsManager.ts and
// every existing import site can keep referring to them from here. Pure move, no logic
// change; do not add new logic here, add it in materialsDerivation.ts instead.
export {
  getPositionAutofill,
  buildRowValues,
  buildMaterialsRowValues,
  deriveSparePartsAreasAndFields,
};

// ── Types ──────────────────────────────────────────────────────────────────

// MaterialItem/ImportedMaterial live in itemsManager.types.ts (see the re-export block
// below for why) — imported here so this file's own code keeps referring to them by their
// short names, unchanged.
import type { MaterialItem, ImportedMaterial } from "./itemsManager/itemsManager.types";
export type { MaterialItem, ImportedMaterial };

// ── Diagnostic field helpers ───────────────────────────────────────────────
//
// computeIsChargeable/hasWarrantyOrProServiceItems/getChargeablePendingInfo/
// getBoschInternalPending are job-diagnostic-tab-specific (warranty/goodwill) and were
// deliberately never moved into the shared itemsManager hook/config (Phase 5 unification,
// items-and-prices-refactor.md §15 steps 2-3) — useItemsManager.ts doesn't call them, and
// they have no claim-side equivalent. They stay here, still live (SummaryArea.tsx,
// JobOverview.tsx). The useDiagnosticsManager hook itself, and every helper/type below that
// existed only to support it (STATUSES_WITH_PERMANENT_DELETE, syncMaterialsWithForm,
// removeArchivedArea, QuantitySource, UseDiagnosticsManagerProps/Return), were deleted in
// step 10 once useItemsManager fully replaced it in JobOverview.tsx/ClaimOverview.tsx (step 8)
// and every case in its test file was ported or confirmed still covered by
// useItemsManager.test.ts (this file's own remaining tests still exercise the pure functions
// re-exported above and the four helpers below directly).

export function computeIsChargeable(
  allFields: Field[],
  values: Record<string, unknown>,
): boolean | null {
  const typeFields = allFields.filter((f) => f.subtype === "diagnosticType");
  if (typeFields.length === 0) return null;
  return typeFields.some((f) => (values[f.name] as string) === "CHARGEABLE");
}

export function hasWarrantyOrProServiceItems(
  allFields: Field[],
  values: Record<string, unknown>,
): boolean {
  const typeFields = allFields.filter((f) => f.subtype === "diagnosticType");
  return typeFields.some((f) => {
    const type = (values[f.name] as string) ?? "";
    return type === "WARRANTY" || type === "SERVICE_OFFERING";
  });
}

export function getChargeablePendingInfo(
  fields: Field[],
  values: Record<string, unknown>,
): { pendingTypeFields: Field[]; hasChargeablePending: boolean } {
  const typeFields = fields.filter((f) => f.subtype === "diagnosticType");
  const statusFields = fields.filter((f) => f.subtype === "diagnosticMaterialStatus");
  const pendingTypeFields = typeFields.filter((_, i) => {
    const statusField = statusFields[i];
    return !statusField || (values[statusField.name] as string) !== "APPROVED";
  });
  const hasChargeablePending = pendingTypeFields.some(
    (tf) =>
      (values[tf.name] as string) === "CHARGEABLE" ||
      (values[tf.name] as string) === "SPECIAL_CONTRACT",
  );
  return { pendingTypeFields, hasChargeablePending };
}

const PREAPPROVAL_ACTION_TYPES = new Set([
  "NEW_TOOL_EXCHANGE",
  "SPARE_PARTS_EXCHANGE",
  "ACCESSORIES_EXCHANGE",
]);

const PREAPPROVAL_JOB_TYPES = new Set(["WARRANTY", "SERVICE_OFFERING"]);

export function getBoschInternalPending(
  fields: Field[],
  values: Record<string, unknown>,
): { pendingTypeFields: Field[]; hasBoschInternalPending: boolean } {
  const typeFields = fields.filter((f) => f.subtype === "diagnosticType");
  const statusFields = fields.filter((f) => f.subtype === "diagnosticMaterialStatus");
  const actionType = (values.actionType as string) ?? "";
  const pendingTypeFields = typeFields.filter((_, i) => {
    const statusField = statusFields[i];
    return !statusField || (values[statusField.name] as string) !== "APPROVED";
  });
  const hasBoschInternalPending = pendingTypeFields.some((tf) => {
    const type = (values[tf.name] as string) ?? "";
    if (type === "COMMERCIAL_GOODWILL") return true;
    if (PREAPPROVAL_ACTION_TYPES.has(actionType) && PREAPPROVAL_JOB_TYPES.has(type)) return true;
    return false;
  });
  return { pendingTypeFields, hasBoschInternalPending };
}
