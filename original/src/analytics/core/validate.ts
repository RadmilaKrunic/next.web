import {
  ANALYTICS_ENVIRONMENTS,
  AnalyticsEventName,
  CLAIM_ACTIONS,
  CLAIM_STATUSES,
  COMPLETION_TYPES,
  JOB_STATUSES,
  JOB_TYPES,
  NOTE_CONTEXTS,
  PRE_APPROVAL_ACTIONS,
  USER_ROLES,
} from "../domain/enums";
import { AnalyticsParameterKey, type DataLayerEvent, type DataLayerValue } from "../domain/types";
import { EVENT_REGISTRY } from "../config/registries";

export interface ValidationResult {
  /** `true` when the event satisfies its registry contract. */
  readonly valid: boolean;
  /** Human-readable problems; empty when valid. */
  readonly issues: readonly string[];
}

type ParameterConstraint =
  | { readonly kind: "enum"; readonly values: readonly string[] }
  | { readonly kind: "number" }
  | { readonly kind: "string" };

/** Per-parameter value constraints; unlisted parameters default to non-empty string. */
const PARAMETER_CONSTRAINTS: Readonly<Partial<Record<AnalyticsParameterKey, ParameterConstraint>>> =
  Object.freeze({
    [AnalyticsParameterKey.ENVIRONMENT]: { kind: "enum", values: ANALYTICS_ENVIRONMENTS },
    [AnalyticsParameterKey.USER_ROLE]: { kind: "enum", values: USER_ROLES },
    [AnalyticsParameterKey.JOB_STATUS]: { kind: "enum", values: JOB_STATUSES },
    [AnalyticsParameterKey.CLAIM_STATUS]: { kind: "enum", values: CLAIM_STATUSES },
    [AnalyticsParameterKey.JOB_TYPE]: { kind: "enum", values: JOB_TYPES },
    [AnalyticsParameterKey.CLAIM_ACTION]: { kind: "enum", values: CLAIM_ACTIONS },
    [AnalyticsParameterKey.PRE_APPROVAL_ACTION]: { kind: "enum", values: PRE_APPROVAL_ACTIONS },
    [AnalyticsParameterKey.COMPLETION_TYPE]: { kind: "enum", values: COMPLETION_TYPES },
    [AnalyticsParameterKey.NOTE_CONTEXT]: { kind: "enum", values: NOTE_CONTEXTS },
    [AnalyticsParameterKey.JOB_CREATION_DURATION_SECONDS]: { kind: "number" },
    [AnalyticsParameterKey.CLAIM_REVIEW_DURATION_SECONDS]: { kind: "number" },
    [AnalyticsParameterKey.PRE_APPROVAL_REVIEW_DURATION_SECONDS]: { kind: "number" },
  });

const KNOWN_EVENT_NAMES: ReadonlySet<string> = new Set(Object.values(AnalyticsEventName));
const EVENT_KEY: string = AnalyticsParameterKey.EVENT;

/**
 * Dev/QA contract guard: checks a {@link DataLayerEvent} against the registry's required
 * parameters and per-parameter value constraints. Pure and never throws; skipped entirely
 * in PROD (see {@link AnalyticsTracker}).
 */
export class AnalyticsEventValidator {
  validate(event: DataLayerEvent): ValidationResult {
    const eventName = event.event;
    if (!KNOWN_EVENT_NAMES.has(eventName)) {
      return { valid: false, issues: [`Unknown event name "${String(eventName)}".`] };
    }

    const issues: string[] = [];
    const missing = new Set<string>();
    for (const key of EVENT_REGISTRY[eventName].requiredParameters) {
      if (!isPresent(event[key])) {
        missing.add(key);
        issues.push(`Missing required parameter "${key}".`);
      }
    }

    for (const [key, value] of Object.entries(event)) {
      if (key === EVENT_KEY || value === undefined || value === null) continue;
      if (missing.has(key)) continue; // already reported above
      collectValueIssue(key as AnalyticsParameterKey, value, issues);
    }

    return { valid: issues.length === 0, issues };
  }
}

const isPresent = (value: DataLayerValue | undefined): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
};

const collectValueIssue = (
  key: AnalyticsParameterKey,
  value: DataLayerValue,
  issues: string[],
): void => {
  const constraint = PARAMETER_CONSTRAINTS[key];

  if (constraint?.kind === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      issues.push(`Parameter "${key}" must be a finite number.`);
    }
    return;
  }
  if (constraint?.kind === "enum") {
    if (typeof value !== "string" || !constraint.values.includes(value)) {
      issues.push(
        `Parameter "${key}" has invalid value "${String(value)}". Allowed: ${constraint.values.join(", ")}.`,
      );
    }
    return;
  }
  if (typeof value !== "string") {
    issues.push(`Parameter "${key}" must be a string.`);
  } else if (value.trim().length === 0) {
    issues.push(`Parameter "${key}" must not be empty.`);
  }
};
