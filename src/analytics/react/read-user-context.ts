import type { QueryClient } from "@tanstack/react-query";
import type { UserRole } from "../domain/enums";
import { resolveUserRole, type UserRoleResolverInput } from "../core/mappers";

interface BassUserSnapshot {
  readonly roles?: readonly string[];
  readonly permissions?: readonly string[];
  readonly countryCode?: string | null;
  readonly ascId?: string | null;
}

export interface ResolvedUserContext {
  readonly userRole: UserRole;
  readonly countryCode?: string;
  readonly ascId?: string;
}

export const readUserContext = (
  queryClient: QueryClient,
  resolveRole: (input: UserRoleResolverInput) => UserRole = resolveUserRole,
  userQueryKey: readonly string[] = ["user"],
): ResolvedUserContext => {
  const user = queryClient.getQueryData<BassUserSnapshot>(userQueryKey);
  return {
    userRole: resolveRole({ roles: user?.roles, permissions: user?.permissions }),
    countryCode: user?.countryCode ?? undefined,
    ascId: user?.ascId ?? undefined,
  };
};
