import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { User } from "types/user.type";

export function useClaimDecisionPermissions(currentStatus: string) {
  const queryClient = useQueryClient();

  const userData = queryClient.getQueryData<User>(["user"]);

  const canChangeClaimDecision = useCallback(() => {
    const data = queryClient.getQueryData<User>(["user"]);
    const hasPerformClaimDecision = data?.permissions?.includes("AC_A");
    const hasRevertClaimDecision = data?.permissions?.includes("AC_R");

    if (hasRevertClaimDecision) return true;
    if (hasPerformClaimDecision && currentStatus === "PENDING") return true;
    return false;
  }, [queryClient, currentStatus]);

  const showDecisionActions =
    userData?.permissions?.includes("AC_A") || userData?.permissions?.includes("AC_R");

  return { canChangeClaimDecision, showDecisionActions };
}
