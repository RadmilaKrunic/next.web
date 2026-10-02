import { type Locale, format } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { de } from "date-fns/locale/de";
import { fr } from "date-fns/locale/fr";
import { es } from "date-fns/locale/es";
import { it } from "date-fns/locale/it";
import { zhCN } from "date-fns/locale/zh-CN";
import { zhTW } from "date-fns/locale/zh-TW";
import { ja } from "date-fns/locale/ja";
import { hi } from "date-fns/locale/hi";
import { tr } from "date-fns/locale/tr";
import { sr } from "date-fns/locale/sr";
import { enZA } from "date-fns/locale/en-ZA";

export const localeMap: Record<string, Locale> = {
  // i18next language codes (used by the app)
  "en-US": enUS,
  "en-ZA": enZA,
  "de-DE": de,
  "sr-BA": sr,
  "sr-RS": sr,
  "tr-TR": tr,
  "hi-IN": hi,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  // Short codes (kept for backward compatibility)
  en: enUS,
  de: de,
  fr: fr,
  es: es,
  it: it,
  zh: zhCN,
  ja: ja,
  hi: hi,
  tr: tr,
  sr: sr,
};

export function getLocale(locale?: string | Locale): Locale {
  if (!locale) return enUS;
  if (typeof locale === "string") {
    return localeMap[locale] || enUS;
  }
  return locale;
}
// Backend always sends ISO format string (YYYY-MM-DDTHH:mm:ss.sssZ)
export function parseDate(date?: string): Date | undefined {
  if (!date) return undefined;
  const parsed = new Date(date);
  const utcDate = new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0, 0),
  );
  return Number.isNaN(utcDate.getTime()) ? undefined : utcDate;
}

export function formatDateForBackend(
  date?: Date | string,
  startOfTheDayFlag?: boolean,
  endOfTheDayFlag?: boolean,
): string | null {
  if (!date) return null;

  let year: string;
  let month: string;
  let day: string;

  if (typeof date === "string") {
    const datePartMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
    if (!datePartMatch) return null;

    [, year, month, day] = datePartMatch;
  } else {
    if (Number.isNaN(date.getTime())) return null;

    year = String(date.getFullYear());
    month = String(date.getMonth() + 1).padStart(2, "0");
    day = String(date.getDate()).padStart(2, "0");
  }

  const time = endOfTheDayFlag ? "23:59:59.999" : "00:00:00.000";

  return `${year}-${month}-${day}T${time}Z`;
}

export function formatFormikDateValue(
  value: string | Date | null | undefined,
  dateFormat: string,
  locale: Locale,
): string {
  if (!value) return "";

  if (typeof value === "string" && value.includes(",")) {
    const [start, end] = value.split(",");
    const startDate = parseDate(start);
    const endDate = parseDate(end);
    if (startDate && !endDate) {
      return `${format(startDate, dateFormat, { locale })} - `;
    }

    if (startDate && endDate) {
      return `${format(startDate, dateFormat, { locale })} - ${format(endDate, dateFormat, { locale })}`;
    }
  }
  const date = typeof value === "string" ? parseDate(value) : value;
  if (date) return format(date, dateFormat, { locale });

  return "";
}
