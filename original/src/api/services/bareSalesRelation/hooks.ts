import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { fetchBareSalesRelation } from "./action";
import { BareSalesRelationParams, BareSalesRelationResponse } from "./bareSalesRelation.types";

export const useBareSalesRelation = (
  params: BareSalesRelationParams,
  options?: Partial<UseQueryOptions<BareSalesRelationResponse>>,
) => {
  return useQuery<BareSalesRelationResponse>({
    queryKey: ["bareSalesRelation", params.bareTool, params.countryCode, params.language],
    queryFn: () => fetchBareSalesRelation(params),
    enabled: !!(params.bareTool && params.countryCode && params.language),
    refetchOnWindowFocus: false,
    retry: false,
    ...options,
  });
};
