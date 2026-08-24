import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@bosch/react-frok", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    "aria-label": ariaLabel,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    "aria-label"?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  ),
  Icon: ({ iconName }: { iconName: string }) => <span data-testid={`icon-${iconName}`} />,
  TextField: ({
    id,
    label,
    value,
    onChange,
    onKeyDown,
    onFocus,
    onBlur,
    disabled,
  }: {
    id: string;
    label: string;
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <input
      id={id}
      aria-label={label}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      disabled={disabled}
      data-testid={`text-field-${id}`}
    />
  ),
}));

import NumberInputFiled from "./NumberInputFiled";

type NumberInputFiledProps = React.ComponentProps<typeof NumberInputFiled>;

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

function renderNumberInputFiled(props: Partial<NumberInputFiledProps> = {}) {
  const queryClient = createTestQueryClient();

  queryClient.setQueryData(["user"], { countryCode: "DE" });
  queryClient.setQueryData(["countryConfiguration", "DE"], { currencySymbol: "€" });

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <NumberInputFiled {...defaultProps} {...props} />
      </QueryClientProvider>,
    ),
  };
}

const defaultProps = {
  name: "quantity",
  label: "Quantity",
  step: 1,
  value: 5,
  onChange: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

describe("NumberInputFiled", () => {
  it("renders with initial value", () => {
    renderNumberInputFiled();
    expect(screen.getByTestId("text-field-quantity")).toHaveValue("5");
  });

  it("renders increment and decrement buttons", () => {
    renderNumberInputFiled();
    expect(screen.getByLabelText("Increase value for Quantity")).toBeInTheDocument();
    expect(screen.getByLabelText("Decrease value for Quantity")).toBeInTheDocument();
  });

  it("increments value on increment button click", () => {
    const onChange = vi.fn();
    renderNumberInputFiled({ onChange });
    fireEvent.click(screen.getByLabelText("Increase value for Quantity"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { value: "6", name: "quantity" } }),
    );
  });

  it("decrements value on decrement button click", () => {
    const onChange = vi.fn();
    renderNumberInputFiled({ onChange });
    fireEvent.click(screen.getByLabelText("Decrease value for Quantity"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { value: "4", name: "quantity" } }),
    );
  });

  it("does not decrement below minValue", () => {
    const onChange = vi.fn();
    renderNumberInputFiled({ value: 0, minValue: 0, onChange });
    fireEvent.click(screen.getByLabelText("Decrease value for Quantity"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("calls onChange on text input change", () => {
    const onChange = vi.fn();
    renderNumberInputFiled({ onChange });
    fireEvent.change(screen.getByTestId("text-field-quantity"), { target: { value: "10" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("does not call onChange for non-numeric input", () => {
    const onChange = vi.fn();
    renderNumberInputFiled({ onChange });
    fireEvent.change(screen.getByTestId("text-field-quantity"), { target: { value: "abc" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("allows empty value on change", () => {
    const onChange = vi.fn();
    renderNumberInputFiled({ onChange });
    fireEvent.change(screen.getByTestId("text-field-quantity"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("syncs external value changes", () => {
    const { rerender, queryClient } = renderNumberInputFiled({ value: 5 });

    rerender(
      <QueryClientProvider client={queryClient}>
        <NumberInputFiled {...defaultProps} value={10} />
      </QueryClientProvider>,
    );
    expect(screen.getByTestId("text-field-quantity")).toHaveValue("10");
  });

  it("restores min value on blur when empty", () => {
    const onChange = vi.fn();
    renderNumberInputFiled({ value: "", onChange, minValue: 1 });
    fireEvent.blur(screen.getByTestId("text-field-quantity"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { value: "1", name: "quantity" } }),
    );
  });

  it("renders as disabled", () => {
    renderNumberInputFiled({ disabled: true });
    expect(screen.getByTestId("text-field-quantity")).toBeDisabled();
  });

  it("clears value on focus when value is 0", () => {
    renderNumberInputFiled({ value: 0 });
    fireEvent.focus(screen.getByTestId("text-field-quantity"));
    expect(screen.getByTestId("text-field-quantity")).toHaveValue("");
  });
});
