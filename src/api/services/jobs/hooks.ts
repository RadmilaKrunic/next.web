import {
  useQuery,
  UseQueryOptions,
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import { DEFAULT_GC_TIME_MS, DEFAULT_STALE_TIME_MS } from "../../../utils/queryConstants";
import { Job, Message, Attachment } from "modules/JobManagement/JobList/JobList.types";
import {
  fetchJobs,
  fetchJobById,
  fetchMessages,
  fetchJobMessages,
  patchJobByJobId,
  fetchDiagnosticByJobId,
  fetchSpecialMaterials,
  postJobStatus,
  postCustomerData,
  postJobStatusStartDiagnostic,
  postToggleJobHold,
  postValidateAndSave,
  postDiagnostic,
  type ValidateAndSaveResponse,
  postRepairApproval,
  postInternalApprovalRequest,
  postStartReview,
  postStartRepair,
  postFinishRepair,
  postToolDelivered,
  postCreateCostEstimate,
  postCustomerAnswer,
  updateJobAttachments,
} from "./action";
import { SpecialMaterial } from "modules/JobManagement/JobOverview/AddSpecialMaterialModal/SpecialMeterialItem/SpecialMaterialItem";

export const useJobs = (options?: UseQueryOptions<Job[], Error>) => {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
    refetchOnWindowFocus: false,
    staleTime: DEFAULT_STALE_TIME_MS,
    refetchOnMount: "always",
    select: (data: Job[]) => {
      return [...data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    },
    ...options,
  });
};

export const useMessages = (
  jobId: string,
  messageNumber?: number,
  entityType: "job" | "claim" = "job",
  options?: UseQueryOptions<Message[], Error>,
) => {
  return useQuery({
    queryKey: ["messages", jobId, entityType],
    queryFn: () =>
      entityType === "claim"
        ? fetchMessages(jobId, messageNumber)
        : fetchJobMessages(jobId, messageNumber),
    enabled: !!jobId,
    refetchOnWindowFocus: true,
    staleTime: 0,
    ...options,
  });
};

export const useJobById = (jobId: string) => {
  return useQuery({
    queryKey: ["job", jobId],
    queryFn: () => fetchJobById(jobId),
    enabled: !!jobId,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: DEFAULT_STALE_TIME_MS,
    gcTime: DEFAULT_GC_TIME_MS,
  });
};

export const usePatchJobById = (
  options?: UseMutationOptions<void, Error, { jobId: string; data: Partial<Job> }>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, data }: { jobId: string; data: Partial<Job> }) =>
      patchJobByJobId(jobId, data),
    ...options,
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
      options?.onSuccess?.(...args);
    },
  });
};

export const useDiagnosticByJobId = (
  jobId: string,
  options?: Omit<UseQueryOptions<unknown, Error>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: ["diagnostic", jobId],
    queryFn: () => fetchDiagnosticByJobId(jobId),
    enabled: !!jobId,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: DEFAULT_STALE_TIME_MS,
    gcTime: DEFAULT_GC_TIME_MS,
    ...options,
  });
};

export const usePostJobStatus = (
  options?: UseMutationOptions<void, Error, { jobId: string; jobStatus: string }>,
) => {
  return useMutation({
    mutationFn: ({ jobId, jobStatus }: { jobId: string; jobStatus: string }) =>
      postJobStatus(jobId, jobStatus),
    ...options,
  });
};

export const useSpecialMaterials = (
  countryCode: string,
  options?: UseQueryOptions<SpecialMaterial[], Error>,
) => {
  return useQuery({
    queryKey: ["special-materials", countryCode],
    queryFn: () => fetchSpecialMaterials(countryCode),
    enabled: !!countryCode,
    refetchOnWindowFocus: false,
    staleTime: DEFAULT_STALE_TIME_MS,
    ...options,
  });
};

