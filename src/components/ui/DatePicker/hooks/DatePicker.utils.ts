import { type Locale, set, format } from "date-fns";
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

  let dateObj = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(dateObj.getTime())) return null;

  if (startOfTheDayFlag) {
    // Set to start of day in UTC: 00:00:00.000
    dateObj = new Date(
      Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), 0, 0, 0, 0),
    );
  } else if (endOfTheDayFlag) {
    // Set to end of day in UTC: 23:59:59.999
    dateObj = new Date(
      Date.UTC(
        dateObj.getUTCFullYear(),
        dateObj.getUTCMonth(),
        dateObj.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
  } else {
    const now = new Date();
    dateObj = set(dateObj, {
      hours: now.getHours(),
      minutes: now.getMinutes(),
      seconds: now.getSeconds(),
      milliseconds: now.getMilliseconds(),
    });
  }
  //2024-02-16T00:00:00Z
  return dateObj.toISOString();
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
