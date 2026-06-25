import { useState } from "react";
import { flushSync } from "react-dom";
import { useFormikContext } from "formik";
import { parse, isValid } from "date-fns";
import { formatDateForBackend } from "./DatePicker.utils";
import { CalendarConfig } from "../DatePicker.types";

interface FormValues {
  [key: string]: string | null;
}

interface UseDateInputProps {
  name: string;
  calendar?: CalendarConfig;
  isDateValid: (date: Date) => boolean;
  setCurrentMonth: (date: Date) => void;
  setTempDate?: (date: string | null) => void;
  setTempRangeStart?: (date: string | null) => void;
  setTempRangeEnd?: (date: string | null) => void;
}

export function useDateInput({
  name,
  calendar,
  isDateValid,
  setCurrentMonth,
  setTempDate,
  setTempRangeStart,
  setTempRangeEnd,
}: UseDateInputProps) {
  const { setFieldValue, handleBlur } = useFormikContext<FormValues>();
  const [inputValue, setInputValue] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  const isDateFormatComplete = (input: string, dateFormat: string): boolean => {
    const expectedLength = dateFormat.length;
    return input.length === expectedLength;
  };

  const tryParseSingleDate = (input: string, dateFormat: string) => {
    if (!isDateFormatComplete(input, dateFormat)) {
      return;
    }

    const parsedDate = parse(input, dateFormat, new Date());

    if (isValid(parsedDate) && isDateValid(parsedDate)) {
      if (setTempDate) {
        setTempDate(parsedDate.toISOString());
      }

      const formattedDate = formatDateForBackend(
        parsedDate,
        calendar?.startOfTheDay,
        calendar?.endOfTheDay,
      );
      flushSync(() => {
        void setFieldValue(name, formattedDate);
      });
      setCurrentMonth(parsedDate);
    }
  };

  const clearRangeDates = () => {
    setTempRangeStart?.(null);
    setTempRangeEnd?.(null);
  };

  const processValidStartDate = (startDate: Date, endStr: string, dateFormat: string) => {
    setTempRangeStart?.(startDate.toISOString());
    setCurrentMonth(startDate);

    if (!isDateFormatComplete(endStr, dateFormat)) {
      setTempRangeEnd?.(null);
      return;
    }

    const endDate = parse(endStr, dateFormat, new Date());
    const isEndDateValid = isValid(endDate) && isDateValid(endDate) && startDate <= endDate;

    if (isEndDateValid) {
      setTempRangeEnd?.(endDate.toISOString());
      const formattedStart = formatDateForBackend(startDate, calendar?.startOfTheDay, false);
      const formattedEnd = formatDateForBackend(endDate, false, calendar?.endOfTheDay);
      flushSync(() => {
        void setFieldValue(name, `${formattedStart},${formattedEnd}`);
      });
    } else {
      setTempRangeEnd?.(null);
    }
  };

  const tryParseDateRange = (startStr: string, endStr: string, dateFormat: string) => {
    if (!isDateFormatComplete(startStr, dateFormat)) {
      clearRangeDates();
      return;
    }

    const startDate = parse(startStr, dateFormat, new Date());
    if (isValid(startDate) && isDateValid(startDate)) {
      processValidStartDate(startDate, endStr, dateFormat);
    }
  };

  const tryUpdateCalendarFromInput = (input: string) => {
    const dateFormat = calendar?.dateFormat || "dd.MM.yyyy";
    const trimmedInput = input.trim();

    if (calendar?.allowDateRange) {
      if (trimmedInput.includes(" - ")) {
        const [startStr, endStr] = trimmedInput.split(" - ").map((s) => s.trim());

        if (setTempDate) {
          setTempDate(null);
        }
        tryParseDateRange(startStr, endStr, dateFormat);
      } else if (setTempRangeStart && setTempRangeEnd) {
        setTempRangeStart(null);
        setTempRangeEnd(null);
      }
    } else if (trimmedInput) {
      tryParseSingleDate(trimmedInput, dateFormat);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!calendar?.useDateInput) return;

    const value = event.target.value;
    const filteredValue = value.replaceAll(/[^0-9.\-/\s]/g, "");
    setIsEditing(true);
    setInputValue(filteredValue);

    if (!filteredValue.trim()) {
      void setFieldValue(name, null);
      if (setTempDate) {
        setTempDate(null);
      }
      if (setTempRangeStart && setTempRangeEnd) {
        setTempRangeStart(null);
        setTempRangeEnd(null);
      }
      return;
    }
    tryUpdateCalendarFromInput(filteredValue);
  };

  const handleInputFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    if (!calendar?.useDateInput) return;

    const currentValue = event.target.value;
    setIsEditing(true);
    setInputValue(currentValue);

    tryUpdateCalendarFromInput(currentValue);
  };

  const handleSingleDateBlur = (input: string, dateFormat: string) => {
    if (!isDateFormatComplete(input, dateFormat)) {
      void setFieldValue(name, null);
      if (setTempDate) {
        setTempDate(null);
      }
      setInputValue("");
      setIsEditing(false);
      return;
    }

    const parsedDate = parse(input, dateFormat, new Date());

    if (isValid(parsedDate) && isDateValid(parsedDate)) {
      void setFieldValue(
        name,
        formatDateForBackend(parsedDate, calendar?.startOfTheDay, calendar?.endOfTheDay),
      );
      setCurrentMonth(parsedDate);
      setInputValue("");
      setIsEditing(false);
    } else {
      void setFieldValue(name, null);
      if (setTempDate) {
        setTempDate(null);
      }
      setInputValue("");
      setIsEditing(false);
    }
  };

  const handleDateRangeBlur = (input: string, dateFormat: string) => {
    const [startStr, endStr] = input.split(" - ").map((s) => s.trim());
    if (!isDateFormatComplete(startStr, dateFormat) || !isDateFormatComplete(endStr, dateFormat)) {
      void setFieldValue(name, null);
      if (setTempRangeStart && setTempRangeEnd) {
        setTempRangeStart(null);
        setTempRangeEnd(null);
      }
      setInputValue("");
      setIsEditing(false);
      return;
    }

    const startDate = parse(startStr, dateFormat, new Date());
    const endDate = parse(endStr, dateFormat, new Date());

    if (
      isValid(startDate) &&
      isValid(endDate) &&
      isDateValid(startDate) &&
      isDateValid(endDate) &&
      startDate <= endDate
    ) {
      const formattedStart = formatDateForBackend(startDate, calendar?.startOfTheDay, false);
      const formattedEnd = formatDateForBackend(endDate, false, calendar?.endOfTheDay);
      void setFieldValue(name, `${formattedStart},${formattedEnd}`);
      setCurrentMonth(startDate);
      setInputValue("");
      setIsEditing(false);
    } else {
      void setFieldValue(name, null);
      if (setTempRangeStart && setTempRangeEnd) {
        setTempRangeStart(null);
        setTempRangeEnd(null);
      }
      setInputValue("");
      setIsEditing(false);
    }
  };

  const handleInputBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    if (!calendar?.useDateInput) return handleBlur(event);

    const input = event.target.value.trim();

    if (input) {
      const dateFormat = calendar?.dateFormat || "dd.MM.yyyy";

      if (calendar?.allowDateRange) {
        if (input.includes(" - ")) {
          handleDateRangeBlur(input, dateFormat);
        } else {
          void setFieldValue(name, null);
          setInputValue("");
          setIsEditing(false);
        }
      } else {
        handleSingleDateBlur(input, dateFormat);
      }
    } else {
      void setFieldValue(name, null);
      if (setTempDate) {
        setTempDate(null);
      }
      if (setTempRangeStart && setTempRangeEnd) {
        setTempRangeStart(null);
        setTempRangeEnd(null);
      }
      setInputValue("");
      setIsEditing(false);
    }
    handleBlur(event);
  };

  const applyInputValue = () => {
    if (!isEditing || !inputValue) return;

    const input = inputValue.trim();
    const dateFormat = calendar?.dateFormat || "dd.MM.yyyy";

    if (calendar?.allowDateRange) {
      if (input.includes(" - ")) {
        handleDateRangeBlur(input, dateFormat);
      } else {
        void setFieldValue(name, null);
        setInputValue("");
        setIsEditing(false);
      }
    } else {
      handleSingleDateBlur(input, dateFormat);
    }
  };

  const resetEditing = () => {
    setIsEditing(false);
    setInputValue("");
  };

  return {
    inputValue,
    isEditing,
    handleInputChange,
    handleInputFocus,
    handleInputBlur,
    applyInputValue,
    resetEditing,
  };
}
