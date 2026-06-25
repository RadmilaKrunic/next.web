import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Dropdown: ({
    label,
    value,
    options,
    onChange,
  }: {
    label: string;
    value: string;
    options: Array<{ value: string; name: string }>;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  }) =>
    React.createElement(
      "label",
      null,
      label,
      React.createElement(
        "select",
        { "aria-label": label, value, onChange },
        options.map((option) =>
          React.createElement("option", { key: option.value, value: option.value }, option.name),
        ),
      ),
    ),
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick: (e: React.MouseEvent) => void;
  }) => React.createElement("button", { onClick }, children),
}));

import DatePickerContent from "./DatePickerContent";

const baseProps = {
  currentMonth: new Date("2024-01-01"),
  selectedDate: new Date("2024-01-10"),
  isDateValid: () => true,
  isInRange: () => false,
  isRangeStart: () => false,
  isRangeEnd: () => false,
  onMonthChange: vi.fn(),
  onYearChange: vi.fn(),
  onDateClick: vi.fn(),
  onKeyDown: vi.fn(),
  onCancel: vi.fn(),
  onConfirm: vi.fn(),
  monthOptions: [{ value: "0", name: "Jan", label: "Jan" }],
  yearOptions: [{ value: "2024", name: "2024", label: "2024" }],
  calendarDays: [new Date("2024-01-10"), new Date("2024-01-11")],
  weekDays: ["Mo", "Tu"],
};

describe("DatePickerContent", () => {
  it("renders day labels and date buttons", () => {
    render(React.createElement(DatePickerContent, baseProps));

    expect(screen.getByText("Mo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /January 10, 2024/i })).toBeInTheDocument();
  });

  it("calls month and year change handlers", () => {
    render(React.createElement(DatePickerContent, baseProps));

    fireEvent.change(screen.getByLabelText("month"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("year"), { target: { value: "2024" } });

    expect(baseProps.onMonthChange).toHaveBeenCalledWith(0);
    expect(baseProps.onYearChange).toHaveBeenCalledWith(2024);
  });

  it("handles cancel and confirm clicks", () => {
    render(React.createElement(DatePickerContent, baseProps));

    fireEvent.click(screen.getByRole("button", { name: "cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "ok" }));

    expect(baseProps.onCancel).toHaveBeenCalled();
    expect(baseProps.onConfirm).toHaveBeenCalled();
  });
});
