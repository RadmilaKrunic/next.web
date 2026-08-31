import { useQuery, UseQueryOptions, useMutation, UseMutationOptions } from "@tanstack/react-query";
import { DEFAULT_STALE_TIME_MS } from "../../../utils/queryConstants";
import { GoodwillApproval } from "modules/ClaimManagement/ApprovalList/ApprovalList.types";
import { fetchApprovals, updateApprovalStatus, approveJobs } from "./action";
import { PreApprovalDecision } from "./approvals.types";

export const useApprovals = (options?: UseQueryOptions<GoodwillApproval[], Error>) => {
  return useQuery({
    queryKey: ["approvals"],
    queryFn: fetchApprovals,
    refetchOnWindowFocus: false,
    staleTime: DEFAULT_STALE_TIME_MS,
    refetchOnMount: "always",
    select: (data: GoodwillApproval[]) => {
      return [...data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    },
    ...options,
  });
};

export const useUpdateApprovalStatus = (
  options?: UseMutationOptions<void, Error, PreApprovalDecision>,
) => {
  return useMutation<void, Error, PreApprovalDecision>({
    mutationFn: updateApprovalStatus,
    ...options,
  });
};

export const useApproveJobs = (options?: UseMutationOptions<void, Error, { jobIds: string[] }>) => {
  return useMutation({
    mutationFn: ({ jobIds }: { jobIds: string[] }) => approveJobs(jobIds),
    ...options,
  });
};
