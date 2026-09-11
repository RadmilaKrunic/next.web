import type {
  ItemPolicy,
  ItemPositionPermissions,
  ItemPositionPolicy,
  PriceEditabilityRule,
} from "api/services/itemPolicy/itemPolicy.types";

export interface PolicyContext {
  position: string;
  jobType?: string;
  jobStatus?: string;
  claimStatus?: string;
  /** Key into `policy.surfaceOverrides`, e.g. "claimSpareParts". */
  surface?: string;
  discountBase?: string;
}

export interface PriceFieldPolicy {
  isEditable: boolean;
  controlledBySummary: boolean;
}

const NOT_EDITABLE: PriceFieldPolicy = { isEditable: false, controlledBySummary: false };

const normalize = (value?: string) => (value ?? "").toUpperCase();

export const getPositionPolicy = (
  policy: ItemPolicy | null,
  position: string,
): ItemPositionPolicy | null =>
  policy?.positions.find((p) => normalize(p.position) === normalize(position)) ?? null;

export const isProtectedPosition = (policy: ItemPolicy | null, position: string): boolean =>
  getPositionPolicy(policy, position)?.isProtected ?? false;

export const getPositionPermissions = (
  policy: ItemPolicy | null,
  position: string,
): ItemPositionPermissions | null => getPositionPolicy(policy, position)?.permissions ?? null;

const getContextValue = (ctx: PolicyContext, rule: PriceEditabilityRule): string => {
  if (rule.contextType === "jobType") return normalize(ctx.jobType);
  if (rule.contextType === "jobStatus") return normalize(ctx.jobStatus);
  return normalize(ctx.claimStatus);
};

const getRules = (policy: ItemPolicy, surface?: string): PriceEditabilityRule[] => {
  const override = surface ? policy.surfaceOverrides?.[surface] : undefined;
  return override?.priceEditability ?? policy.priceEditability ?? [];
};

/**
 * Resolves whether a price field on a row may be edited.
 * Rules scoped to protected positions win over the catch-all rules for the same context.
 */
export const resolvePriceFieldPolicy = (
  policy: ItemPolicy | null,
  ctx: PolicyContext,
  fieldSubType: string,
): PriceFieldPolicy => {
  if (!policy) return NOT_EDITABLE;

  const requiredMode = policy.fieldModeRestrictions?.[fieldSubType];
  if (requiredMode && ctx.discountBase && requiredMode !== ctx.discountBase) return NOT_EDITABLE;

  const isProtected = isProtectedPosition(policy, ctx.position);
  const matches = getRules(policy, ctx.surface).filter((rule) => {
    if (getContextValue(ctx, rule) !== normalize(rule.contextValue)) return false;
    if (rule.fieldSubTypes?.length && !rule.fieldSubTypes.includes(fieldSubType)) return false;
    return rule.appliesToProtectedPositionsOnly ? isProtected : true;
  });

  if (matches.length === 0) return NOT_EDITABLE;
  const specific = matches.find((rule) => rule.appliesToProtectedPositionsOnly) ?? matches[0];
  return { isEditable: specific.isEditable, controlledBySummary: specific.controlledBySummary };
};

export const isWarrantyGatedType = (policy: ItemPolicy | null, type: string): boolean =>
  policy?.warrantyGating.gatedTypes.some((t) => normalize(t) === normalize(type)) ?? false;

/** Part number + description auto-filled when a position is selected, keyed by position. */
export const getPositionAutofillMap = (
  policy: ItemPolicy | null,
  translate: (key: string) => string,
): Record<string, { partNumber: string; description: string }> => {
  const result: Record<string, { partNumber: string; description: string }> = {};
  for (const position of policy?.positions ?? []) {
    if (!position.autofill) continue;
    result[position.position] = {
      partNumber: position.autofill.partNumber,
      description: translate(position.autofill.descriptionKey),
    };
  }
  return result;
};

export const getDistributablePositions = (policy: ItemPolicy | null): Set<string> =>
  new Set(
    (policy?.positions ?? []).filter((p) => p.isDistributable).map((p) => normalize(p.position)),
  );

export const allowsPermanentDelete = (policy: ItemPolicy | null, jobStatus: string): boolean =>
  policy?.statusesWithPermanentDelete?.includes(jobStatus) ?? false;
