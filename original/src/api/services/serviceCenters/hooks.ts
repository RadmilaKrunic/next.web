import { useQuery } from "@tanstack/react-query";
import { fetchServiceCenterNames } from "./action";
import { ServiceCenterName } from "./serviceCenters.types";

export const useServiceCenterNames = () => {
  return useQuery<ServiceCenterName[]>({
    queryKey: ["serviceCenterNames"],
    queryFn: fetchServiceCenterNames,
  });
};
