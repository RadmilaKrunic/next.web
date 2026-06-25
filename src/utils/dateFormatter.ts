import { format } from "date-fns";

const DEFAULT_DATE_FORMAT = "dd.MM.yyyy";
const DEFAULT_TIME_FORMAT = "HH:mm";

export function formatDateToDisplay(value: string): string {
  if (!value) return "";

  let date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const [day, month, year] = value.split("-");
    date = new Date(Number(year), Number(month) - 1, Number(day));
  }

  if (Number.isNaN(date.getTime())) return "";

  return format(date, DEFAULT_DATE_FORMAT);
}

export function formatTime(value: string): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return format(date, DEFAULT_TIME_FORMAT);
}
