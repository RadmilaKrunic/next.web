import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

vi.mock("@bosch/react-frok", () => ({
  Icon: ({ iconName }: { iconName: string }) =>
    React.createElement("span", { "data-testid": `icon-${iconName}` }),
  TextField: ({
    id,
    value,
    onChange,
    onFocus,
    onBlur,
    onClick,
    label,
    disabled,
    readOnly,
    placeholder,
  }: {
    id: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    onClick?: () => void;
    label?: string;
    disabled?: boolean;
    readOnly?: boolean;
    placeholder?: string;
  }) =>
    React.createElement("input", {
      id,
      "aria-label": label,
      value,
      disabled,
      readOnly,
      placeholder,
      onChange,
      onFocus,
      onBlur,
      onClick,
    }),
}));

vi.mock("./DatePickerContent", () => ({
  default: ({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) =>
    React.createElement(
      "div",
      { "data-testid": "date-picker-content" },
      React.createElement("button", { onClick: onConfirm }, "confirm"),
      React.createElement("button", { onClick: onCancel }, "cancel"),
    ),
}));

vi.mock("../Flyout/Flyout", () => ({
  default: ({ isOpen, children }: { isOpen: boolean; children?: React.ReactNode }) =>
    isOpen ? React.createElement("div", { "data-testid": "flyout" }, children) : null,
}));

vi.mock("./hooks/useDatePicker", () => ({
  useDatePicker: vi.fn((props: { name: string }) => ({
    inputRef: { current: null },
    containerRef: { current: null },
    showCalendar: false,
    currentMonth: new Date("2024-01-01"),
    displayDate: new Date("2024-01-02"),
    displayValue: "02.01.2024",
    isDateValid: () => true,
    isInRange: () => false,
    isRangeStart: () => false,
    isRangeEnd: () => false,
    toggleCalendar: vi.fn(),
    handleMonthChange: vi.fn(),
    handleYearChange: vi.fn(),
    handleDateClick: vi.fn(),
    handleCancel: vi.fn(),
    handleConfirm: vi.fn(),
    handleCloseFlyout: vi.fn(),
    handleInputChange: vi.fn(),
    handleInputFocus: vi.fn(),
    handleInputBlur: vi.fn(),
    handleKeyDown: vi.fn(),
    monthOptions: [],
    yearOptions: [],
    calendarDays: [],
    weekDays: [],
    name: props.name,
  })),
}));

import DatePicker from "./DatePicker";
import { useDatePicker } from "./hooks/useDatePicker";

const baseCalendar = {
  useDateInput: true,
  useDatePicker: true,
  allowDateRange: false,
  dateFormat: "DD.MM.YYYY",
};

describe("DatePicker", () => {
  it("renders input and calendar button", () => {
    render(
      React.createElement(DatePicker, {
        name: "createdAt",
        label: "Created At",
        calendar: baseCalendar as never,
      }),
    );

    expect(screen.getByLabelText("Created At")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open calendar" })).toBeInTheDocument();
  });

  it("applies disabled state", () => {
    render(
      React.createElement(DatePicker, {
        name: "createdAt",
        label: "Created At",
        calendar: baseCalendar as never,
        disabled: true,
      }),
    );

    expect(screen.getByLabelText("Created At")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Open calendar" })).toBeDisabled();
  });

  it("uses range placeholder when allowDateRange=true", () => {
    render(
      React.createElement(DatePicker, {
        name: "createdAt",
        label: "Created At",
        calendar: { ...baseCalendar, allowDateRange: true } as never,
      }),
    );

    expect(screen.getByPlaceholderText("dd.mm.yyyy - dd.mm.yyyy")).toBeInTheDocument();
  });

  it("uses single placeholder when allowDateRange=false", () => {
    render(
      React.createElement(DatePicker, {
        name: "createdAt",
        label: "Created At",
        calendar: { ...baseCalendar, allowDateRange: false } as never,
      }),
    );

    expect(screen.getByPlaceholderText("dd.mm.yyyy")).toBeInTheDocument();
  });

  it("clicking input triggers onClick when date input + picker enabled", () => {
    const toggleCalendar = vi.fn();
    vi.mocked(useDatePicker).mockReturnValue({
      ...vi.mocked(useDatePicker).mock.results[0]?.value,
      showCalendar: false,
      toggleCalendar,
    } as never);

    render(
      React.createElement(DatePicker, {
        name: "createdAt",
        label: "Created At",
        calendar: baseCalendar as never,
      }),
    );

    fireEvent.click(screen.getByLabelText("Created At"));
    expect(toggleCalendar).toHaveBeenCalled();
  });

  it("renders flyout and content when showCalendar=true", () => {
    vi.mocked(useDatePicker).mockReturnValue({
      ...vi.mocked(useDatePicker).mock.results[0]?.value,
      showCalendar: true,
    } as never);

    render(
      React.createElement(DatePicker, {
        name: "createdAt",
        label: "Created At",
        calendar: baseCalendar as never,
      }),
    );

    expect(screen.getByTestId("flyout")).toBeInTheDocument();
    expect(screen.getByTestId("date-picker-content")).toBeInTheDocument();
  });

  it("input becomes readOnly when useDateInput=false", () => {
    render(
      React.createElement(DatePicker, {
        name: "createdAt",
        label: "Created At",
        calendar: { ...baseCalendar, useDateInput: false } as never,
      }),
    );

    expect(screen.getByLabelText("Created At")).toHaveAttribute("readonly");
  });
});