export const usePostCustomerData = (
  options?: UseMutationOptions<void, Error, { orderId: string; payload: Record<string, any> }>,
) => {
  return useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: Record<string, any> }) =>
      postCustomerData(orderId, payload),
    ...options,
  });
};

export const usePostJobStatusStartDiagnostic = (
  options?: UseMutationOptions<void, Error, { jobId: string }>,
) => {
  return useMutation({
    mutationFn: ({ jobId }: { jobId: string }) => postJobStatusStartDiagnostic(jobId),
    ...options,
  });
};

export const useToggleJobHold = (options?: UseMutationOptions<void, Error, { jobId: string }>) => {
  return useMutation({
    mutationFn: ({ jobId }: { jobId: string }) => postToggleJobHold(jobId),
    ...options,
  });
};

export const usePostRepairApproval = (
  options?: UseMutationOptions<void, Error, { jobId: string }>,
) => {
  return useMutation({
    mutationFn: ({ jobId }: { jobId: string }) => postRepairApproval(jobId),
    ...options,
  });
};

export const usePostInternalApprovalRequest = (
  options?: UseMutationOptions<void, Error, { jobId: string }>,
) => {
  return useMutation({
    mutationFn: ({ jobId }: { jobId: string }) => postInternalApprovalRequest(jobId),
    ...options,
  });
};

export const usePostStartReview = (
  options?: UseMutationOptions<void, Error, { jobId: string }>,
) => {
  return useMutation({
    mutationFn: ({ jobId }: { jobId: string }) => postStartReview(jobId),
    ...options,
  });
};

export const usePostStartRepair = (
  options?: UseMutationOptions<void, Error, { jobId: string }>,
) => {
  return useMutation({
    mutationFn: ({ jobId }: { jobId: string }) => postStartRepair(jobId),
    ...options,
  });
};

export const usePostFinishRepair = (
  options?: UseMutationOptions<void, Error, { jobId: string }>,
) => {
  return useMutation({
    mutationFn: ({ jobId }: { jobId: string }) => postFinishRepair(jobId),
    ...options,
  });
};

export const usePostToolDelivered = (
  options?: UseMutationOptions<void, Error, { jobId: string }>,
) => {
  return useMutation({
    mutationFn: ({ jobId }: { jobId: string }) => postToolDelivered(jobId),
    ...options,
  });
};

export const usePostValidateAndSave = (
  options?: UseMutationOptions<
    ValidateAndSaveResponse,
    Error,
    { jobId: string; payload: Record<string, unknown> }
  >,
) => {
  return useMutation({
    mutationFn: ({ jobId, payload }: { jobId: string; payload: Record<string, unknown> }) =>
      postValidateAndSave(jobId, payload),
    ...options,
  });
};

export const usePostDiagnostic = (
  options?: UseMutationOptions<void, Error, { jobId: string; payload: Record<string, unknown> }>,
) => {
  return useMutation({
    mutationFn: ({ jobId, payload }: { jobId: string; payload: Record<string, unknown> }) =>
      postDiagnostic(jobId, payload),
    ...options,
  });
};

export const usePostCreateCostEstimate = (
  options?: UseMutationOptions<void, Error, { jobId: string }>,
) => {
  return useMutation({
    mutationFn: ({ jobId }: { jobId: string }) => postCreateCostEstimate(jobId),
    ...options,
  });
};

export const usePostCustomerAnswer = (
  options?: UseMutationOptions<void, Error, { jobId: string; answer: string }>,
) => {
  return useMutation({
    mutationFn: ({ jobId, answer }: { jobId: string; answer: string }) =>
      postCustomerAnswer(jobId, answer),
    ...options,
  });
};

export const useUpdateJobAttachments = (
  options?: UseMutationOptions<void, Error, { jobId: string; attachments: Attachment[] }>,
) => {
  return useMutation({
    mutationFn: ({ jobId, attachments }: { jobId: string; attachments: Attachment[] }) =>
      updateJobAttachments(jobId, attachments),
    ...options,
  });
};
