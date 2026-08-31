import { useMutation, UseMutationOptions, useQuery } from "@tanstack/react-query";
import { getOrderById, postWarrantyCheck } from "./orders";
import { Order, WarrantyCheckRequest, WarrantyCheckResponse } from "./orders.types";

export const useOrderById = (orderId: string | undefined) => {
  return useQuery<Order | null, Error>({
    queryKey: ["order", orderId],
    queryFn: () => {
      if (!orderId) {
        return Promise.resolve(null);
      }
      return getOrderById(orderId);
    },
    enabled: !!orderId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    retry: 1,
  });
};

export const usePostWarrantyCheck = (
  options?: UseMutationOptions<WarrantyCheckResponse | null, Error, WarrantyCheckRequest>,
) => {
  return useMutation({
    mutationFn: postWarrantyCheck,
    ...options,
  });
};
