import {
  CLAIM_ACTIONS,
  CLAIM_STATUSES,
  JOB_STATUSES,
  JOB_TYPES,
  PRE_APPROVAL_ACTIONS,
  UserRole,
  type ClaimAction,
  type ClaimStatus,
  type JobStatus,
  type JobType,
  type PreApprovalAction,
} from "../domain/enums";

/** Builds a normaliser: trims + lower-cases an app value, checks membership, else `undefined`. */
const makeEnumNormalizer = <T extends string>(
  allowed: readonly T[],
): ((raw: string | null | undefined) => T | undefined) => {
  const values: ReadonlySet<string> = new Set(allowed);
  return (raw) => {
    if (!raw) return undefined;
    const normalized = raw.trim().toLowerCase();
    return values.has(normalized) ? (normalized as T) : undefined;
  };
};

/** `"READY_FOR_DIAGNOSTIC"` → `JobStatus.READY_FOR_DIAGNOSTIC`, or `undefined`. */
export const toJobStatus = makeEnumNormalizer<JobStatus>(JOB_STATUSES);
/** `"WARRANTY"` → `JobType.WARRANTY`, or `undefined`. */
export const toJobType = makeEnumNormalizer<JobType>(JOB_TYPES);
/** `"PENDING"` → `ClaimStatus.PENDING`, or `undefined`. */
export const toClaimStatus = makeEnumNormalizer<ClaimStatus>(CLAIM_STATUSES);
/** `"APPROVED"` → `ClaimAction.APPROVED`, or `undefined`. */
export const toClaimAction = makeEnumNormalizer<ClaimAction>(CLAIM_ACTIONS);
/** `"APPROVED"` → `PreApprovalAction.APPROVED`, or `undefined`. */
export const toPreApprovalAction = makeEnumNormalizer<PreApprovalAction>(PRE_APPROVAL_ACTIONS);

export interface UserRoleResolverInput {
  readonly roles?: readonly string[];
  readonly permissions?: readonly string[];
}

/** App ASC account-role ids → analytics roles. @see EmployeeOverview.utils.ts `rolesMap` */
const ROLE_MAP: Readonly<Record<string, UserRole>> = Object.freeze({
  ASC_TECHNICIAN: UserRole.ASC_TECHNICIAN,
  ASC_MANAGER: UserRole.ASC_MANAGER,
  ASC_MANAGER_WITHOUT_CLAIM: UserRole.ASC_MANAGER,
  ASC_CLAIM: UserRole.ASC_MANAGER,
});

/** Country-manager permission codes; checked only when no ASC role matched. @see Permissions.ts */
const COUNTRY_MANAGER_PERMISSIONS: ReadonlySet<string> = new Set([
  "AC_A",
  "A_WA",
  "A_CA",
  "A_SA",
  "A_GA",
]);

/**
 * Reduces roles + permissions to one {@link UserRole}. Precedence: ASC Manager ›
 * ASC Technician › country-manager › `UNKNOWN`. Overridable via the provider's `resolveRole` prop.
 */
export const resolveUserRole = (input: UserRoleResolverInput): UserRole => {
  let mappedRole: UserRole | undefined;
  for (const role of input.roles ?? []) {
    if (typeof role !== "string") continue; // tolerate malformed data
    const candidate = ROLE_MAP[role.trim().toUpperCase()];
    if (candidate === UserRole.ASC_MANAGER) return UserRole.ASC_MANAGER; // highest ASC role
    if (candidate) mappedRole = candidate;
  }
  if (mappedRole) return mappedRole;

  const permissions = input.permissions ?? [];
  if (permissions.some((permission) => COUNTRY_MANAGER_PERMISSIONS.has(permission))) {
    return UserRole.COUNTRY_MANAGER;
  }
  return UserRole.UNKNOWN;
};
