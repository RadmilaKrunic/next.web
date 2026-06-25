import { useQuery } from "@tanstack/react-query";
import { getOrderById } from "./orders";
import { Order } from "./orders.types";

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
