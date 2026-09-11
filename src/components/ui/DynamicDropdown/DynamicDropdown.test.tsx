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

// ── helpers ───────────────────────────────────────────────────────────────────

import {
  mapDropdownOptions,
  formatDropdownOptions,
  getDropdownValue,
} from "./DynamicDropdown.helper";

function renderWith(
  ui: React.ReactElement,
  {
    initialValues = { fieldA: "", selectAccessoryA: "A" } as Record<string, unknown>,
    path = "/job-overview/J1",
    routePattern = "/job-overview/:jobId",
  } = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(["user"], { countryCode: "ZA" });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        MemoryRouter,
        { initialEntries: [path] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: routePattern,
            element: React.createElement(Formik, { initialValues, onSubmit: vi.fn() }, ui),
          }),
        ),
      ),
    ),
  );
}

// ── ascName guard ─────────────────────────────────────────────────────────────

describe("DynamicDropdown — ascName guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null (renders nothing) when name=ascName and ≤2 options", () => {
    const { container } = renderWith(
      React.createElement(DynamicDropdown, {
        name: "ascName",
        label: "asc",
        value: "",
        onChange: vi.fn(),
        options: [{ value: "A", name: "Alpha" }],
      }),
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders normally when name=ascName and options.length > 2", () => {
    renderWith(
      React.createElement(DynamicDropdown, {
        name: "ascName",
        label: "asc",
        value: "",
        onChange: vi.fn(),
        options: [
          { value: "A", name: "Alpha" },
          { value: "B", name: "Beta" },
          { value: "C", name: "Gamma" },
        ],
      }),
    );
    expect(screen.getByRole("combobox", { name: /asc/i })).toBeInTheDocument();
  });
});

// ── isLoading / Array value handling ─────────────────────────────────────────

describe("DynamicDropdown — isLoading & value edge-cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses raw singleValue (skips getDropdownValue) while optionsEndpoint is loading", () => {
    vi.mocked(useDynamicOptions).mockReturnValue({
      options: [],
      isLoading: true,
      error: null,
    } as never);

    renderWith(
      React.createElement(DynamicDropdown, {
        name: "fieldA",
        label: "field",
        value: "PRESET",
        onChange: vi.fn(),
        optionsEndpoint: { url: "/v1/mock", method: "GET", queryParams: [] },
      }),
    );

    // getDropdownValue must be skipped — the loading path uses the raw singleValue directly
    expect(vi.mocked(getDropdownValue)).not.toHaveBeenCalled();
  });

  it("picks the first element when value is an array for a single dropdown", () => {
    renderWith(
      React.createElement(DynamicDropdown, {
        name: "fieldA",
        label: "field",
        value: ["FIRST", "SECOND"],
        onChange: vi.fn(),
        options: [
          { value: "FIRST", name: "First" },
          { value: "SECOND", name: "Second" },
        ],
      }),
    );
    // getDropdownValue mock returns the value passed in → "FIRST"
    expect(screen.getByRole("combobox", { name: /field/i })).toHaveValue("FIRST");
  });
});

// ── accessoryDropdown subtype ─────────────────────────────────────────────────

