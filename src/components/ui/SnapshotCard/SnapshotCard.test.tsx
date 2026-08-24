import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import SnapshotCard from "./SnapshotCard";

describe("SnapshotCard", () => {
  const props = {
    title: "Order Snapshots",
    items: [
      { label: "Open orders today", value: 35 },
      { label: "Recently created", value: 8 },
    ],
  };

  it("renders title and items", () => {
    render(<SnapshotCard {...props} />);
    expect(screen.getByText("Order Snapshots")).toBeInTheDocument();
    expect(screen.getByText("Open orders today")).toBeInTheDocument();
    expect(screen.getByText("35")).toBeInTheDocument();
  });

  it("renders button when buttonLabel is provided", () => {
    render(<SnapshotCard {...props} buttonLabel="View All Orders" />);
    expect(screen.getByRole("button", { name: "View All Orders" })).toBeInTheDocument();
  });

  it("calls onButtonClick when button is clicked", () => {
    const onButtonClick = vi.fn();
    render(<SnapshotCard {...props} buttonLabel="View All Orders" onButtonClick={onButtonClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onButtonClick).toHaveBeenCalledOnce();
  });
});
