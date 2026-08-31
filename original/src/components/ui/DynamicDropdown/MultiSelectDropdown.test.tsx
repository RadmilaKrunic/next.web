import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Dropdown: ({
    label,
    onMouseDown,
    onKeyDown,
    disabled,
  }: {
    label: string;
    onMouseDown?: (e: React.MouseEvent) => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    disabled?: boolean;
  }) =>
    React.createElement("button", { "aria-label": label, onMouseDown, onKeyDown, disabled }, label),
  Checkbox: ({
    id,
    label,
    checked,
    onChange,
  }: {
    id: string;
    label: string;
    checked?: boolean;
    onChange?: () => void;
  }) =>
    React.createElement(
      "label",
      { htmlFor: id },
      React.createElement("input", { id, type: "checkbox", checked, onChange }),
      label,
    ),
}));

import MultiSelectDropdown from "./MultiSelectDropdown";

const baseProps = {
  name: "test",
  label: "multi",
  options: [
    { value: "A", name: "Option A", key: "A" },
    { value: "B", name: "Option B", key: "B" },
  ],
  selectedValues: ["A"],
  onChange: vi.fn(),
};

describe("MultiSelectDropdown", () => {
  it("opens panel on trigger mouse down", () => {
    render(React.createElement(MultiSelectDropdown, baseProps));

    fireEvent.mouseDown(screen.getByRole("button", { name: /multi/i }));

    expect(screen.getByText("Option A")).toBeInTheDocument();
  });

  it("toggles value from checkbox click", () => {
    render(React.createElement(MultiSelectDropdown, baseProps));

    fireEvent.mouseDown(screen.getByRole("button", { name: /multi/i }));
    fireEvent.click(screen.getByLabelText("Option B"));

    expect(baseProps.onChange).toHaveBeenCalled();
  });

  it("shows empty message when no options", () => {
    render(
      React.createElement(MultiSelectDropdown, {
        ...baseProps,
        options: [],
      }),
    );

    fireEvent.mouseDown(screen.getByRole("button", { name: /multi/i }));
    expect(screen.getByText("noOptions")).toBeInTheDocument();
  });
});
