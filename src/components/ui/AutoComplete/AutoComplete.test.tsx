import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  TextField: ({
    id,
    name,
    label,
    value,
    onChange,
    onKeyDown,
    onBlur,
    onClick,
    disabled,
  }: {
    id: string;
    name: string;
    label: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onBlur?: () => void;
    onClick?: () => void;
    disabled?: boolean;
  }) =>
    React.createElement("input", {
      id,
      name,
      "aria-label": label,
      value,
      onChange,
      onKeyDown,
      onBlur,
      onClick,
      disabled,
    }),
}));

vi.mock("./OptionItem/OptionItem", () => ({
  default: ({
    option,
    onSelect,
    isHighlighted,
  }: {
    option: { label?: string; id?: string };
    onSelect: (option: unknown) => void;
    isHighlighted: boolean;
  }) =>
    React.createElement(
      "button",
      {
        onClick: () => onSelect(option),
        "data-testid": `option-${option.id ?? option.label}`,
        "data-highlighted": isHighlighted,
      },
      option.label ?? option.id,
    ),
}));

vi.mock("hooks/useDebouncedValue", () => ({
  useDebouncedValue: (v: string) => v,
}));

vi.mock("./AutoComplete.helper", () => ({
  customerAutocompleteFields: ["customerName"],
  getAutocompleteOptions: vi.fn(),
  getAutoCompleteValue: vi.fn(
    (option: { label?: string; value?: string }) => option.value ?? option.label ?? "",
  ),
}));

vi.mock("../TooltipContent/InfoIconWithTooltip", () => ({
  default: ({ name, infoText }: { name: string; infoText: string }) =>
    React.createElement("div", { "data-testid": `info-${name}` }, infoText),
}));

import AutoComplete from "./AutoComplete";
import { getAutocompleteOptions } from "./AutoComplete.helper";

// jsdom does not implement scrollIntoView; the highlighted-option effect calls it
// whenever the highlighted index changes, so stub it to avoid a hard failure.
beforeAll(() => {
  globalThis.HTMLElement.prototype.scrollIntoView = vi.fn();
});

function renderWithProviders(ui: React.ReactElement, userData?: unknown) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (userData) {
    qc.setQueryData(["user"], userData);
  }
  return render(React.createElement(QueryClientProvider, { client: qc }, ui));
}

