import { describe, it, expect, vi, beforeEach } from "vitest";
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
});
