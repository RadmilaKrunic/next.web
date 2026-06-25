import { useState } from "react";
import { useFormikContext } from "formik";
import { format, addDays, setMonth, setYear } from "date-fns";
import { CalendarConfig } from "../DatePicker.types";
import { parseDate } from "./DatePicker.utils";

interface FormValues {
  [key: string]: string | null;
}

interface UseCalendarStateProps {
  name: string;
  calendar?: CalendarConfig;
  isDateValid: (date: Date) => boolean;
  displayDate: Date | null;
  selectedDate: Date | null;
  setTempDate: (date: string | null) => void;
  setTempRangeStart: (date: string | null) => void;
  setTempRangeEnd: (date: string | null) => void;
  updateDateOnMonthYearChange?: (newDate: Date) => void;
  saveOriginalValue?: () => void;
  saveOriginalRangeValue?: () => void;
}

export function useCalendarState({
  name,
  calendar,
  isDateValid,
  displayDate,
  selectedDate,
  setTempDate,
  setTempRangeStart,
  setTempRangeEnd,
  updateDateOnMonthYearChange,
  saveOriginalValue,
  saveOriginalRangeValue,
}: UseCalendarStateProps) {
  const { values } = useFormikContext<FormValues>();
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const parseValidDate = (dateString: string): Date | null => {
    const dateObj = new Date(dateString);
    return Number.isFinite(dateObj.getTime()) ? dateObj : null;
  };

  const handleDateRangeOpening = () => {
    saveOriginalRangeValue?.();

    const currentValue = values[name];
    if (currentValue?.includes(",")) {
      const [start, end] = currentValue.split(",");

      const startDate = parseDate(start);
      const endDate = parseDate(end);

      setTempRangeStart(startDate ? format(startDate, "yyyy-MM-dd") : null);
      setTempRangeEnd(endDate ? format(endDate, "yyyy-MM-dd") : null);
      setCurrentMonth(startDate || new Date());
    } else {
      setTempRangeStart(null);
      setTempRangeEnd(null);
      setCurrentMonth(new Date());
    }
    setTempDate(null);
  };

  const handleSingleDateOpening = () => {
    saveOriginalValue?.();

    const currentValue = values[name];
    const dateObj = currentValue ? parseValidDate(currentValue) : null;

    if (dateObj) {
      setTempDate(format(dateObj, "yyyy-MM-dd"));
      setCurrentMonth(dateObj);
    } else {
      setTempDate(null);
      setCurrentMonth(new Date());
    }

    setTempRangeStart(null);
    setTempRangeEnd(null);
  };

  const toggleCalendar = () => {
    if (!calendar?.useDatePicker) return;

    if (!showCalendar) {
      if (calendar?.allowDateRange) {
        handleDateRangeOpening();
      } else {
        handleSingleDateOpening();
      }
    }

    setShowCalendar(!showCalendar);
  };

  const handleMonthChange = (month: number) => {
    const newMonth = setMonth(currentMonth, month);
    setCurrentMonth(newMonth);
    if (updateDateOnMonthYearChange && (displayDate || selectedDate)) {
      const baseDate = displayDate || selectedDate;
      if (baseDate) {
        const updatedDate = setMonth(baseDate, month);
        if (isDateValid(updatedDate)) {
          updateDateOnMonthYearChange(updatedDate);
        }
      }
    }
  };

  const handleYearChange = (year: number) => {
    const newYear = setYear(currentMonth, year);
    setCurrentMonth(newYear);

    if (updateDateOnMonthYearChange && (displayDate || selectedDate)) {
      const baseDate = displayDate || selectedDate;
      if (baseDate) {
        const updatedDate = setYear(baseDate, year);
        if (isDateValid(updatedDate)) {
          updateDateOnMonthYearChange(updatedDate);
        }
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const currentDate = displayDate || selectedDate;
    if (!currentDate) return;

    const days = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    if (!days) return;

    const newDate = addDays(currentDate, days);
    if (isDateValid(newDate)) {
      event.preventDefault();
      setTempDate(format(newDate, "yyyy-MM-dd"));
    }
  };

  return {
    showCalendar,
    setShowCalendar,
    currentMonth,
    setCurrentMonth,
    toggleCalendar,
    handleMonthChange,
    handleYearChange,
    handleKeyDown,
  };
}
