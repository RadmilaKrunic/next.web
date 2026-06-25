import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Button: ({
    label,
    onClick,
    children,
  }: {
    label?: string;
    onClick?: (e: React.MouseEvent) => void;
    children?: React.ReactNode;
  }) =>
    React.createElement("button", { onClick, "data-testid": label ?? "btn" }, label ?? children),
  Icon: ({ onClick, title }: { onClick?: () => void; title?: string }) =>
    React.createElement("span", { role: "button", onClick, title }),
  Popover: ({
    children,
    trigger,
    open,
  }: {
    children?: React.ReactNode;
    trigger: React.ReactNode;
    open: boolean;
  }) =>
    React.createElement(
      "div",
      null,
      trigger,
      open ? React.createElement("div", { "data-testid": "popover-content" }, children) : null,
    ),
}));

vi.mock("components/generics/Area/GenericArea", () => ({
  default: ({ area }: { area: { name: string } }) =>
    React.createElement("div", { "data-testid": `area-${area.name}` }),
}));

vi.mock("./FiltersChips", () => ({
  default: () => React.createElement("div", { "data-testid": "filters-chips" }),
}));

import FiltersPopup from "./FiltersPopup";
import Section from "components/generics/Section/GenericSection.types";

const mockSection: Section = {
  name: "filters",
  label: "",
  areas: [
    {
      name: "statusArea",
      label: "Status",
      position: 0,
      fields: [{ name: "status", label: "Status", type: "dropdown" }],
    },
  ],
} as unknown as Section;

describe("FiltersPopup", () => {
  it("renders the trigger icon", () => {
    render(React.createElement(FiltersPopup, { filters: mockSection }));
    expect(screen.getByRole("button", { name: "filters" })).toBeInTheDocument();
  });

  it("popover is closed by default", () => {
    render(React.createElement(FiltersPopup, { filters: mockSection }));
    expect(screen.queryByTestId("popover-content")).not.toBeInTheDocument();
  });

  it("opens popover when icon is clicked", () => {
    render(React.createElement(FiltersPopup, { filters: mockSection }));
    fireEvent.click(screen.getByRole("button", { name: "filters" }));
    expect(screen.getByTestId("popover-content")).toBeInTheDocument();
  });

  it("renders GenericArea for each filter area when open", () => {
    render(React.createElement(FiltersPopup, { filters: mockSection }));
    fireEvent.click(screen.getByRole("button", { name: "filters" }));
    expect(screen.getByTestId("area-statusArea")).toBeInTheDocument();
  });

  it("renders FiltersChips when open", () => {
    render(React.createElement(FiltersPopup, { filters: mockSection }));
    fireEvent.click(screen.getByRole("button", { name: "filters" }));
    expect(screen.getByTestId("filters-chips")).toBeInTheDocument();
  });

  it("calls applyAdvancedFilters with current values when save is clicked", () => {
    const applyAdvancedFilters = vi.fn();
    render(React.createElement(FiltersPopup, { filters: mockSection, applyAdvancedFilters }));
    fireEvent.click(screen.getByRole("button", { name: "filters" }));
    fireEvent.click(screen.getByTestId("save"));
    expect(applyAdvancedFilters).toHaveBeenCalled();
  });

  it("calls resetAdvancedFilters when reset button is clicked", () => {
    const resetAdvancedFilters = vi.fn();
    render(React.createElement(FiltersPopup, { filters: mockSection, resetAdvancedFilters }));
    fireEvent.click(screen.getByRole("button", { name: "filters" }));
    fireEvent.click(screen.getByTestId("resetAllFilters"));
    expect(resetAdvancedFilters).toHaveBeenCalled();
  });

  it("closes popover after save is clicked", () => {
    const applyAdvancedFilters = vi.fn();
    render(React.createElement(FiltersPopup, { filters: mockSection, applyAdvancedFilters }));
    fireEvent.click(screen.getByRole("button", { name: "filters" }));
    fireEvent.click(screen.getByTestId("save"));
    expect(screen.queryByTestId("popover-content")).not.toBeInTheDocument();
  });

  it("initializes with activeFilters values", () => {
    render(
      React.createElement(FiltersPopup, {
        filters: mockSection,
        activeFilters: [{ name: "status", value: "OPEN" }],
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "filters" }));
    expect(screen.getByTestId("filters-chips")).toBeInTheDocument();
  });
});
