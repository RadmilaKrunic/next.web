import { useQuery } from "@tanstack/react-query";
import { getItemPolicy } from "./action";

export const itemPolicyQueryKey = (countryCode: string) => ["itemPolicy", countryCode];

export const useItemPolicyQuery = (countryCode: string, enabled = true) =>
  useQuery({
    queryKey: itemPolicyQueryKey(countryCode),
    queryFn: () => getItemPolicy(countryCode),
    staleTime: Infinity,
    enabled: enabled && !!countryCode,
  });
