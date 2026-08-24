import {
  ItemPolicyConfig,
  PositionPermissions,
  PositionPolicy,
} from "api/services/itemPolicy/itemPolicy.types";
import type {
  AllowedPosition,
  DiagnosticsRuleEntry,
} from "api/services/countryConfiguration/countryConfiguration";

export type ItemSurface = "jobDiagnostics" | "claimDiagnosticsReadOnly" | "claimSpareParts";

/** Merges a surface's override on top of the base policy config (shallow, per top-level key). */
export function selectConfigForSurface(
  config: ItemPolicyConfig,
  surface?: ItemSurface,
): ItemPolicyConfig {
  if (!surface) return config;
  const override = config.surfaceOverrides[surface];
  if (!override) return config;
  return { ...config, ...override };
}

export function resolvePositionRule(
  config: ItemPolicyConfig,
  position: string,
): PositionPolicy | null {
  const normalized = (position ?? "").toUpperCase();
  return config.positions.find((p) => p.position.toUpperCase() === normalized) ?? null;
}

export function isPositionProtected(config: ItemPolicyConfig, position: string): boolean {
  return resolvePositionRule(config, position)?.isProtected ?? false;
}

export function resolvePositionPermissions(
  config: ItemPolicyConfig,
  position: string,
): PositionPermissions | null {
  return resolvePositionRule(config, position)?.permissions ?? null;
}

export interface PriceFieldEditability {
  discount: boolean;
  totalAmount: boolean;
  netAmount: boolean;
}

const NOT_EDITABLE: PriceFieldEditability = {
  discount: false,
  totalAmount: false,
  netAmount: false,
};

export function resolveEditability(
  config: ItemPolicyConfig,
  args: { position: string; context: "jobType" | "claimStatus"; contextValue: string },
): PriceFieldEditability {
  const isProtected = isPositionProtected(config, args.position);
  const rule = config.editability.find(
    (r) =>
      r.contextType === args.context &&
      r.contextValue === args.contextValue &&
      (!r.appliesToProtectedPositionsOnly || isProtected),
  );
  return rule ? rule.fields : NOT_EDITABLE;
}

export function isSummaryControlledRow(
  config: ItemPolicyConfig,
  args: { position: string; context: "jobType" | "claimStatus"; contextValue: string },
): boolean {
  const isProtected = isPositionProtected(config, args.position);
  const rule = config.editability.find(
    (r) =>
      r.contextType === args.context &&
      r.contextValue === args.contextValue &&
      (!r.appliesToProtectedPositionsOnly || isProtected),
  );
  return rule?.controlledBySummary ?? false;
}

// ── Resolvers over the real, already-existing DiagnosticsRuleEntry[] shape
// (CountryConfig.diagnosticsConfiguration.rules) — no new backend data needed for these. ──

function findRule(
  rules: DiagnosticsRuleEntry[],
  actionType: string,
  jobType: string,
): DiagnosticsRuleEntry | undefined {
  return rules.find((r) => r.actionType === actionType && r.jobType === jobType);
}

export function resolveAutomaticRows(
  rules: DiagnosticsRuleEntry[],
  actionType: string,
  jobType: string,
): string[] {
  return findRule(rules, actionType, jobType)?.rule.automaticRows ?? [];
}

export function resolveAllowedPositions(
  rules: DiagnosticsRuleEntry[],
  actionType: string,
  jobType: string,
): AllowedPosition[] {
  return findRule(rules, actionType, jobType)?.rule.allowedPositions ?? [];
}

export function resolveEnforceSparepartExists(
  rules: DiagnosticsRuleEntry[],
  actionType: string,
  jobType: string,
): boolean {
  return findRule(rules, actionType, jobType)?.rule.enforceSparepartExists ?? false;
}
