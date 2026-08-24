import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { getItemRulesConfig } from "./action";
import { ItemRulesConfig } from "./itemRules.types";

export const useItemRulesConfig = (
  countryCode: string,
  options?: Omit<UseQueryOptions<ItemRulesConfig, Error>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: ["itemRulesConfig", countryCode],
    queryFn: () => getItemRulesConfig(countryCode),
    enabled: !!countryCode,
    staleTime: Infinity,
    ...options,
  });
};
