import { useMemo } from "react";
import { useFormikContext } from "formik";
import {
  format,
  addDays,
  setMonth,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  type Locale,
} from "date-fns";
import { formatFormikDateValue } from "./DatePicker.utils";
import { CalendarConfig } from "../DatePicker.types";

interface FormValues {
  [key: string]: string | null;
}

interface UseCalendarComputedValuesProps {
  name: string;
  locale: Locale;
  calendar?: CalendarConfig;
  currentMonth: Date;
  selectedDate: Date | null;
  showCalendar: boolean;
  tempDate: string | null;
  inputValue: string;
  isEditing: boolean;
}

export function useCalendarComputedValues({
  name,
  locale,
  calendar,
  currentMonth,
  selectedDate,
  showCalendar,
  tempDate,
  inputValue,
  isEditing,
}: UseCalendarComputedValuesProps) {
  const { values } = useFormikContext<FormValues>();
  const dateFormat = calendar?.dateFormat || "dd.MM.yyyy";

  const displayDate = showCalendar && tempDate ? new Date(tempDate) : selectedDate;

  const monthOptions = useMemo(() => {
    const start = (calendar?.startMonth || 1) - 1;
    const end = (calendar?.endMonth || 12) - 1;
    return Array.from({ length: end - start + 1 }, (_, i) => {
      const monthName = format(setMonth(new Date(2000, 0, 1), start + i), "MMMM", { locale });
      return { label: monthName, value: (start + i).toString(), name: monthName };
    });
  }, [locale, calendar?.startMonth, calendar?.endMonth]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const start = calendar?.startYear || currentYear - 100;
    const end = calendar?.endYear || currentYear + 100;
    return Array.from({ length: end - start + 1 }, (_, i) => {
      const year = (start + i).toString();
      return { label: year, value: year, name: year };
    });
  }, [calendar?.startYear, calendar?.endYear]);

  const calendarDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonth), { locale }),
        end: endOfWeek(endOfMonth(currentMonth), { locale }),
      }),
    [currentMonth, locale],
  );

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        format(addDays(startOfWeek(new Date(), { locale }), i), "EEE", { locale }).substring(0, 2),
      ),
    [locale],
  );

  const displayValue = useMemo(() => {
    if (isEditing) return inputValue;

    return formatFormikDateValue(values[name], dateFormat, locale);
  }, [isEditing, inputValue, dateFormat, locale, values, name]);

  return {
    displayDate,
    displayValue,
    monthOptions,
    yearOptions,
    calendarDays,
    weekDays,
  };
}
