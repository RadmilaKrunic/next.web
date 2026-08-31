import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  PageIndicator: ({
    pages,
    defaultSelected,
    onPageSelect,
  }: {
    pages: number;
    defaultSelected: number;
    onPageSelect: (e: React.MouseEvent) => void;
  }) => (
    <div data-testid="page-indicator" data-pages={pages} data-selected={defaultSelected}>
      {Array.from({ length: pages }, (_, i) => (
        <button
          key={i + 1}
          data-index={i + 1}
          onClick={(e) => onPageSelect(e as unknown as React.MouseEvent)}
        >
          {i + 1}
        </button>
      ))}
    </div>
  ),
  Dropdown: ({
    value,
    options,
    onChange,
    ...props
  }: {
    value: string;
    options: Array<{ value: string; label: string }>;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    [key: string]: unknown;
  }) => (
    <select
      data-testid="page-size-dropdown"
      value={value}
      onChange={onChange}
      {...(props as object)}
    >
      {options.map((o: { value: string; label: string }) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

import Pagination from "./Pagination";

beforeEach(() => vi.clearAllMocks());

describe("Pagination", () => {
  const defaultProps = {
    totalResults: 100,
    page: 1,
    pageSize: 10,
    onPageChange: vi.fn(),
    onDropdownOptionChange: vi.fn(),
  };

  it("renders total results", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getAllByText(/100/).length).toBeGreaterThan(0);
  });

  it("renders page size dropdown when there are results", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByTestId("page-size-dropdown")).toBeInTheDocument();
  });

  it("does not render dropdown when no results", () => {
    render(<Pagination {...defaultProps} totalResults={0} />);
    expect(screen.queryByTestId("page-size-dropdown")).not.toBeInTheDocument();
  });

  it("does not render page indicator when no results", () => {
    render(<Pagination {...defaultProps} totalResults={0} />);
    expect(screen.queryByTestId("page-indicator")).not.toBeInTheDocument();
  });

  it("renders page indicator when there are results", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByTestId("page-indicator")).toBeInTheDocument();
  });

  it("calls onDropdownOptionChange when page size changes", () => {
    const onDropdownOptionChange = vi.fn();
    render(<Pagination {...defaultProps} onDropdownOptionChange={onDropdownOptionChange} />);
    fireEvent.change(screen.getByTestId("page-size-dropdown"), { target: { value: "20" } });
    expect(onDropdownOptionChange).toHaveBeenCalledWith("20");
  });

  it("calls onPageChange when page is selected via data-index", () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} onPageChange={onPageChange} />);
    const page2Button = screen.getByText("2");
    fireEvent.click(page2Button);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("calculates total pages correctly", () => {
    render(<Pagination {...defaultProps} totalResults={50} pageSize={10} />);
    expect(screen.getByTestId("page-indicator")).toHaveAttribute("data-pages", "5");
  });

  it("syncs pageSize when prop changes", () => {
    const { rerender } = render(<Pagination {...defaultProps} pageSize={10} />);
    rerender(<Pagination {...defaultProps} pageSize={20} />);
    expect(screen.getByTestId("page-size-dropdown")).toHaveValue("20");
  });
});
