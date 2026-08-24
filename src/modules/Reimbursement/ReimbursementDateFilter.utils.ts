import { useState } from "react";
import { useReimbursementDateFilter } from "hooks/useReimbursementDateFilter";
import { formatDateDMY, convertDMYToISO } from "./Reimbursement.utils";

export const baseCalendarConfig = {
  maxDate: "",
  minDate: "",
  defaultDate: "",
  startYear: 2000,
  endYear: 2035,
  startMonth: 1,
  endMonth: 12,
  useDateInput: true,
  useDatePicker: true,
  dateFormat: "dd.MM.yyyy",
  allowDateRange: false,
  setDefaultToday: false,
};

export interface DateFilterValues {
  fromDate: string | null;
  toDate: string | null;
}

export function getDateRangeCalendarConfigs() {
  return {
    fromCalendarConfig: { ...baseCalendarConfig, startOfTheDay: true, endOfTheDay: false },
    toCalendarConfig: { ...baseCalendarConfig, startOfTheDay: false, endOfTheDay: true },
  };
}

export function getDefaultDateRange(useTwoMonths: boolean) {
  const today = new Date();
  const rangeStart = useTwoMonths
    ? new Date(today.getFullYear(), today.getMonth() - 2, today.getDate())
    : new Date(today.getFullYear(), today.getMonth(), today.getDate() - 14);
  return {
    today,
    defaultFromDate: formatDateDMY(rangeStart),
    defaultToDate: formatDateDMY(today),
  };
}

/**
 * Manages quick-filter chip state plus the from/to date range state, including
 * the "lastMonth" quick filter toggle behavior shared by ReimbursementList and
 * ReimbursementDetail.
 */
export function useReimbursementDateRangeFilter(useTwoMonths: boolean) {
  const { quickFilters, handleToggleFilter } = useReimbursementDateFilter();
  const { today, defaultFromDate, defaultToDate } = getDefaultDateRange(useTwoMonths);
  const isLastMonthSelected = quickFilters.find((f) => f.key === "lastMonth")?.selected ?? false;

  const getInitialDates = (): DateFilterValues => ({
    fromDate: convertDMYToISO(defaultFromDate),
    toDate: convertDMYToISO(defaultToDate),
  });

  const [dateValues, setDateValues] = useState<DateFilterValues>(getInitialDates());

  const handleFilterToggle = (key: string) => {
    handleToggleFilter(key);
    if (key === "lastMonth") {
      const willBeSelected = !isLastMonthSelected;
      if (willBeSelected) {
        const firstOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        setDateValues({
          fromDate: convertDMYToISO(formatDateDMY(firstOfLastMonth)),
          toDate: convertDMYToISO(formatDateDMY(lastOfLastMonth)),
        });
      } else {
        setDateValues({
          fromDate: convertDMYToISO(defaultFromDate),
          toDate: convertDMYToISO(defaultToDate),
        });
      }
    }
  };

  return { quickFilters, dateValues, setDateValues, handleFilterToggle };
}

export function useReimbursementPagination() {
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handlePageSizeChange = (option: string) => {
    setPagination({ page: 1, pageSize: Number(option) });
  };

  return { pagination, setPagination, handlePageChange, handlePageSizeChange };
}
