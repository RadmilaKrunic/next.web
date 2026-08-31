import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@bosch/react-frok", () => ({
  Chip: ({
    label,
    onClick,
    onKeyDown,
  }: {
    label: string;
    onClick?: () => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
  }) => React.createElement("button", { onClick, onKeyDown }, label),
  TextField: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
  }) =>
    React.createElement("input", { value, onChange, placeholder, "data-testid": "search-input" }),
  Button: ({ label, onClick }: { label: string; onClick?: () => void }) =>
    React.createElement("button", { onClick, "data-testid": "action-btn" }, label),
}));
vi.mock("./FiltersPopup/FiltersPopup", () => ({
  default: () => React.createElement("div", { "data-testid": "filters-popup" }),
}));
vi.mock("./FiltersOptionsPopup/FiltersOptionsPopup", () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "options-popup" }, children),
}));

import Filters from "./Filters";

describe("Filters", () => {
  it("renders search input", () => {
    render(React.createElement(Filters, { searchValue: "", onSearchChange: vi.fn() }));
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
  });

  it("renders quick filter chips", () => {
    const quickFilters = [
      { key: "open", label: "open", selected: false },
      { key: "closed", label: "closed", selected: true },
    ];
    render(React.createElement(Filters, { quickFilters, onToggleFilter: vi.fn() }));
    expect(screen.getByText("open")).toBeInTheDocument();
    expect(screen.getByText("closed")).toBeInTheDocument();
  });

  it("calls onToggleFilter when chip clicked", () => {
    const onToggleFilter = vi.fn();
    const quickFilters = [{ key: "open", label: "open", selected: false }];
    render(React.createElement(Filters, { quickFilters, onToggleFilter }));
    fireEvent.click(screen.getByText("open"));
    expect(onToggleFilter).toHaveBeenCalledWith("open");
  });

  it("calls onToggleFilter on Enter key", () => {
    const onToggleFilter = vi.fn();
    const quickFilters = [{ key: "open", label: "open", selected: false }];
    render(React.createElement(Filters, { quickFilters, onToggleFilter }));
    fireEvent.keyDown(screen.getByText("open"), { key: "Enter" });
    expect(onToggleFilter).toHaveBeenCalledWith("open");
  });

  it("shows FiltersPopup when filters prop provided", () => {
    const filters = [{ key: "status", label: "Status", options: [] }] as never;
    render(React.createElement(Filters, { filters }));
    expect(screen.getByTestId("filters-popup")).toBeInTheDocument();
  });

  it("shows action button when actionButton prop provided", () => {
    const actionButton = { label: "Create Job", icon: "add", onClick: vi.fn() };
    render(React.createElement(Filters, { actionButton }));
    expect(screen.getByTestId("action-btn")).toBeInTheDocument();
  });

  it("shows options popup when optionsContent provided", () => {
    render(
      React.createElement(Filters, { optionsContent: React.createElement("div", null, "options") }),
    );
    expect(screen.getByTestId("options-popup")).toBeInTheDocument();
  });

  it("calls onSearchChange on input change", () => {
    const onSearchChange = vi.fn();
    render(React.createElement(Filters, { searchValue: "", onSearchChange }));
    fireEvent.change(screen.getByTestId("search-input"), { target: { value: "test" } });
    expect(onSearchChange).toHaveBeenCalledWith("test");
  });
});
