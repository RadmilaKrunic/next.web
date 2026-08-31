import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BaretoolOption from "./BaretoolOption";
import type { BareToolOption } from "../../../../../api/services/orders/orders.types";

const mockOption: BareToolOption = {
  description: "Drill",
  tradeName: "Bosch Drill",
  voltage: "18V",
  country: "DE",
  partNumber: "0601234567",
} as BareToolOption;

describe("BaretoolOption", () => {
  it("renders partNumber in name for non-tradeName mode", () => {
    render(<BaretoolOption option={mockOption} onSelect={vi.fn()} />);
    expect(screen.getByText("0601234567")).toBeInTheDocument();
  });

  it("renders tradeName + description in name for tradeName mode", () => {
    render(<BaretoolOption option={mockOption} onSelect={vi.fn()} isTradeName />);
    expect(screen.getByText(/Bosch Drill/)).toBeInTheDocument();
  });

  it("calls onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(<BaretoolOption option={mockOption} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith(mockOption);
  });

  it("applies highlighted class when isHighlighted is true", () => {
    render(<BaretoolOption option={mockOption} onSelect={vi.fn()} isHighlighted />);
    expect(screen.getByRole("button")).toHaveClass("highlighted");
  });
});
