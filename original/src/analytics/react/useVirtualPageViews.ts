import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import type { Analytics } from "../core/analytics";
import type { VirtualPageDefinition } from "../domain/types";
import { resolveVirtualPage, type RouteLocation } from "../core/virtual-pages";

export interface UseVirtualPageViewsOptions {
  readonly analytics: Analytics;
  readonly onResolve?: (page: VirtualPageDefinition | null) => void;
  readonly enabled?: boolean;
}

export const useVirtualPageViews = ({
  analytics,
  onResolve,
  enabled = true,
}: UseVirtualPageViewsOptions): void => {
  const location = useLocation();
  const lastVirtualUrlRef = useRef<string | null>(null);
  const onResolveRef = useRef(onResolve);
  onResolveRef.current = onResolve;

  const track = useCallback(
    (routeLocation: RouteLocation): void => {
      const page = resolveVirtualPage(routeLocation);
      onResolveRef.current?.(page);
      if (!enabled) return;
      if (!page) {
        lastVirtualUrlRef.current = null;
        return;
      }
      if (page.virtualUrl === lastVirtualUrlRef.current) return;
      lastVirtualUrlRef.current = page.virtualUrl;
      analytics.trackVirtualPage();
    },
    [analytics, enabled],
  );

  useEffect(() => {
    track({ pathname: location.pathname, hash: location.hash });
  }, [location.pathname, location.hash, track]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleHashChange = (): void =>
      track({ pathname: window.location.pathname, hash: window.location.hash });
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [track]);
};
