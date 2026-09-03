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
  postValidateClaimPrices,
  patchClaimStatusPending,
  ClaimDecisionPayload,
  BulkApproveClaimsPayload,
  ClaimPriceValidateMockContext,
} from "./action";
import { PutClaimPricesRequest, PutClaimPricesResponse } from "./claims.types";
import type {
  ClaimPriceValidateRequest,
  ClaimPricingResult,
} from "api/services/itemPolicy/itemPolicy.types";

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
  options?: UseMutationOptions<void, Error, BulkApproveClaimsPayload>,
) => {
  return useMutation({
    mutationFn: (payload: BulkApproveClaimsPayload) => postBulkApproveClaims(payload),
    ...options,
  });
};

export const useUpdateClaimPrices = (
  options?: UseMutationOptions<
    PutClaimPricesResponse,
    Error,
    { claimId: string; payload: PutClaimPricesRequest }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, payload }: { claimId: string; payload: PutClaimPricesRequest }) =>
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

/**
 * Fires POST /v1/claims/{claimId}/prices/validate (DEV-mode via priceEngineSimulator.ts,
 * see postValidateClaimPrices). No built-in onSuccess — the caller (the debounced validate
 * effect in useItemsManager.ts, Phase 3) needs full control over merging the response into
 * materials state, same reasoning as useUpdateClaimPrices does NOT apply here: this call
 * never persists anything, so there's no claim cache to invalidate.
 */
export const useValidateClaimPrices = (
  options?: UseMutationOptions<
    ClaimPricingResult,
    Error,
    {
      claimId: string;
      request: ClaimPriceValidateRequest;
      mockContext: ClaimPriceValidateMockContext;
    }
  >,
) => {
  return useMutation({
    mutationFn: ({
      claimId,
      request,
      mockContext,
    }: {
      claimId: string;
      request: ClaimPriceValidateRequest;
      mockContext: ClaimPriceValidateMockContext;
    }) => postValidateClaimPrices(claimId, request, mockContext),
    ...options,
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
