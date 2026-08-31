import {
  STATIC_ROUTE_RULES,
  TABBED_ROUTE_RULES,
  VIRTUAL_PAGE_REGISTRY,
} from "../config/registries";
import type { VirtualPageDefinition } from "../domain/types";

/** Minimal location the resolver needs (a subset of the DOM/Router location). */
export interface RouteLocation {
  readonly pathname: string;
  /** URL fragment (with or without leading `#`); selects the overview tab. */
  readonly hash?: string;
}

/** Exact segment-count match of `pathname` vs a `:param` pattern; trailing slash tolerated. */
const stripTrailingSlash = (path: string): string =>
  path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

export const matchesRoutePattern = (pattern: string, pathname: string): boolean => {
  const patternSegments = stripTrailingSlash(pattern).split("/");
  const pathSegments = stripTrailingSlash(pathname).split("/");
  if (patternSegments.length !== pathSegments.length) return false;
  return patternSegments.every(
    (segment, index) => segment.startsWith(":") || segment === pathSegments[index],
  );
};

const normalizeHash = (hash: string | undefined): string => (hash ?? "").replace(/^#/, "").trim();

/**
 * Resolves the virtual page for a router location, or `null` when out of scope.
 * Tabbed routes (hash-selected) are checked first, then static routes. Holds no
 * history state, so back/forward, redirects and nested routes all work.
 */
export const resolveVirtualPage = (location: RouteLocation): VirtualPageDefinition | null => {
  for (const rule of TABBED_ROUTE_RULES) {
    if (matchesRoutePattern(rule.pattern, location.pathname)) {
      const virtualUrl =
        rule.tabHashToVirtualUrl[normalizeHash(location.hash)] ?? rule.defaultVirtualUrl;
      return VIRTUAL_PAGE_REGISTRY[virtualUrl];
    }
  }
  for (const rule of STATIC_ROUTE_RULES) {
    if (matchesRoutePattern(rule.pattern, location.pathname)) {
      return VIRTUAL_PAGE_REGISTRY[rule.virtualUrl];
    }
  }
  return null;
};
