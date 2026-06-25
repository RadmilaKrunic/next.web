import {
  useQuery,
  UseQueryOptions,
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import { DEFAULT_STALE_TIME_MS } from "../../../utils/queryConstants";
import { ClaimItem } from "modules/ClaimManagement/ClaimOverview/Claims.types";
import { Claim } from "../../../modules/ClaimManagement/ClaimList/ClaimList.types";
import {
  fetchClaimById,
  fetchClaims,
  postBulkApproveClaims,
  postClaimDecision,
  putClaimPrices,
  patchClaimStatusPending,
  ClaimDecisionPayload,
} from "./action";

export const useClaimById = (
  claimId: string,
  options?: Omit<UseQueryOptions<ClaimItem, Error>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: ["claim", claimId],
    queryFn: () => fetchClaimById(claimId),
    enabled: !!claimId,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
    staleTime: DEFAULT_STALE_TIME_MS,
    ...options,
  });
};

export const useClaims = (options?: UseQueryOptions<Claim[], Error>) => {
  return useQuery({
    queryKey: ["claims"],
    queryFn: fetchClaims,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
    staleTime: DEFAULT_STALE_TIME_MS,
    select: (data: Claim[]) => {
      return [...data].sort(
        (a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime(),
      );
    },
    ...options,
  });
};

export const useClaimDecision = (
  options?: UseMutationOptions<void, Error, { claimId: string; payload: ClaimDecisionPayload }>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, payload }: { claimId: string; payload: ClaimDecisionPayload }) =>
      postClaimDecision(claimId, payload),
    ...options,
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: ["messages", args[1].payload.jobId] });
      options?.onSuccess?.(...args);
    },
  });
};

export const useBulkApproveClaims = (
  options?: UseMutationOptions<void, Error, { claimIds: string[] }>,
) => {
  return useMutation({
    mutationFn: ({ claimIds }: { claimIds: string[] }) => postBulkApproveClaims(claimIds),
    ...options,
  });
};

export const useUpdateClaimPrices = (
  options?: UseMutationOptions<
    Record<string, unknown>,
    Error,
    { claimId: string; payload: Record<string, unknown> }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, payload }: { claimId: string; payload: Record<string, unknown> }) =>
      putClaimPrices(claimId, payload),
    ...options,
    onSuccess: (...args) => {
      // Use invalidateQueries so the cache always holds a proper GET-shaped ClaimItem.
      // setQueryData with the raw PUT response caused second-visit issues because
      // the PUT response structure differs from GET /v1/claims/{id}.
      void queryClient.invalidateQueries({ queryKey: ["claim", args[1].claimId] });
      options?.onSuccess?.(...args);
    },
  });
};

export const useClaimRequestApproval = (
  options?: UseMutationOptions<void, Error, { claimId: string; jobId?: string }>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, jobId }: { claimId: string; jobId?: string }) =>
      patchClaimStatusPending(claimId, jobId),
    ...options,
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: ["claim", args[1].claimId] });
      options?.onSuccess?.(...args);
    },
  });
};
