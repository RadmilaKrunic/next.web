export interface AnalyticsClock {
  now(): Date;
}

export class SystemClock implements AnalyticsClock {
  now(): Date {
    return new Date();
  }
}
export class FixedClock implements AnalyticsClock {
  constructor(private readonly fixed: Date) {}
  now(): Date {
    return this.fixed;
  }
}

/** `local_time_hour` as a 2-digit 12-hour value + AM/PM, e.g. `09AM`, `12PM`. */
export const formatLocalTimeHour = (date: Date): string => {
  const hours24 = date.getHours();
  const period = hours24 < 12 ? "AM" : "PM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${String(hours12).padStart(2, "0")}${period}`;
};

let weekdayFormatter: Intl.DateTimeFormat | undefined;
const getWeekdayFormatter = (): Intl.DateTimeFormat =>
  (weekdayFormatter ??= new Intl.DateTimeFormat("en-US", { weekday: "long" }));

export const formatLocalDayOfWeek = (date: Date): string => getWeekdayFormatter().format(date);
