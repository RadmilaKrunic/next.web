import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { getItemPolicyConfig } from "./action";
import { ItemPolicyConfig } from "./itemPolicy.types";

export const useItemPolicyConfig = (
  countryCode: string,
  options?: Omit<UseQueryOptions<ItemPolicyConfig, Error>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: ["itemPolicyConfig", countryCode],
    queryFn: () => getItemPolicyConfig(countryCode),
    enabled: !!countryCode,
    staleTime: Infinity,
    ...options,
  });
};
