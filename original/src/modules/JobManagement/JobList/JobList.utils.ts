import { Job } from "./JobList.types";
import { QuickFilter, Filter } from "components/ui/List/List.types";
import { matchesFilter } from "components/ui/List/List.utils";

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

export function flattenJobForSearch(job: Job): string[] {
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
  recurse(job);
  return result;
}

export const isDateInRange = (dateStr: string, rangeStr: string): boolean => {
  if (!dateStr || !rangeStr) return true;
  const [startStr, endStr] = rangeStr.split(",");
  const date = new Date(dateStr).getTime();
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  return date >= start && date <= end;
};

export function filterJobs(
  jobs: Job[],
  quickFilters: QuickFilter[],
  searchValue: string,
  advancedFilters: Filter[],
): Job[] {
  const activeQuickFilterKeys = quickFilters.filter((f) => f.selected).map((f) => f.key);

  return jobs.filter((job) => {
    if (activeQuickFilterKeys.length > 0) {
      const matchesQuickFilter = activeQuickFilterKeys.some((key) => {
        switch (key) {
          case "readyForDiagnostic":
            return job.jobStatus === "READY_FOR_DIAGNOSTIC";
          case "unassigned":
            return !job.assigneeName || job.assigneeName === "un-assigned";
          default:
            return false;
        }
      });
      if (!matchesQuickFilter) return false;
    }

    if (searchValue.trim()) {
      const query = searchValue.toLowerCase();
      const values = flattenJobForSearch(job);
      const matches = values.some((v) => v.toLowerCase().includes(query));
      if (!matches) return false;
    }

    if (advancedFilters.length > 0) {
      const matchesAdvanced = advancedFilters.every((filter) => {
        const value = filter.value;
        if (value === "" || value == null) return true;

        switch (filter.name) {
          case "jobStatus":
            return matchesFilter(value, job.jobStatus);
          case "customerType":
            return matchesFilter(value, job.customer.customerType);
          case "customerWish":
            return matchesFilter(value, job.customerWish);
          case "pickupType":
            return matchesFilter(value, job.pickupType);
          case "paymentType":
            return matchesFilter(value, job.paymentType);
          case "categoryId":
            return matchesFilter(value, job.asset?.categoryId);
          case "actionType":
            return matchesFilter(value, job.diagnosticInfo?.actionType);
          case "jobType":
            if (Array.isArray(value)) {
              return value.some((v) => job.diagnosticInfo?.materialsJobType?.includes(v));
            }
            return job.diagnosticInfo?.materialsJobType?.includes(String(value));
          case "createdAt":
            return isDateInRange(job.createdAt, String(value));
          case "updatedAt":
            return isDateInRange(job.updatedAt, String(value));
          default:
            return true;
        }
      });

      if (!matchesAdvanced) return false;
    }

    return true;
  });
}

export function getJobNavigationPath(row: Job): string {
  const isDraft = row.jobStatus.toLowerCase() === "draft";
  const isReadyForDiagnostic = row.jobStatus.toUpperCase() === "READY_FOR_DIAGNOSTIC";
  const hash = isReadyForDiagnostic ? "" : "#diagnosticData";
  return isDraft ? `/edit-order/${row.orderId}` : `/job-overview/${row.jobId}${hash}`;
}
