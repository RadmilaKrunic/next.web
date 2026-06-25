import { useQuery } from "@tanstack/react-query";
import { fetchDynamicOptions } from "../../../api/services/dynamicOptions/dynamicApi";
import { OptionsEndpointProps } from "../../generics/Field/GenericField.types";
import { DropdownOption } from "./DynamicDropdown.types";
import { DEFAULT_STALE_TIME_MS } from "../../../utils/queryConstants";

interface UseDynamicOptionsParams {
  optionsEndpoint: OptionsEndpointProps;
  enabled?: boolean;
}

export const useDynamicOptions = ({ optionsEndpoint, enabled = true }: UseDynamicOptionsParams) => {
  const {
    data: options,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["dynamicOptions", optionsEndpoint.url, optionsEndpoint.queryParams],
    queryFn: () => {
      return fetchDynamicOptions(
        optionsEndpoint.url,
        optionsEndpoint.method,
        optionsEndpoint.queryParams,
      );
    },
    enabled,
    staleTime: DEFAULT_STALE_TIME_MS,
  });

  return {
    options: (options || []) as DropdownOption[],
    isLoading,
    error,
  };
};
