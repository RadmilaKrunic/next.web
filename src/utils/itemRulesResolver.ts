import {
  ItemPolicyConfig,
  PositionPermissions,
  PositionPolicy,
} from "api/services/itemPolicy/itemPolicy.types";
import type {
  AllowedPosition,
  DiagnosticsRuleEntry,
  discountBase as DiscountBase,
} from "api/services/countryConfiguration/countryConfiguration";

export type ItemSurface = "jobDiagnostics" | "claimDiagnosticsReadOnly" | "claimSpareParts";

/**
 * Single kill-switch for all item-rules-resolver-driven code paths (see
 * proposals/items-and-prices-refactor.md §4). Defaults to false: every gated call site
 * falls back to its pre-existing hardcoded/inline logic. Flip to true (or wire to an env
 * var / remote config later) once the resolver-driven paths are trusted, so a single
 * change can roll the whole Phase 2 migration back if something looks wrong.
 */
export const ENABLE_ITEM_RULES_RESOLVER = false;

/**
 * Single kill-switch for the Phase 3 backend-authoritative price-validate call (see
 * proposals/items-and-prices-refactor.md §10/§15 and
 * proposals/items-and-prices-backend-api-spec.md API-2/API-3). Defaults to false: every
 * gated call site keeps today's purely client-side price calculation
 * (useSparePartPriceCalculation.ts), with no debounced validate call and no dependency on
 * priceEngineSimulator.ts. Flip to true only after a real test run (unavailable in the
 * sandbox this flag was built in) confirms the debounce/stale-response-discard/merge logic
 * end-to-end — this phase ships dark, same rollout discipline as
 * ENABLE_ITEM_RULES_RESOLVER above.
 */
export const ENABLE_PRICE_VALIDATE_API = false;

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

function findEditabilityRule(
  config: ItemPolicyConfig,
  args: { position: string; context: "jobType" | "claimStatus" | "isNewRow"; contextValue: string },
) {
  const isProtected = isPositionProtected(config, args.position);
  return config.editability.find(
    (r) =>
      r.contextType === args.context &&
      r.contextValue === args.contextValue &&
      (!r.appliesToProtectedPositionsOnly || isProtected),
  );
}

/**
 * Resolves whether price fields are editable for a row. `discountBase` decides which
 * single field (totalAmount vs netAmount) is exposed when editable — that's universal
 * GROSS/NET math (see priceCalculator.ts), not a per-country policy difference, so it's
 * a parameter here rather than stored per EditabilityRule.
 */
export function resolveEditability(
  config: ItemPolicyConfig,
  args: { position: string; context: "jobType" | "claimStatus" | "isNewRow"; contextValue: string },
  discountBase: DiscountBase = "GROSS_PRICE",
): PriceFieldEditability {
  const isEditable = findEditabilityRule(config, args)?.isEditable ?? false;
  if (!isEditable) return NOT_EDITABLE;
  return {
    discount: true,
    totalAmount: discountBase !== "NET_PRICE",
    netAmount: discountBase === "NET_PRICE",
  };
}

export function isSummaryControlledRow(
  config: ItemPolicyConfig,
  args: { position: string; context: "jobType" | "claimStatus" | "isNewRow"; contextValue: string },
): boolean {
  return findEditabilityRule(config, args)?.controlledBySummary ?? false;
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
