import { isSameMonth, isSameDay, format } from "date-fns";
import { Dropdown, Button } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";
import "./DatePickerContent.scss";

interface DatePickerContentProps {
  currentMonth: Date;
  selectedDate: Date | null;
  isDateValid: (date: Date) => boolean;
  isInRange: (day: Date) => boolean;
  isRangeStart: (day: Date) => boolean;
  isRangeEnd: (day: Date) => boolean;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onDateClick: (date: Date) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  onCancel: () => void;
  onConfirm: () => void;
  monthOptions: Array<{ label: string; value: string; name: string }>;
  yearOptions: Array<{ label: string; value: string; name: string }>;
  calendarDays: Date[];
  weekDays: string[];
}

export default function DatePickerContent({
  currentMonth,
  selectedDate,
  isDateValid,
  isInRange,
  isRangeStart,
  isRangeEnd,
  onMonthChange,
  onYearChange,
  onDateClick,
  onKeyDown,
  onCancel,
  onConfirm,
  monthOptions,
  yearOptions,
  calendarDays,
  weekDays,
}: Readonly<DatePickerContentProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  return (
    <div className="datepicker-content">
      <div>
        <div className="date-label">{t("date")}</div>
        <div className="datepicker-header">
          <Dropdown
            label={t("month")}
            className="a-dropdown"
            name="datepicker-month"
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              onMonthChange(Number.parseInt(e.target.value));
            }}
            value={currentMonth?.getMonth()?.toString()}
            options={monthOptions}
          />
          <Dropdown
            label={t("year")}
            className="a-dropdown"
            name="datepicker-year"
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              onYearChange(Number.parseInt(e.target.value));
            }}
            value={currentMonth?.getFullYear()?.toString()}
            options={yearOptions}
          />
        </div>
      </div>
      <div className="datepicker-grid">
        {weekDays.map((day) => (
          <div key={day} className="datepicker-day-label">
            {day}
          </div>
        ))}
        {calendarDays.map((day) => {
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isDisabled = !isDateValid(day);
          const inRange = isInRange(day);
          const rangeStartDay = isRangeStart(day);
          const rangeEndDay = isRangeEnd(day);

          const classNames = [
            "datepicker-day",
            !isSameMonth(day, currentMonth) && "other-month",
            isSelected && "selected",
            isDisabled && "disabled",
            inRange && !rangeStartDay && !rangeEndDay && "in-range",
            rangeStartDay && "range-start",
            rangeEndDay && "range-end",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              type="button"
              key={day.toISOString()}
              className={classNames}
              aria-label={format(day, "MMMM d, yyyy")}
              aria-pressed={isSelected || rangeStartDay || rangeEndDay}
              disabled={isDisabled}
              onClick={() => !isDisabled && onDateClick(day)}
              onKeyDown={(e) => {
                onKeyDown(e);
                if ((e.key === "Enter" || e.key === " ") && !isDisabled) {
                  e.preventDefault();
                  onDateClick(day);
                }
              }}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      <div className="datepicker-footer">
        <Button
          mode="secondary"
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
        >
          {t("cancel")}
        </Button>
        <Button
          mode="primary"
          onClick={(e) => {
            e.stopPropagation();
            onConfirm();
          }}
        >
          {t("ok")}
        </Button>
      </div>
    </div>
  );
}
