import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Tile from "./Tile";

describe("Tile", () => {
  const defaultProps = {
    icon: "box-closed",
    value: 250,
    label: "Active Jobs",
  };

  it("renders icon, value, and label", () => {
    render(<Tile {...defaultProps} />);

    expect(screen.getByText("250")).toBeInTheDocument();
    expect(screen.getByText("Active Jobs")).toBeInTheDocument();
  });

  it("renders as a button", () => {
    render(<Tile {...defaultProps} />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<Tile {...defaultProps} onClick={onClick} />);

    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when disabled", () => {
    const onClick = vi.fn();
    render(<Tile {...defaultProps} onClick={onClick} disabled />);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies disabled class when disabled", () => {
    render(<Tile {...defaultProps} disabled />);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("tile--disabled");
  });

  it("renders string value", () => {
    render(<Tile {...defaultProps} value="N/A" />);

    expect(screen.getByText("N/A")).toBeInTheDocument();
  });
});
