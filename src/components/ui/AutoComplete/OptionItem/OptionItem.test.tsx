import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OptionItem from "./OptionItem";

vi.mock("./BaretoolOption/BaretoolOption", () => ({
  default: ({ onSelect, isTradeName }: { onSelect: () => void; isTradeName: boolean }) => (
    <button data-testid={isTradeName ? "baretool-tradename" : "baretool-option"} onClick={onSelect}>
      BaretoolOption
    </button>
  ),
}));

vi.mock("./CustomerOption/CustomerOption", () => ({
  default: ({ onSelect }: { onSelect: () => void }) => (
    <button data-testid="customer-option" onClick={onSelect}>
      CustomerOption
    </button>
  ),
}));

describe("OptionItem", () => {
  it("renders BaretoolOption for bareToolNumber type", () => {
    render(
      <OptionItem type="bareToolNumber" option={{ tradeName: "ABC" } as any} onSelect={vi.fn()} />,
    );
    expect(screen.getByTestId("baretool-option")).toBeInTheDocument();
  });

  it("renders BaretoolOption for sparePartNumber type", () => {
    render(
      <OptionItem type="sparePartNumber" option={{ tradeName: "ABC" } as any} onSelect={vi.fn()} />,
    );
    expect(screen.getByTestId("baretool-option")).toBeInTheDocument();
  });

  it("renders BaretoolOption with isTradeName for toolModelName type", () => {
    render(
      <OptionItem type="toolModelName" option={{ tradeName: "ABC" } as any} onSelect={vi.fn()} />,
    );
    expect(screen.getByTestId("baretool-tradename")).toBeInTheDocument();
  });

  it("renders CustomerOption for firstName type", () => {
    render(
      <OptionItem type="firstName" option={{ firstName: "John" } as any} onSelect={vi.fn()} />,
    );
    expect(screen.getByTestId("customer-option")).toBeInTheDocument();
  });

  it("renders CustomerOption for companyName type", () => {
    render(
      <OptionItem type="companyName" option={{ companyName: "Acme" } as any} onSelect={vi.fn()} />,
    );
    expect(screen.getByTestId("customer-option")).toBeInTheDocument();
  });

  it("renders generic button for string option", () => {
    render(<OptionItem type="generic" option="Option A" onSelect={vi.fn()} />);
    expect(screen.getByText("Option A")).toBeInTheDocument();
  });

  it("renders 'Option' for non-string, non-typed option", () => {
    render(<OptionItem type="generic" option={{ unknown: true } as any} onSelect={vi.fn()} />);
    expect(screen.getByText("Option")).toBeInTheDocument();
  });

  it("calls onSelect when generic button clicked", () => {
    const onSelect = vi.fn();
    render(<OptionItem type="generic" option="Select me" onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Select me"));
    expect(onSelect).toHaveBeenCalledWith("Select me");
  });

  it("applies highlighted class when isHighlighted is true", () => {
    render(<OptionItem type="generic" option="hi" onSelect={vi.fn()} isHighlighted />);
    expect(screen.getByText("hi")).toHaveClass("highlighted");
  });
});
