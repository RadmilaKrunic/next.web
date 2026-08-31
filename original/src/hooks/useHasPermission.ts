import { useQueryClient } from "@tanstack/react-query";
import { User } from "types/user.type";

/**
 * Returns true when the current user satisfies the given permissions requirement.
 * - If `permissions` is empty or undefined, access is always granted.
 * - Otherwise the user must hold at least one of the listed permissions.
 */
export function useHasPermission(permissions: string[] | undefined): boolean {
  const queryClient = useQueryClient();
  const userData = queryClient.getQueryData<User>(["user"]);

  if (!permissions || permissions.length === 0) {
    return true;
  }

  return permissions.some((p) => userData?.permissions.includes(p)) ?? false;
}
