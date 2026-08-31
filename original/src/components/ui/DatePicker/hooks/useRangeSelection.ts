import { useState } from "react";
import { flushSync } from "react-dom";
import { useFormikContext } from "formik";
import { format, isSameDay } from "date-fns";
import { formatDateForBackend } from "./DatePicker.utils";

interface FormValues {
  [key: string]: string | null;
}

interface UseRangeSelectionProps {
  name: string;
  isDateValid: (date: Date) => boolean;
}

export function useRangeSelection({ name, isDateValid }: UseRangeSelectionProps) {
  const { setFieldValue, values } = useFormikContext<FormValues>();
  const [tempRangeStart, setTempRangeStart] = useState<string | null>(null);
  const [tempRangeEnd, setTempRangeEnd] = useState<string | null>(null);
  const [originalValue, setOriginalValue] = useState<string | null>(null);

  const handleDateClick = (day: Date) => {
    if (!isDateValid(day)) return;

    if (!tempRangeStart || tempRangeEnd) {
      const startDateString = format(day, "yyyy-MM-dd");
      setTempRangeStart(startDateString);
      setTempRangeEnd(null);

      const startFormatted = formatDateForBackend(new Date(startDateString), true, false);
      void setFieldValue(name, `${startFormatted},`);
    } else {
      const start = new Date(tempRangeStart);
      const [startDate, endDate] =
        day >= start
          ? [tempRangeStart, format(day, "yyyy-MM-dd")]
          : [format(day, "yyyy-MM-dd"), tempRangeStart];
      setTempRangeStart(startDate);
      setTempRangeEnd(endDate);

      const startFormatted = formatDateForBackend(new Date(startDate), true, false);
      const endFormatted = formatDateForBackend(new Date(endDate), false, true);
      void setFieldValue(name, `${startFormatted},${endFormatted}`);
    }
  };

  const handleConfirm = (closeFn: () => void) => {
    if (tempRangeStart && tempRangeEnd) {
      const startFormatted = formatDateForBackend(new Date(tempRangeStart), true, false);
      const endFormatted = formatDateForBackend(new Date(tempRangeEnd), false, true);
      flushSync(() => {
        void setFieldValue(name, `${startFormatted},${endFormatted}`);
      });
    }
    setTempRangeStart(null);
    setTempRangeEnd(null);
    closeFn();
  };

  const handleCancel = (closeFn: () => void) => {
    setTempRangeStart(null);
    setTempRangeEnd(null);
    void setFieldValue(name, originalValue);
    setOriginalValue(null);
    closeFn();
  };

  const saveOriginalValue = () => {
    setOriginalValue(values[name] || null);
  };

  const isInRange = (day: Date): boolean =>
    tempRangeStart && tempRangeEnd
      ? day >= new Date(tempRangeStart) && day <= new Date(tempRangeEnd)
      : false;

  const isRangeStart = (day: Date): boolean =>
    tempRangeStart ? isSameDay(day, new Date(tempRangeStart)) : false;

  const isRangeEnd = (day: Date): boolean =>
    tempRangeEnd ? isSameDay(day, new Date(tempRangeEnd)) : false;

  return {
    tempRangeStart,
    tempRangeEnd,
    setTempRangeStart,
    setTempRangeEnd,
    isInRange,
    isRangeStart,
    isRangeEnd,
    handleDateClick,
    handleConfirm,
    handleCancel,
    saveOriginalValue,
  };
}
