import { matchesFilter } from "@/components/ui/List/List.utils";
import { GoodwillApproval } from "./ApprovalList.types";
import { QuickFilter, Filter } from "components/ui/List/List.types";
import { isDateInRange } from "modules/JobManagement/JobList/JobList.utils";
export { getJobNavigationPath as getApprovalNavigationPath } from "modules/JobManagement/JobList/JobList.utils";

export const BULK_APPROVABLE_JOB_STATUSES = [
  "BOSCH_APPROVAL_PENDING",
  "MULTIPLE_APPROVAL_PENDING",
] as const;

export const isBulkApprovableJobStatus = (jobStatus: string): boolean =>
  BULK_APPROVABLE_JOB_STATUSES.includes(jobStatus as (typeof BULK_APPROVABLE_JOB_STATUSES)[number]);

export const getInitialFieldValues = (fieldNames: string[]) => {
  const initialValues = fieldNames.reduce(
    (acc, name) => {
      acc[name] = "";
      return acc;
    },
    {} as Record<string, string | boolean>,
  );

  return initialValues;
};

function flattenApprovalForSearch(approval: GoodwillApproval): string[] {
  const result: string[] = [];
  function recurse(obj: unknown) {
    if (typeof obj === "string") {
      result.push(obj);
    } else if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      for (const key in obj) {
        recurse((obj as Record<string, unknown>)[key]);
      }
    }
  }
  recurse(approval);
  return result;
}

export function filterApprovals(
  approvals: GoodwillApproval[],
  quickFilters: QuickFilter[],
  searchValue: string,
  advancedFilters: Filter[],
): GoodwillApproval[] {
  const activeQuickFilterKeys = quickFilters.filter((f) => f.selected).map((f) => f.key);

  return approvals.filter((approval) => {
    if (activeQuickFilterKeys.length > 0) {
      const now = Date.now();
      const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
      const matchesQuickFilter = activeQuickFilterKeys.every((key) => {
        switch (key) {
          case "recentRequests": {
            const createdTime = new Date(approval.createdAt).getTime();
            return createdTime >= twentyFourHoursAgo && createdTime <= now;
          }
          case "pendingApprovals":
            return isBulkApprovableJobStatus(approval.jobStatus);
          default:
            return false;
        }
      });
      if (!matchesQuickFilter) return false;
    }

    if (searchValue.trim()) {
      const query = searchValue.toLowerCase();
      const values = flattenApprovalForSearch(approval);
      const matches = values.some((v) => v.toLowerCase().includes(query));
      if (!matches) return false;
    }

    if (advancedFilters.length > 0) {
      const matchesAdvanced = advancedFilters.every((filter) => {
        const value = filter.value;
        if (value === "" || value == null) return true;

        switch (filter.name) {
          case "jobStatus":
          case "jobStatusPreApprove":
            return matchesFilter(value, approval.jobStatus);
          case "customerType":
            return matchesFilter(value, approval.customer.customerType);
          case "customerWish":
            return matchesFilter(value, approval.customerWish);
          case "pickupType":
            return matchesFilter(value, approval.pickupType);
          case "paymentType":
            return matchesFilter(value, approval.paymentType);
          case "categoryId":
            return matchesFilter(value, approval.asset?.categoryId);
          case "ascName":
            return matchesFilter(value, approval.ascId);
          case "actionType":
            return matchesFilter(value, approval.diagnosticInfo?.actionType);
          case "jobType":
            if (Array.isArray(value)) {
              return value.some((v) => approval.diagnosticInfo?.materialsJobType?.includes(v));
            }
            return approval.diagnosticInfo?.materialsJobType?.includes(String(value));
          case "createdAt":
            return isDateInRange(approval.createdAt, String(value));
          case "updatedAt":
            return isDateInRange(approval.updatedAt, String(value));
          default:
            return true;
        }
      });
      if (!matchesAdvanced) return false;
    }

    return true;
  });
}
