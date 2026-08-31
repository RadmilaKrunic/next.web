import { Icon, TextField } from "@bosch/react-frok";
import DatePickerContent from "./DatePickerContent";
import Flyout from "../Flyout/Flyout";
import { useDatePicker } from "./hooks/useDatePicker";
import "./DatePicker.scss";
import { CalendarConfig } from "./DatePicker.types";

interface DatePickerProps {
  name: string;
  label: string;
  calendar?: CalendarConfig;
  disabled?: boolean;
}

export default function DatePicker({
  name,
  label,
  calendar,
  disabled = false,
}: Readonly<DatePickerProps>) {
  const {
    inputRef,
    containerRef,
    showCalendar,
    currentMonth,
    displayDate,
    displayValue,
    isDateValid,
    isInRange,
    isRangeStart,
    isRangeEnd,
    toggleCalendar,
    handleMonthChange,
    handleYearChange,
    handleDateClick,
    handleCancel,
    handleConfirm,
    handleCloseFlyout,
    handleInputChange,
    handleInputFocus,
    handleInputBlur,
    handleKeyDown,
    monthOptions,
    yearOptions,
    calendarDays,
    weekDays,
  } = useDatePicker({
    name,
    calendar,
  });

  return (
    <div className={`custom-date-picker ${disabled ? "disabled" : ""}`} ref={containerRef}>
      <div className="datetime-input" data-testid={`date-picker-input-${name}`}>
        <TextField
          ref={inputRef}
          id={name}
          label={label}
          type="text"
          value={displayValue}
          disabled={disabled}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onClick={calendar?.useDateInput && calendar?.useDatePicker ? toggleCalendar : undefined}
          onBlur={handleInputBlur}
          className="a-text-field text-field"
          readOnly={!calendar?.useDateInput}
          placeholder={
            calendar?.allowDateRange
              ? `${calendar?.dateFormat?.toLowerCase() || "dd.mm.yyyy"} - ${calendar?.dateFormat?.toLowerCase() || "dd.mm.yyyy"}`
              : calendar?.dateFormat?.toLowerCase() || "dd.mm.yyyy"
          }
        />
        <button
          type="button"
          className={`input-button ${calendar?.useDateInput ? "" : "readonly-mode"}`}
          onClick={calendar?.useDatePicker ? toggleCalendar : undefined}
          aria-label="Open calendar"
          disabled={disabled || !calendar?.useDatePicker || !calendar?.useDateInput}
        >
          <Icon iconName="calendar" aria-hidden="true" />
        </button>
      </div>

      <Flyout
        isOpen={showCalendar}
        onClose={handleCloseFlyout}
        triggerRef={containerRef}
        className="datepicker-flyout-wrapper"
        position="bottom-left"
        closeOnOutsideClick={true}
        closeOnEscape={true}
        ariaLabel="Date picker"
      >
        <div data-testid={`date-picker-flyout-${name}`}>
          <DatePickerContent
            currentMonth={currentMonth}
            selectedDate={displayDate}
            isDateValid={isDateValid}
            isInRange={isInRange}
            isRangeStart={isRangeStart}
            isRangeEnd={isRangeEnd}
            onMonthChange={handleMonthChange}
            onYearChange={handleYearChange}
            onDateClick={handleDateClick}
            onKeyDown={handleKeyDown}
            onCancel={handleCancel}
            onConfirm={handleConfirm}
            monthOptions={monthOptions}
            yearOptions={yearOptions}
            calendarDays={calendarDays}
            weekDays={weekDays}
          />
        </div>
      </Flyout>
    </div>
  );
}