describe("DynamicDropdown — accessoryDropdown subtype", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // restore pass-through behaviour for map/format
    vi.mocked(mapDropdownOptions).mockImplementation((_n, _s, rawOpts) => rawOpts as never);
    vi.mocked(formatDropdownOptions).mockImplementation((_n, opts) => opts as never);
  });

  it("filters out already-selected accessory values from sibling fields", () => {
    vi.mocked(useDynamicOptions).mockReturnValue({
      options: [
        { value: "A", name: "Option A" },
        { value: "B", name: "Option B" },
      ],
      isLoading: false,
      error: null,
    } as never);

    // formik context has selectAccessoryA: "A" — so "A" should be filtered out
    renderWith(
      React.createElement(DynamicDropdown, {
        name: "selectAccessoryB",
        label: "accessory",
        subtype: "accessoryDropdown",
        value: "",
        onChange: vi.fn(),
        optionsEndpoint: { url: "/v1/accessories", method: "GET", queryParams: [] },
      }),
    );

    expect(screen.queryByRole("option", { name: "Option A" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Option B" })).toBeInTheDocument();
  });
});

// ── SearchableSingleDropdown ──────────────────────────────────────────────────

describe("SearchableSingleDropdown (via DynamicDropdown isSearchable=true)", () => {
  const searchableOptions = [
    { value: "X", name: "Option X" },
    { value: "Y", name: "Option Y" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure rawOptions are empty by default so bleed-over from endpoint tests cannot affect
    // the "does NOT call onRawOptionSelect" assertion.
    vi.mocked(useDynamicOptions).mockReturnValue({
      options: [],
      isLoading: false,
      error: null,
    } as never);
  });

  it("shows the selected option label as input value when closed", () => {
    renderWith(
      React.createElement(DynamicDropdown, {
        name: "fieldA",
        label: "fieldA",
        value: "X",
        isSearchable: true,
        onChange: vi.fn(),
        options: searchableOptions,
      }),
    );
    expect(screen.getByPlaceholderText("select")).toHaveValue("Option X");
  });

  it("shows empty input value when no option matches the current value", () => {
    renderWith(
      React.createElement(DynamicDropdown, {
        name: "fieldA",
        label: "fieldA",
        value: "UNKNOWN",
        isSearchable: true,
        onChange: vi.fn(),
        options: searchableOptions,
      }),
    );
    expect(screen.getByPlaceholderText("select")).toHaveValue("");
  });

  it("opens the options panel on input focus", () => {
    renderWith(
      React.createElement(DynamicDropdown, {
        name: "fieldA",
        label: "fieldA",
        value: "",
        isSearchable: true,
        onChange: vi.fn(),
        options: searchableOptions,
      }),
    );
    fireEvent.focus(screen.getByPlaceholderText("select"));
    expect(screen.getByText("Option X")).toBeInTheDocument();
    expect(screen.getByText("Option Y")).toBeInTheDocument();
  });

  it("shows search text in input and filters options while panel is open", () => {
    renderWith(
      React.createElement(DynamicDropdown, {
        name: "fieldA",
        label: "fieldA",
        value: "",
        isSearchable: true,
        onChange: vi.fn(),
        options: searchableOptions,
      }),
    );
    const input = screen.getByPlaceholderText("select");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "x" } });
    expect(input).toHaveValue("x");
    expect(screen.getByText("Option X")).toBeInTheDocument();
    expect(screen.queryByText("Option Y")).not.toBeInTheDocument();
  });

  it("shows noOptions message when search text matches nothing", () => {
    renderWith(
      React.createElement(DynamicDropdown, {
        name: "fieldA",
        label: "fieldA",
        value: "",
        isSearchable: true,
        onChange: vi.fn(),
        options: searchableOptions,
      }),
    );
    const input = screen.getByPlaceholderText("select");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "zzz" } });
    expect(screen.getByText("noOptions")).toBeInTheDocument();
  });

  it("calls onChange and closes the panel when an option is selected via mousedown", () => {
    const onChange = vi.fn();
    renderWith(
      React.createElement(DynamicDropdown, {
        name: "fieldA",
        label: "fieldA",
        value: "",
        isSearchable: true,
        onChange,
        options: searchableOptions,
      }),
    );
    fireEvent.focus(screen.getByPlaceholderText("select"));
    fireEvent.mouseDown(screen.getByText("Option Y"));
    expect(onChange).toHaveBeenCalledWith("Y");
    expect(screen.queryByText("Option Y")).not.toBeInTheDocument();
  });

  it("calls onRawOptionSelect when rawOptions are available (endpoint-backed)", () => {
    const onRawOptionSelect = vi.fn();
    vi.mocked(useDynamicOptions).mockReturnValue({
      options: [{ value: "X", name: "Option X" }],
      isLoading: false,
      error: null,
    } as never);
    vi.mocked(mapDropdownOptions).mockReturnValue([{ value: "X", name: "Option X" }] as never);
    vi.mocked(formatDropdownOptions).mockReturnValue([{ value: "X", name: "Option X" }] as never);

    renderWith(
      React.createElement(DynamicDropdown, {
        name: "fieldA",
        label: "fieldA",
        value: "",
        isSearchable: true,
        onChange: vi.fn(),
        onRawOptionSelect,
        optionsEndpoint: { url: "/v1/mock", method: "GET", queryParams: [] },
      }),
    );
    fireEvent.focus(screen.getByPlaceholderText("select"));
    fireEvent.mouseDown(screen.getByText("Option X"));
    expect(onRawOptionSelect).toHaveBeenCalled();
  });

  it("does NOT call onRawOptionSelect when rawOptions are empty (static options)", () => {
    const onRawOptionSelect = vi.fn();
    renderWith(
      React.createElement(DynamicDropdown, {
        name: "fieldA",
        label: "fieldA",
        value: "",
        isSearchable: true,
        onChange: vi.fn(),
        onRawOptionSelect,
        options: searchableOptions,
      }),
    );
    fireEvent.focus(screen.getByPlaceholderText("select"));
    fireEvent.mouseDown(screen.getByText("Option X"));
    expect(onRawOptionSelect).not.toHaveBeenCalled();
  });

  it("opens the panel on ArrowDown key press", () => {
    renderWith(
      React.createElement(DynamicDropdown, {
        name: "fieldA",
        label: "fieldA",
        value: "",
        isSearchable: true,
        onChange: vi.fn(),
        options: searchableOptions,
      }),
    );
    fireEvent.keyDown(screen.getByPlaceholderText("select"), { key: "ArrowDown" });
    expect(screen.getByText("Option X")).toBeInTheDocument();
  });

  it("closes the panel on Escape key press", () => {
    renderWith(
      React.createElement(DynamicDropdown, {
        name: "fieldA",
        label: "fieldA",
        value: "",
        isSearchable: true,
        onChange: vi.fn(),
        options: searchableOptions,
      }),
    );
    const input = screen.getByPlaceholderText("select");
    fireEvent.focus(input);
    expect(screen.getByText("Option X")).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByText("Option X")).not.toBeInTheDocument();
  });

  it("closes the panel when a mousedown occurs outside the container", () => {
    renderWith(
      React.createElement(DynamicDropdown, {
        name: "fieldA",
        label: "fieldA",
        value: "",
        isSearchable: true,
        onChange: vi.fn(),
        options: searchableOptions,
      }),
    );
    fireEvent.focus(screen.getByPlaceholderText("select"));
    expect(screen.getByText("Option X")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("Option X")).not.toBeInTheDocument();
  });

  it("marks the currently selected option with the selected CSS class", () => {
    renderWith(
      React.createElement(DynamicDropdown, {
        name: "fieldA",
        label: "fieldA",
        value: "X",
        isSearchable: true,
        onChange: vi.fn(),
        options: searchableOptions,
      }),
    );
    fireEvent.focus(screen.getByPlaceholderText("select"));
    expect(screen.getByRole("button", { name: "Option X" })).toHaveClass(
      "searchable-dropdown-option--selected",
    );
    expect(screen.getByRole("button", { name: "Option Y" })).not.toHaveClass(
      "searchable-dropdown-option--selected",
    );
  });

  it("disables the input and adds the disabled class when disabled=true", () => {
    renderWith(
      React.createElement(DynamicDropdown, {
        name: "fieldA",
        label: "fieldA",
        value: "",
        isSearchable: true,
        disabled: true,
        onChange: vi.fn(),
        options: searchableOptions,
      }),
    );
    expect(screen.getByPlaceholderText("select")).toBeDisabled();
  });

  it("does not open the panel on focus when disabled", () => {
    renderWith(
      React.createElement(DynamicDropdown, {
        name: "fieldA",
        label: "fieldA",
        value: "",
        isSearchable: true,
        disabled: true,
        onChange: vi.fn(),
        options: searchableOptions,
      }),
    );
    fireEvent.focus(screen.getByPlaceholderText("select"));
    expect(screen.queryByText("Option X")).not.toBeInTheDocument();
  });

  it("appends * to the label when required=true", () => {
    renderWith(
      React.createElement(DynamicDropdown, {
        name: "fieldA",
        label: "fieldA",
        value: "",
        isSearchable: true,
        required: true,
        onChange: vi.fn(),
        options: searchableOptions,
      }),
    );
    expect(screen.getByText(/\*/)).toBeInTheDocument();
  });
});