describe("AutoComplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAutocompleteOptions).mockResolvedValue([
      { id: "1", label: "Option One", value: "OPTION_ONE" },
      { id: "2", label: "Option Two", value: "OPTION_TWO" },
    ] as never);
  });

  it("renders input", () => {
    renderWithProviders(
      React.createElement(AutoComplete, { name: "customerName", label: "Customer" }),
    );
    expect(screen.getByLabelText("Customer")).toBeInTheDocument();
  });

  it("calls onChange when user types", () => {
    const onChange = vi.fn();
    renderWithProviders(
      React.createElement(AutoComplete, {
        name: "customerName",
        label: "Customer",
        value: "seed",
        onChange,
      }),
      { ascId: "ASC", countryCode: "ZA" },
    );

    fireEvent.change(screen.getByLabelText("Customer"), { target: { value: "abc" } });
    expect(onChange).toHaveBeenCalledWith("abc");
  });

  it("renders info icon when isInfoIcon=true", () => {
    renderWithProviders(
      React.createElement(AutoComplete, {
        name: "customerName",
        label: "Customer",
        isInfoIcon: true,
        infoText: "info text",
      }),
    );

    expect(screen.getByTestId("info-customerName")).toBeInTheDocument();
  });

  it("sets validation false for baretoolnumber when typing value", () => {
    const onValidation = vi.fn();
    renderWithProviders(
      React.createElement(AutoComplete, {
        name: "bareToolNumber",
        label: "Bare tool",
        value: "seed",
        onValidation,
      }),
      { ascId: "ASC", countryCode: "ZA" },
    );

    fireEvent.change(screen.getByLabelText("Bare tool"), { target: { value: "BT-1" } });
    expect(onValidation).toHaveBeenCalledWith(false);
  });

  it("sets validation true when baretoolnumber is cleared", () => {
    const onValidation = vi.fn();
    renderWithProviders(
      React.createElement(AutoComplete, {
        name: "bareToolNumber",
        label: "Bare tool",
        value: "seed",
        onValidation,
      }),
      { ascId: "ASC", countryCode: "ZA" },
    );

    fireEvent.change(screen.getByLabelText("Bare tool"), { target: { value: "" } });
    expect(onValidation).toHaveBeenCalledWith(true);
  });

  it("sets validation false for sparepartnumber when typing value", () => {
    const onValidation = vi.fn();
    renderWithProviders(
      React.createElement(AutoComplete, {
        name: "sparePartNumber",
        label: "Spare part",
        value: "seed",
        onValidation,
      }),
      { ascId: "ASC", countryCode: "ZA" },
    );

    fireEvent.change(screen.getByLabelText("Spare part"), { target: { value: "SP-1" } });
    expect(onValidation).toHaveBeenCalledWith(false);
  });

  it("sets validation true when sparepartnumber is cleared", () => {
    const onValidation = vi.fn();
    renderWithProviders(
      React.createElement(AutoComplete, {
        name: "sparePartNumber",
        label: "Spare part",
        value: "seed",
        onValidation,
      }),
      { ascId: "ASC", countryCode: "ZA" },
    );

    fireEvent.change(screen.getByLabelText("Spare part"), { target: { value: "" } });
    expect(onValidation).toHaveBeenCalledWith(true);
  });

  it("calls clear error for baretoolnumber while typing", () => {
    const onClearFieldError = vi.fn();
    renderWithProviders(
      React.createElement(AutoComplete, {
        name: "bareToolNumber",
        label: "Bare tool",
        value: "seed",
        onClearFieldError,
      }),
      { ascId: "ASC", countryCode: "ZA" },
    );

    fireEvent.change(screen.getByLabelText("Bare tool"), { target: { value: "BT-2" } });
    expect(onClearFieldError).toHaveBeenCalledWith("bareToolNumber");
  });

  it("calls set field error on blur for unmatched bareToolNumber", () => {
    const onSetFieldError = vi.fn();
    const onSetFieldTouched = vi.fn();
    renderWithProviders(
      React.createElement(AutoComplete, {
        name: "bareToolNumber",
        label: "Bare tool",
        value: "seed",
        onSetFieldError,
        onSetFieldTouched,
      }),
      { ascId: "ASC", countryCode: "ZA" },
    );

    fireEvent.change(screen.getByLabelText("Bare tool"), { target: { value: "UNKNOWN" } });
    fireEvent.blur(screen.getByLabelText("Bare tool"));

    expect(onSetFieldError).toHaveBeenCalled();
    expect(onSetFieldTouched).toHaveBeenCalledWith("bareToolNumber", true);
  });

  it("calls set field error on blur for unmatched sparePartNumber (multiple results, none auto-selected)", () => {
    // Default beforeEach mock returns two options — not exactly one, so blur's
    // auto-select doesn't fire and this falls through to the not-found validation.
    const onSetFieldError = vi.fn();
    const onSetFieldTouched = vi.fn();
    renderWithProviders(
      React.createElement(AutoComplete, {
        name: "sparePartNumber",
        label: "Spare part",
        value: "seed",
        onSetFieldError,
        onSetFieldTouched,
      }),
      { ascId: "ASC", countryCode: "ZA" },
    );

    fireEvent.change(screen.getByLabelText("Spare part"), { target: { value: "UNKNOWN" } });
    fireEvent.blur(screen.getByLabelText("Spare part"));

    expect(onSetFieldError).toHaveBeenCalledWith("sparePartNumber", "sparePartNumberNotFound");
    expect(onSetFieldTouched).toHaveBeenCalledWith("sparePartNumber", true);
  });

  it("is disabled when disabled prop is true", () => {
    renderWithProviders(
      React.createElement(AutoComplete, {
        name: "customerName",
        label: "Customer",
        disabled: true,
      }),
    );

    expect(screen.getByLabelText("Customer")).toBeDisabled();
  });

  it("closes the dropdown when clicking outside the wrapper", async () => {
    renderWithProviders(
      React.createElement(AutoComplete, { name: "customerName", label: "Customer", value: "seed" }),
      { ascId: "ASC", countryCode: "ZA" },
    );

    fireEvent.change(screen.getByLabelText("Customer"), { target: { value: "abc" } });
    await screen.findByTestId("option-1");

    fireEvent.mouseDown(document.body);

    expect(screen.queryByTestId("option-1")).not.toBeInTheDocument();
  });

  it("does not close the dropdown when clicking inside the wrapper", async () => {
    renderWithProviders(
      React.createElement(AutoComplete, { name: "customerName", label: "Customer", value: "seed" }),
      { ascId: "ASC", countryCode: "ZA" },
    );

    const input = screen.getByLabelText("Customer");
    fireEvent.change(input, { target: { value: "abc" } });
    await screen.findByTestId("option-1");

    fireEvent.mouseDown(input);

    expect(screen.getByTestId("option-1")).toBeInTheDocument();
  });

  it("navigates the highlighted option with ArrowDown and ArrowUp", async () => {
    renderWithProviders(
      React.createElement(AutoComplete, { name: "customerName", label: "Customer", value: "seed" }),
      { ascId: "ASC", countryCode: "ZA" },
    );

    const input = screen.getByLabelText("Customer");
    fireEvent.change(input, { target: { value: "abc" } });
    await screen.findByTestId("option-1");

    expect(screen.getByTestId("option-1")).toHaveAttribute("data-highlighted", "true");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByTestId("option-2")).toHaveAttribute("data-highlighted", "true");
    expect(screen.getByTestId("option-1")).toHaveAttribute("data-highlighted", "false");

    // Already at the last option — stays put.
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByTestId("option-2")).toHaveAttribute("data-highlighted", "true");

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(screen.getByTestId("option-1")).toHaveAttribute("data-highlighted", "true");

    // Already at the first option — stays put.
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(screen.getByTestId("option-1")).toHaveAttribute("data-highlighted", "true");
  });

  it("does nothing on keydown when the dropdown is closed", () => {
    renderWithProviders(
      React.createElement(AutoComplete, { name: "customerName", label: "Customer", value: "seed" }),
      { ascId: "ASC", countryCode: "ZA" },
    );

    const input = screen.getByLabelText("Customer");
    expect(() => fireEvent.keyDown(input, { key: "ArrowDown" })).not.toThrow();
    expect(screen.queryByTestId("option-1")).not.toBeInTheDocument();
  });

  it("selects the highlighted option on Enter and closes the dropdown", async () => {
    const onSelect = vi.fn();
    const onChange = vi.fn();
    renderWithProviders(
      React.createElement(AutoComplete, {
        name: "customerName",
        label: "Customer",
        value: "seed",
        onSelect,
        onChange,
      }),
      { ascId: "ASC", countryCode: "ZA" },
    );

    const input = screen.getByLabelText("Customer");
    fireEvent.change(input, { target: { value: "abc" } });
    await screen.findByTestId("option-1");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith({ id: "2", label: "Option Two", value: "OPTION_TWO" });
    expect(onChange).toHaveBeenCalledWith("OPTION_TWO");
    expect(screen.queryByTestId("option-1")).not.toBeInTheDocument();
  });

  it("closes the dropdown on Escape", async () => {
    renderWithProviders(
      React.createElement(AutoComplete, { name: "customerName", label: "Customer", value: "seed" }),
      { ascId: "ASC", countryCode: "ZA" },
    );

    const input = screen.getByLabelText("Customer");
    fireEvent.change(input, { target: { value: "abc" } });
    await screen.findByTestId("option-1");

    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.queryByTestId("option-1")).not.toBeInTheDocument();
  });

  it("reopens the dropdown on click when options are already available", async () => {
    renderWithProviders(
      React.createElement(AutoComplete, { name: "customerName", label: "Customer", value: "seed" }),
      { ascId: "ASC", countryCode: "ZA" },
    );

    const input = screen.getByLabelText("Customer");
    fireEvent.change(input, { target: { value: "abc" } });
    await screen.findByTestId("option-1");

    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByTestId("option-1")).not.toBeInTheDocument();

    fireEvent.click(input);
    expect(screen.getByTestId("option-1")).toBeInTheDocument();
  });

  it("caches the selected customer and calls onSelect when a customer option is clicked", async () => {
    const onSelect = vi.fn();
    const onChange = vi.fn();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(["user"], { ascId: "ASC", countryCode: "ZA" });
    render(
      React.createElement(
        QueryClientProvider,
        { client: qc },
        React.createElement(AutoComplete, {
          name: "customerName",
          label: "Customer",
          value: "seed",
          onSelect,
          onChange,
        }),
      ),
    );

    const input = screen.getByLabelText("Customer");
    fireEvent.change(input, { target: { value: "abc" } });
    const option = await screen.findByTestId("option-1");
    fireEvent.click(option);

    expect(onSelect).toHaveBeenCalledWith({ id: "1", label: "Option One", value: "OPTION_ONE" });
    expect(onChange).toHaveBeenCalledWith("OPTION_ONE");
    expect(qc.getQueryData(["selectedCustomer"])).toEqual({
      id: "1",
      label: "Option One",
      value: "OPTION_ONE",
    });
  });

  it("marks a tool lookup field valid after clicking an option", async () => {
    const onValidation = vi.fn();
    renderWithProviders(
      React.createElement(AutoComplete, {
        name: "bareToolNumber",
        label: "Bare tool",
        value: "seed",
        onValidation,
      }),
      { ascId: "ASC", countryCode: "ZA" },
    );

    const input = screen.getByLabelText("Bare tool");
    fireEvent.change(input, { target: { value: "BT-1" } });
    const option = await screen.findByTestId("option-1");
    fireEvent.click(option);

    expect(onValidation).toHaveBeenCalledWith(true);
  });

  it("auto-selects the only match on blur for tool lookup fields", async () => {
    vi.mocked(getAutocompleteOptions).mockResolvedValue([
      { id: "1", label: "Only Option", value: "ONLY_VALUE" },
    ] as never);
    const onSelect = vi.fn();
    const onChange = vi.fn();
    const onValidation = vi.fn();
    renderWithProviders(
      React.createElement(AutoComplete, {
        name: "bareToolNumber",
        label: "Bare tool",
        value: "seed",
        onSelect,
        onChange,
        onValidation,
      }),
      { ascId: "ASC", countryCode: "ZA" },
    );

    const input = screen.getByLabelText("Bare tool");
    fireEvent.change(input, { target: { value: "BT-1" } });
    await screen.findByTestId("option-1");

    fireEvent.blur(input);

    expect(onSelect).toHaveBeenCalledWith({ id: "1", label: "Only Option", value: "ONLY_VALUE" });
    expect(onChange).toHaveBeenCalledWith("ONLY_VALUE");
    expect(onValidation).toHaveBeenCalledWith(true);
  });

  it("clears error and revalidates on blur when input still matches the last valid selection", async () => {
    const onClearFieldError = vi.fn();
    const onValidation = vi.fn();
    renderWithProviders(
      React.createElement(AutoComplete, {
        name: "bareToolNumber",
        label: "Bare tool",
        value: "seed",
        onClearFieldError,
        onValidation,
      }),
      { ascId: "ASC", countryCode: "ZA" },
    );

    const input = screen.getByLabelText("Bare tool");
    fireEvent.change(input, { target: { value: "BT-1" } });
    const option = await screen.findByTestId("option-1");
    fireEvent.click(option);
    onClearFieldError.mockClear();
    onValidation.mockClear();

    fireEvent.blur(input);

    expect(onClearFieldError).toHaveBeenCalledWith("bareToolNumber");
    expect(onValidation).toHaveBeenCalledWith(true);
  });

  it("shows a toolModelName not found error on blur when unmatched", async () => {
    vi.mocked(getAutocompleteOptions).mockResolvedValue([] as never);
    const onSetFieldError = vi.fn();
    const onSetFieldTouched = vi.fn();
    renderWithProviders(
      React.createElement(AutoComplete, {
        name: "toolModelName",
        label: "Tool model",
        value: "seed",
        onSetFieldError,
        onSetFieldTouched,
      }),
      { ascId: "ASC", countryCode: "ZA" },
    );

    const input = screen.getByLabelText("Tool model");
    fireEvent.change(input, { target: { value: "UNKNOWNMODEL" } });
    fireEvent.blur(input);

    expect(onSetFieldError).toHaveBeenCalledWith("toolModelName", "toolModelNameNotFound");
    expect(onSetFieldTouched).toHaveBeenCalledWith("toolModelName", true);
  });

  it("does not raise a not-found error on blur for an exchange action", async () => {
    const onSetFieldError = vi.fn();
    renderWithProviders(
      React.createElement(AutoComplete, {
        name: "bareToolNumber",
        label: "Bare tool",
        value: "seed",
        isExchange: true,
        onSetFieldError,
      }),
      { ascId: "ASC", countryCode: "ZA" },
    );

    const input = screen.getByLabelText("Bare tool");
    fireEvent.change(input, { target: { value: "UNKNOWN" } });
    fireEvent.blur(input);

    expect(onSetFieldError).not.toHaveBeenCalled();
  });
});
