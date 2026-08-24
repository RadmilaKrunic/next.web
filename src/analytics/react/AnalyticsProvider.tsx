import { useCallback, useMemo, useRef, type ReactElement, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AnalyticsContext } from "./analytics-context";
import { readUserContext } from "./read-user-context";
import { useVirtualPageViews } from "./useVirtualPageViews";
import { createAnalytics, type Analytics, type AnalyticsContextSource } from "../core/analytics";
import { resolveVirtualPage } from "../core/virtual-pages";
import { readDebugOverride, resolveAnalyticsConfig, type AnalyticsConfig } from "../config/config";
import type { UserRoleResolverInput } from "../core/mappers";
import type { AnalyticsTransport } from "../infra/data-layer";
import type { AnalyticsClock } from "../infra/time";
import type { AnalyticsLogger } from "../infra/logger";
import type { AnalyticsContextSnapshot, VirtualPageDefinition } from "../domain/types";
import type { UserRole } from "../domain/enums";

export interface AnalyticsProviderProps {
  readonly children: ReactNode;
  readonly config?: AnalyticsConfig;
  readonly transport?: AnalyticsTransport;
  readonly clock?: AnalyticsClock;
  readonly logger?: AnalyticsLogger;
  readonly resolveRole?: (input: UserRoleResolverInput) => UserRole;
  readonly userQueryKey?: readonly string[];
  readonly disableAutomaticPageViews?: boolean;
}

export const AnalyticsProvider = ({
  children,
  config: configProp,
  transport,
  clock,
  logger,
  resolveRole,
  userQueryKey = ["user"],
  disableAutomaticPageViews = false,
}: AnalyticsProviderProps): ReactElement => {
  const queryClient = useQueryClient();
  const { i18n } = useTranslation();
  const i18nRef = useRef(i18n);
  i18nRef.current = i18n;
  const currentPageRef = useRef<VirtualPageDefinition | null>(null);

  const config = useMemo<AnalyticsConfig>(() => {
    const base = configProp ?? resolveAnalyticsConfig();
    return base.debug ? base : { ...base, debug: readDebugOverride() };
  }, [configProp]);

  const analyticsRef = useRef<Analytics | null>(null);
  if (analyticsRef.current === null) {
    const contextSource: AnalyticsContextSource = {
      getSnapshot: (): AnalyticsContextSnapshot => {
        const user = readUserContext(queryClient, resolveRole, userQueryKey);
        const page =
          currentPageRef.current ??
          (typeof window === "undefined"
            ? null
            : resolveVirtualPage({
                pathname: window.location.pathname,
                hash: window.location.hash,
              }));
        return {
          environment: config.environment,
          language: i18nRef.current.language,
          userRole: user.userRole,
          countryCode: user.countryCode,
          ascId: user.ascId,
          virtualUrl: page?.virtualUrl,
          pageName: page?.pageName,
          moduleName: page?.moduleName,
        };
      },
    };
    analyticsRef.current = createAnalytics({ contextSource, config, transport, clock, logger });
  }
  const analytics = analyticsRef.current;

  const handlePageResolved = useCallback((page: VirtualPageDefinition | null): void => {
    currentPageRef.current = page;
  }, []);

  useVirtualPageViews({
    analytics,
    onResolve: handlePageResolved,
    enabled: !disableAutomaticPageViews,
  });

  return <AnalyticsContext.Provider value={analytics}>{children}</AnalyticsContext.Provider>;
};
