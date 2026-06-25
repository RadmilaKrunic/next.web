import { useState } from "react";
import { flushSync } from "react-dom";
import { useFormikContext } from "formik";
import { format } from "date-fns";
import { formatDateForBackend } from "./DatePicker.utils";
import { CalendarConfig } from "../DatePicker.types";

interface FormValues {
  [key: string]: string | null;
}

interface UseSingleDateSelectionProps {
  name: string;
  calendar?: CalendarConfig;
  isDateValid: (date: Date) => boolean;
  selectedDate: Date | null;
}

export function useSingleDateSelection({
  name,
  calendar,
  isDateValid,
}: UseSingleDateSelectionProps) {
  const { setFieldValue, values } = useFormikContext<FormValues>();
  const [tempDate, setTempDate] = useState<string | null>(null);
  const [originalValue, setOriginalValue] = useState<string | null>(null);

  const handleDateClick = (day: Date) => {
    if (!isDateValid(day)) return;
    const dateString = format(day, "yyyy-MM-dd");
    setTempDate(dateString);

    const formattedDate = formatDateForBackend(
      new Date(dateString),
      calendar?.startOfTheDay,
      calendar?.endOfTheDay,
    );
    void setFieldValue(name, formattedDate);
  };

  const updateDateOnMonthYearChange = (newDate: Date) => {
    const dateString = format(newDate, "yyyy-MM-dd");
    setTempDate(dateString);

    const formattedDate = formatDateForBackend(
      newDate,
      calendar?.startOfTheDay,
      calendar?.endOfTheDay,
    );
    void setFieldValue(name, formattedDate);
  };

  const handleConfirm = (closeFn: () => void) => {
    if (tempDate) {
      const formattedDate = formatDateForBackend(
        new Date(tempDate),
        calendar?.startOfTheDay,
        calendar?.endOfTheDay,
      );
      flushSync(() => {
        void setFieldValue(name, formattedDate);
      });
    }
    setTempDate(null);
    closeFn();
  };

  const handleCancel = (closeFn: () => void) => {
    setTempDate(null);

    void setFieldValue(name, originalValue);
    setOriginalValue(null);
    closeFn();
  };

  const saveOriginalValue = () => {
    setOriginalValue(values[name] || null);
  };

  const isRangeStart = (): boolean => false;

  const isRangeEnd = (): boolean => false;

  return {
    tempDate,
    setTempDate,
    handleDateClick,
    handleConfirm,
    handleCancel,
    isRangeStart,
    isRangeEnd,
    updateDateOnMonthYearChange,
    saveOriginalValue,
  };
}
