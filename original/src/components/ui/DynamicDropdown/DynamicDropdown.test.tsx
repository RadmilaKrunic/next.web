import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { Formik } from "formik";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Dropdown: ({
    label,
    name,
    value,
    options,
    onChange,
    disabled,
  }: {
    label: string;
    name: string;
    value: string;
    options: Array<{ value: string; name: string }>;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    disabled?: boolean;
  }) =>
    React.createElement(
      "label",
      null,
      label,
      React.createElement(
        "select",
        { "aria-label": label, name, value, onChange, disabled },
        options.map((option) =>
          React.createElement("option", { key: option.value, value: option.value }, option.name),
        ),
      ),
    ),
}));

vi.mock("./MultiSelectDropdown", () => ({
  default: ({ name }: { name: string }) =>
    React.createElement("div", { "data-testid": "multi-select" }, name),
}));

vi.mock("./useDynamicOptions", () => ({
  useDynamicOptions: vi.fn(() => ({ options: [], isLoading: false })),
}));

vi.mock("./DynamicDropdown.helper", () => ({
  mapDropdownOptions: vi.fn((_name, _subtype, rawOptions) => rawOptions),
  formatDropdownOptions: vi.fn((_name, options) => options),
  translateStaticOptions: vi.fn((_name, options) => options),
  resolveQueryParams: vi.fn(() => []),
  validateRequiredParams: vi.fn(() => true),
  getDropdownValue: vi.fn((_name, _subtype, _options, value) => value ?? ""),
  findRawOption: vi.fn((_name, _subtype, rawOptions, selectedValue) =>
    rawOptions.find((r: { value: string }) => r.value === selectedValue),
  ),
}));

import DynamicDropdown from "./DynamicDropdown";
import { useDynamicOptions } from "./useDynamicOptions";

function renderDropdown(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(["user"], { countryCode: "ZA" });

  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/job-overview/J1"] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: "/job-overview/:jobId",
            element: React.createElement(
              Formik,
              { initialValues: { fieldA: "", selectAccessoryA: "A" }, onSubmit: vi.fn() },
              ui,
            ),
          }),
        ),
      ),
    ),
  );
}

describe("DynamicDropdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders static dropdown and handles single change", () => {
    const onChange = vi.fn();

    renderDropdown(
      React.createElement(DynamicDropdown, {
        name: "fieldA",
        label: "status",
        value: "OPEN",
        onChange,
        options: [
          { value: "OPEN", name: "Open" },
          { value: "CLOSED", name: "Closed" },
        ],
      }),
    );

    const select = screen.getByRole("combobox", { name: /status/i }) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "CLOSED" } });

    expect(onChange).toHaveBeenCalledWith("CLOSED");
  });

  it("renders multiselect component when multiSelect=true", () => {
    renderDropdown(
      React.createElement(DynamicDropdown, {
        name: "fieldA",
        label: "status",
        value: ["OPEN"],
        multiSelect: true,
        onChange: vi.fn(),
        options: [{ value: "OPEN", name: "Open" }],
      }),
    );

    expect(screen.getByTestId("multi-select")).toBeInTheDocument();
  });

  it("calls onRawOptionSelect for endpoint-backed dropdown", () => {
    const onRawOptionSelect = vi.fn();
    vi.mocked(useDynamicOptions).mockReturnValue({
      options: [{ value: "R1", name: "Raw One" }],
      isLoading: false,
      error: null,
    } as never);

    renderDropdown(
      React.createElement(DynamicDropdown, {
        name: "faultCodeDropdown",
        label: "faultCode",
        value: "R1",
        onChange: vi.fn(),
        onRawOptionSelect,
        optionsEndpoint: {
          url: "/v1/mock",
          method: "GET",
          queryParams: [],
        },
      }),
    );

    fireEvent.change(screen.getByRole("combobox", { name: /faultCode/i }), {
      target: { value: "R1" },
    });
    expect(onRawOptionSelect).toHaveBeenCalled();
  });
});
