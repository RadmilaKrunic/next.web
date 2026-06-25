import { useRef, useMemo, useEffect } from "react";
import { useFormikContext } from "formik";
import { useTranslation } from "react-i18next";
import { getLocale, parseDate } from "./DatePicker.utils";
import { CalendarConfig } from "../DatePicker.types";
import { useDateInput } from "./useDateInput";
import { useCalendarState } from "./useCalendarState";
import { useRangeSelection } from "./useRangeSelection";
import { useSingleDateSelection } from "./useSingleDateSelection";
import { useCalendarComputedValues } from "./useCalendarComputedValues";

interface FormValues {
  [key: string]: string | null;
}

interface UseDatePickerProps {
  name: string;
  calendar?: CalendarConfig;
}

export function useDatePicker({ name, calendar }: UseDatePickerProps) {
  const { values, setFieldValue, handleBlur } = useFormikContext<FormValues>();
  const { i18n } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const localeObject = getLocale(i18n.language);
  const dateFormat = calendar?.dateFormat || "dd.MM.yyyy";
  const minDate = parseDate(calendar?.minDate);
  const maxDate = calendar?.maxDate === "" ? new Date() : parseDate(calendar?.maxDate);

  const selectedDate = useMemo(() => {
    const date = values[name] ? new Date(values[name]) : null;
    return date && Number.isFinite(date.getTime()) ? date : null;
  }, [values, name]);

  const isDateValid = (date: Date): boolean => {
    const toLocalDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const isInRange =
      (!minDate || toLocalDay(date) >= toLocalDay(minDate)) &&
      (!maxDate || toLocalDay(date) <= toLocalDay(maxDate));
    if (!calendar?.startMonth || !calendar?.endMonth) return isInRange;
    const month = date.getMonth() + 1;
    return isInRange && month >= calendar.startMonth && month <= calendar.endMonth;
  };

  const singleDateSelection = useSingleDateSelection({
    name,
    calendar,
    isDateValid,
    selectedDate,
  });

  const rangeSelection = useRangeSelection({
    name,
    isDateValid,
  });

  const getDisplayDate = () => {
    if (calendar?.allowDateRange) {
      return rangeSelection.tempRangeStart ? new Date(rangeSelection.tempRangeStart) : selectedDate;
    }
    return singleDateSelection.tempDate ? new Date(singleDateSelection.tempDate) : selectedDate;
  };

  const calendarState = useCalendarState({
    name,
    calendar,
    isDateValid,
    displayDate: getDisplayDate(),
    selectedDate,
    setTempDate: singleDateSelection.setTempDate,
    setTempRangeStart: rangeSelection.setTempRangeStart,
    setTempRangeEnd: rangeSelection.setTempRangeEnd,
    updateDateOnMonthYearChange: calendar?.allowDateRange
      ? undefined
      : singleDateSelection.updateDateOnMonthYearChange,
    saveOriginalValue: singleDateSelection.saveOriginalValue,
    saveOriginalRangeValue: rangeSelection.saveOriginalValue,
  });

  const dateInput = useDateInput({
    name,
    calendar,
    isDateValid,
    setCurrentMonth: calendarState.setCurrentMonth,
    setTempDate: singleDateSelection.setTempDate,
    setTempRangeStart: rangeSelection.setTempRangeStart,
    setTempRangeEnd: rangeSelection.setTempRangeEnd,
  });

  const computedValues = useCalendarComputedValues({
    name,
    locale: localeObject,
    calendar,
    currentMonth: calendarState.currentMonth,
    selectedDate,
    showCalendar: calendarState.showCalendar,
    tempDate: singleDateSelection.tempDate,
    inputValue: dateInput.inputValue,
    isEditing: dateInput.isEditing,
  });

  useEffect(() => {
    if (!values[name]) {
      // setDefaultToday should not be used with date ranges
      if (calendar?.setDefaultToday && !calendar?.allowDateRange) {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        void setFieldValue(name, today.toISOString());
      } else if (calendar?.defaultDate) {
        void setFieldValue(name, calendar.defaultDate);
      }
    }
  }, [
    calendar?.defaultDate,
    calendar?.setDefaultToday,
    calendar?.allowDateRange,
    name,
    setFieldValue,
    values,
  ]);

  const closeFlyout = () => {
    singleDateSelection.setTempDate(null);
    rangeSelection.setTempRangeStart(null);
    rangeSelection.setTempRangeEnd(null);
    calendarState.setShowCalendar(false);
    handleBlur({ target: { name } } as React.FocusEvent<HTMLInputElement>);
  };

  const handleCancel = () => {
    if (calendar?.allowDateRange) {
      rangeSelection.handleCancel(closeFlyout);
    } else {
      singleDateSelection.handleCancel(closeFlyout);
    }
  };

  const handleConfirm = () => {
    if (dateInput.isEditing) {
      dateInput.applyInputValue();
    }

    if (calendar?.allowDateRange) {
      rangeSelection.handleConfirm(closeFlyout);
    } else {
      singleDateSelection.handleConfirm(closeFlyout);
    }
  };

  const handleCloseFlyout = closeFlyout;

  const handleDateClick = (day: Date) => {
    dateInput.resetEditing();

    if (calendar?.allowDateRange) {
      singleDateSelection.setTempDate(null);
      rangeSelection.handleDateClick(day);
    } else {
      singleDateSelection.handleDateClick(day);
    }
  };

  const isInRange = calendar?.allowDateRange ? rangeSelection.isInRange : () => false;

  const isRangeStart = calendar?.allowDateRange
    ? rangeSelection.isRangeStart
    : singleDateSelection.isRangeStart;

  const isRangeEnd = calendar?.allowDateRange
    ? rangeSelection.isRangeEnd
    : singleDateSelection.isRangeEnd;

  return {
    inputRef,
    containerRef,
    showCalendar: calendarState.showCalendar,
    currentMonth: calendarState.currentMonth,
    selectedDate,
    displayDate: computedValues.displayDate,
    displayValue: computedValues.displayValue,
    inputValue: dateInput.inputValue,
    isEditing: dateInput.isEditing,
    localeObject,
    dateFormat,
    minDate,
    maxDate,
    isDateValid,
    isInRange,
    isRangeStart,
    isRangeEnd,
    toggleCalendar: calendarState.toggleCalendar,
    handleMonthChange: calendarState.handleMonthChange,
    handleYearChange: calendarState.handleYearChange,
    handleDateClick,
    handleCancel,
    handleConfirm,
    handleCloseFlyout,
    handleInputChange: dateInput.handleInputChange,
    handleInputFocus: dateInput.handleInputFocus,
    handleInputBlur: dateInput.handleInputBlur,
    handleKeyDown: calendarState.handleKeyDown,
    monthOptions: computedValues.monthOptions,
    yearOptions: computedValues.yearOptions,
    calendarDays: computedValues.calendarDays,
    weekDays: computedValues.weekDays,
  };
}
