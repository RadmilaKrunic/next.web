import { format } from "date-fns";

const DEFAULT_DATE_FORMAT = "dd.MM.yyyy";
const DEFAULT_TIME_FORMAT = "HH:mm";

export function formatDateToDisplay(value: string | Date): string {
  if (!value) return "";

  let date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const fallbackMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.toString());
    if (!fallbackMatch) return "";

    const [, day, month, year] = fallbackMatch;
    const parsedDay = Number(day);
    const parsedMonth = Number(month);
    const parsedYear = Number(year);

    const fallbackDate = new Date(Date.UTC(parsedYear, parsedMonth - 1, parsedDay, 0, 0, 0, 0));

    // Reject invalid calendar values that Date would otherwise roll over.
    const isValidFallbackDate =
      fallbackDate.getUTCFullYear() === parsedYear &&
      fallbackDate.getUTCMonth() === parsedMonth - 1 &&
      fallbackDate.getUTCDate() === parsedDay;

    if (!isValidFallbackDate) return "";

    date = fallbackDate;
  }

  if (Number.isNaN(date.getTime())) return "";

  // Extract date in UTC to avoid timezone conversion issues
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const utcDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

  return format(utcDate, DEFAULT_DATE_FORMAT);
}

export function formatTime(value: string | Date): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return format(date, DEFAULT_TIME_FORMAT);
}
