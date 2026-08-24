import { useQuery, UseQueryOptions, keepPreviousData } from "@tanstack/react-query";
import { DEFAULT_STALE_TIME_MS } from "utils/queryConstants";
import {
  Reimbursement,
  ReimbursementPerAscResponse,
  ReimbursementResponse,
  ReimbursementAscResponse,
} from "./reimbursements.types";
import {
  fetchReimbursements,
  fetchReimbursementsByAscId,
  fetchReimbursementClaims,
  fetchReimbursementASCs,
} from "./action";

export const useReimbursementASCs = (
  searchTerm?: string,
  page?: number,
  size?: number,
  options?: UseQueryOptions<ReimbursementAscResponse, Error>,
) => {
  const queryKey = ["reimbursementASCs", searchTerm, page, size].filter((v) => v !== undefined);

  return useQuery({
    queryKey,
    queryFn: () => fetchReimbursementASCs(searchTerm, page, size),
    refetchOnWindowFocus: false,
    staleTime: DEFAULT_STALE_TIME_MS,
    refetchOnMount: true,
    placeholderData: keepPreviousData,
    ...options,
  });
};

export const useReimbursements = (
  fromDate?: Date,
  toDate?: Date,
  searchTerm?: string,
  page?: number,
  size?: number,
  options?: UseQueryOptions<ReimbursementResponse, Error>,
) => {
  const queryKey = [
    "reimbursements",
    fromDate?.toISOString(),
    toDate?.toISOString(),
    searchTerm,
    page,
    size,
  ].filter((v) => v !== undefined);

  return useQuery({
    queryKey,
    queryFn: () => fetchReimbursements(fromDate, toDate, searchTerm, page, size),
    refetchOnWindowFocus: false,
    staleTime: DEFAULT_STALE_TIME_MS,
    refetchOnMount: true,
    ...options,
  });
};

export const useReimbursementsByAscId = (
  ascId: string,
  fromDate?: Date,
  toDate?: Date,
  searchTerm?: string,
  page?: number,
  size?: number,
  options?: UseQueryOptions<ReimbursementPerAscResponse, Error>,
) => {
  const queryKey = [
    "reimbursements",
    "asc",
    ascId,
    fromDate?.toISOString(),
    toDate?.toISOString(),
    searchTerm,
    page,
    size,
  ].filter((v) => v !== undefined);

  return useQuery({
    queryKey,
    queryFn: () => fetchReimbursementsByAscId(ascId, fromDate, toDate, searchTerm, page, size),
    enabled: !!ascId,
    refetchOnWindowFocus: false,
    staleTime: DEFAULT_STALE_TIME_MS,
    refetchOnMount: false,
    ...options,
  });
};

export const useReimbursementClaims = (
  reimbursementId: string,
  options?: UseQueryOptions<Reimbursement, Error>,
) => {
  return useQuery({
    queryKey: ["reimbursementClaims", reimbursementId],
    queryFn: () => fetchReimbursementClaims(reimbursementId),
    enabled: !!reimbursementId,
    refetchOnWindowFocus: false,
    staleTime: DEFAULT_STALE_TIME_MS,
    refetchOnMount: false,
    ...options,
  });
};
