import type { TFunction } from "i18next";
import Field from "components/generics/Field/GenericField.types";
import type { ItemPolicy } from "api/services/itemPolicy/itemPolicy.types";
import { getPositionAutofillMap } from "utils/itemPolicy";

export function computeIsChargeable(
  allFields: Field[],
  values: Record<string, unknown>,
): boolean | null {
  const typeFields = allFields.filter((f) => f.subtype === "diagnosticType");
  if (typeFields.length === 0) return null;
  return typeFields.some((f) => (values[f.name] as string) === "CHARGEABLE");
}

/**
 * WARRANTY/SERVICE_OFFERING — the same pairing `data/itemPolicy*.json`'s
 * `warrantyGating.gatedTypes` describes (see `utils/itemPolicy.ts`'s `isWarrantyGatedType`).
 * Kept as a hardcoded fallback here and in `SparePartsRow.tsx`/`ClaimSparePartsRow.tsx`'s
 * type-option-disabling logic for when policy isn't loaded — not wired to the policy-driven
 * resolver yet, so this stays the single source for the hardcoded value.
 */
export const WARRANTY_GATED_TYPES = new Set(["WARRANTY", "SERVICE_OFFERING"]);

export function hasWarrantyOrProServiceItems(
  allFields: Field[],
  values: Record<string, unknown>,
): boolean {
  const typeFields = allFields.filter((f) => f.subtype === "diagnosticType");
  return typeFields.some((f) => WARRANTY_GATED_TYPES.has((values[f.name] as string) ?? ""));
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

export const PREAPPROVAL_ACTION_TYPES = new Set([
  "NEW_TOOL_EXCHANGE",
  "SPARE_PARTS_EXCHANGE",
  "ACCESSORIES_EXCHANGE",
]);

export const PREAPPROVAL_JOB_TYPES = new Set(["WARRANTY", "SERVICE_OFFERING"]);

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

export const getPositionAutofill = (
  t: TFunction<"translation", "app">,
  policy?: ItemPolicy | null,
): Record<string, { partNumber: string; description: string }> => {
  if (policy) return getPositionAutofillMap(policy, t);
  return {
    LA: { partNumber: "1609888887", description: t("labourCost") },
    FR: { partNumber: "1609888888", description: t("freightCost") },
  };
};
