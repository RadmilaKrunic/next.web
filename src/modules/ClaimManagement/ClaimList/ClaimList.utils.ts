import { Claim } from "./ClaimList.types";
import { QuickFilter, Filter } from "components/ui/List/List.types";
import { matchesFilter } from "components/ui/List/List.utils";
import { isDateInRange } from "modules/JobManagement/JobList/JobList.utils";

export function flattenClaimForSearch(claim: Claim): string[] {
  const result: string[] = [];
  function recurse(obj: unknown) {
    if (typeof obj === "string") {
      result.push(obj);
    } else if (typeof obj === "number") {
      result.push(String(obj));
    } else if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      for (const key in obj) {
        recurse((obj as Record<string, unknown>)[key]);
      }
    }
  }
  recurse(claim);
  return result;
}

export function filterClaims(
  claims: Claim[],
  quickFilters: QuickFilter[],
  searchValue: string,
  advancedFilters: Filter[],
): Claim[] {
  const activeQuickFilterKeys = quickFilters.filter((f) => f.selected).map((f) => f.key);

  return claims.filter((claim) => {
    if (activeQuickFilterKeys.length > 0) {
      const now = Date.now();
      const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
      const matchesQuickFilter = activeQuickFilterKeys.every((key) => {
        if (key === "recentRequests") {
          const createdTime = new Date(claim.createdOn).getTime();
          return createdTime >= twentyFourHoursAgo && createdTime <= now;
        }
        if (key === "PENDING") return claim.status === "PENDING";
        return false;
      });
      if (!matchesQuickFilter) return false;
    }

    if (searchValue.trim()) {
      const query = searchValue.toLowerCase();
      const values = flattenClaimForSearch(claim);
      const matches = values.some((v) => v.toLowerCase().includes(query));
      if (!matches) return false;
    }

    if (advancedFilters.length > 0) {
      const matchesAdvanced = advancedFilters.every((filter) => {
        const value = filter.value;
        if (value === "" || value == null) return true;

        switch (filter.name) {
          case "status":
            return matchesFilter(value, claim.status);
          case "jobType":
            return matchesFilter(value, claim.jobType);
          case "jobAction":
            return matchesFilter(value, claim.jobAction);
          case "createdOn":
            return isDateInRange(claim.createdOn, String(value));
          case "ascName":
            return matchesFilter(value, claim.ascId);
          default:
            return true;
        }
      });
      if (!matchesAdvanced) return false;
    }

    return true;
  });
}

export function getClaimNavigationPath(claim: Claim): string {
  return `/claim-overview/${claim.claimId}/#claims`;
}
