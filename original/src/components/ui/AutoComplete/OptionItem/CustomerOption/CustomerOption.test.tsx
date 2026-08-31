import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CustomerOption from "./CustomerOption";
import type { Customer } from "../../../../../api/services/customers/customers.types";

vi.mock("@bosch/react-frok", () => ({
  Icon: ({ iconName }: { iconName: string }) => <span data-testid={`icon-${iconName}`} />,
}));

vi.mock("../../../../../utils/customerTypeIcon", () => ({
  CUSTOMER_TYPE_ICON_NAME: { PRIVATE: "user", COMPANY: "building", DEALERSHIP: "store" },
}));

const mockCustomer: Customer = {
  customerType: "PRIVATE",
  firstName: "John",
  lastName: "Doe",
  phoneNumber: "+1234567",
  primaryEmail: "john@example.com",
  companyName: "",
  dealershipName: "",
} as Customer;

describe("CustomerOption", () => {
  it("renders customer name", () => {
    render(<CustomerOption option={mockCustomer} onSelect={vi.fn()} />);
    expect(screen.getByText(/John/)).toBeInTheDocument();
    expect(screen.getByText(/Doe/)).toBeInTheDocument();
  });

  it("renders phone number", () => {
    render(<CustomerOption option={mockCustomer} onSelect={vi.fn()} />);
    expect(screen.getByText(/\+1234567/)).toBeInTheDocument();
  });

  it("renders email", () => {
    render(<CustomerOption option={mockCustomer} onSelect={vi.fn()} />);
    expect(screen.getByText(/john@example.com/)).toBeInTheDocument();
  });

  it("calls onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(<CustomerOption option={mockCustomer} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith(mockCustomer);
  });

  it("renders dealershipName when type is dealershipName", () => {
    const customer = { ...mockCustomer, dealershipName: "Best Motors" };
    render(
      <CustomerOption option={customer as Customer} onSelect={vi.fn()} type="dealershipName" />,
    );
    expect(screen.getByText("Best Motors")).toBeInTheDocument();
  });

  it("renders companyName when type is companyName", () => {
    const customer = { ...mockCustomer, companyName: "Acme Corp" };
    render(<CustomerOption option={customer as Customer} onSelect={vi.fn()} type="companyName" />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("applies highlighted class when isHighlighted", () => {
    render(<CustomerOption option={mockCustomer} onSelect={vi.fn()} isHighlighted />);
    expect(screen.getByRole("button")).toHaveClass("highlighted");
  });
});
