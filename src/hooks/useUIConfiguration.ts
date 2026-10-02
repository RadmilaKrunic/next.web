import { useQueries, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { getUIConfiguration, UIConfiguration } from "api/services/uiConfiguration/action";
import { HeaderUserData } from "api/services/header/action";

/**
 * Resolves the list of country codes the current user has UI configurations for.
 * Falls back to the user's own `countryCode` when `availableCountries` is not
 * provided by `/auth/me` (single-country accounts).
 */
export function getAvailableCountryCodes(user?: HeaderUserData | null): string[] {
  if (!user) return [];
  const countries = new Set<string>();
  if (user.countryCode) countries.add(user.countryCode);
  (user.availableCountries || []).forEach((code) => {
    if (code) countries.add(code);
  });
  return Array.from(countries);
}

/**
 * Prefetches and caches the UI configuration for every country the user has
 * access to, keyed the same way the rest of the app already reads UI
 * configuration: ["UIConfiguration", countryCode]. Intended to be called once
 * during app initialization (see App.tsx).
 */
export function useAvailableUIConfigurations(user?: HeaderUserData | null) {
  const countryCodes = getAvailableCountryCodes(user);

  return useQueries({
    queries: countryCodes.map((countryCode) => ({
      queryKey: ["UIConfiguration", countryCode],
      queryFn: () => getUIConfiguration(countryCode),
      staleTime: Infinity,
      retry: false,
    })),
  });
}

export interface ResourceUIConfigurationResult {
  uiConfiguration: UIConfiguration | undefined;
  countryCode: string | undefined;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Resolves the UI configuration that must be used for a given resource.
 *
 * Selection rules:
 * 1. If `resourceCountryCode` is provided, use that country's configuration.
 * 2. Otherwise, fall back to the current user's default `countryCode`.
 * 3. If a matching configuration cannot be found/loaded, `isError` is set -
 *    callers must NOT silently fall back to another country's configuration.
 *
 */
export function useResourceUIConfiguration(
  resourceCountryCode?: string | null,
): ResourceUIConfigurationResult {
  const queryClient = useQueryClient();
  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const countryCode = resourceCountryCode || user?.countryCode || undefined;

  const query: UseQueryResult<UIConfiguration, Error> = useQuery({
    queryKey: ["UIConfiguration", countryCode],
    queryFn: () => getUIConfiguration(countryCode || ""),
    staleTime: Infinity,
    enabled: !!countryCode,
    retry: false,
  });

  return {
    uiConfiguration: query.data,
    countryCode,
    isLoading: !!countryCode && query.isLoading,
    isError: !countryCode || query.isError,
  };
}
