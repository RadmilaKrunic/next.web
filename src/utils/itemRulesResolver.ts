import {
  ItemRulesConfig,
  PositionRule,
  EditabilityRule,
} from "api/services/itemRules/itemRules.types";

export interface PriceFieldEditability {
  discount: boolean;
  totalAmount: boolean;
  netAmount: boolean;
}

export type ItemRulesSurface = "jobDiagnostics" | "claimDiagnosticsReadOnly" | "claimSpareParts";

/** Merges a surface's overrides on top of the base config (shallow, per top-level key). */
export function selectConfigForSurface(
  config: ItemRulesConfig,
  surface?: ItemRulesSurface,
): ItemRulesConfig {
  if (!surface) return config;
  const override = config.surfaceOverrides[surface];
  if (!override) return config;
  return { ...config, ...override };
}

export function resolvePositionRule(config: ItemRulesConfig, position: string): PositionRule | null {
  const normalized = (position ?? "").toUpperCase();
  return config.positions.find((p) => p.position === normalized) ?? null;
}

export function isPositionProtected(config: ItemRulesConfig, position: string): boolean {
  return resolvePositionRule(config, position)?.isProtected ?? false;
}

function findEditabilityRule(
  config: ItemRulesConfig,
  context: "jobType" | "claimStatus",
  contextValue: string,
  protectedPosition: boolean,
): EditabilityRule | null {
  const matches = config.editability.filter(
    (r) => r.contextType === context && r.contextValue === contextValue,
  );
  if (protectedPosition) {
    return (
      matches.find((r) => r.appliesToProtectedPositionsOnly) ??
      matches.find((r) => !r.appliesToProtectedPositionsOnly) ??
      null
    );
  }
  return matches.find((r) => !r.appliesToProtectedPositionsOnly) ?? null;
}

const NOT_EDITABLE: PriceFieldEditability = {
  discount: false,
  totalAmount: false,
  netAmount: false,
};

export function resolveEditability(
  config: ItemRulesConfig,
  args: { position: string; context: "jobType" | "claimStatus"; contextValue: string },
): PriceFieldEditability {
  const protectedPosition = isPositionProtected(config, args.position);
  const rule = findEditabilityRule(config, args.context, args.contextValue, protectedPosition);
  return rule ? rule.fields : NOT_EDITABLE;
}

export function isSummaryControlledRow(
  config: ItemRulesConfig,
  args: { position: string; context: "jobType" | "claimStatus"; contextValue: string },
): boolean {
  const protectedPosition = isPositionProtected(config, args.position);
  const rule = findEditabilityRule(config, args.context, args.contextValue, protectedPosition);
  return rule?.controlledBySummary ?? false;
}

export function resolveAutomaticRows(
  config: ItemRulesConfig,
  actionType: string,
  jobType: string,
): string[] {
  const rule = config.automaticRows.find(
    (r) => r.actionType === actionType && r.jobType === jobType,
  );
  return rule?.automaticPositions ?? [];
}
