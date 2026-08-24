import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type React from "react";
import SearchCreateReimbursementBtns from "./SearchCreateReimbursementBtns";

const mockNavigate = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@bosch/react-frok", () => ({
  TextField: ({
    id,
    type,
    placeholder,
    name,
    value,
    onChange,
    resetButton,
  }: {
    id: string;
    type: string;
    placeholder: string;
    name: string;
    value: string;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    resetButton: { "aria-label": string; onClick: () => void };
  }) => (
    <div>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        name={name}
        value={value}
        onChange={onChange}
      />
      <button type="button" aria-label={resetButton["aria-label"]} onClick={resetButton.onClick}>
        {resetButton["aria-label"]}
      </button>
    </div>
  ),
  Button: ({
    onClick,
    className,
    children,
  }: {
    onClick: () => void;
    className?: string;
    children: React.ReactNode;
  }) => (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  ),
  Icon: ({ iconName }: { iconName: string }) => <span data-testid={`icon-${iconName}`} />,
}));

describe("SearchCreateReimbursementBtns", () => {
  const setSearchValue = vi.fn();

  beforeEach(() => {
    mockNavigate.mockClear();
    setSearchValue.mockClear();
  });

  it("renders search field and create reimbursement button", () => {
    render(<SearchCreateReimbursementBtns setSearchValue={setSearchValue} searchValue="" />);

    expect(screen.getByPlaceholderText("search")).toBeInTheDocument();
    expect(screen.getByText("createReimbursement")).toBeInTheDocument();
    expect(screen.getByTestId("icon-add")).toBeInTheDocument();
  });

  it("calls setSearchValue when user types in search input", () => {
    render(<SearchCreateReimbursementBtns setSearchValue={setSearchValue} searchValue="" />);

    fireEvent.change(screen.getByPlaceholderText("search"), { target: { value: "RMB-1001" } });

    expect(setSearchValue).toHaveBeenCalledWith("RMB-1001");
  });

  it("calls setSearchValue with empty string when clear button is clicked", () => {
    render(
      <SearchCreateReimbursementBtns setSearchValue={setSearchValue} searchValue="existing" />,
    );

    fireEvent.click(screen.getByLabelText("clear"));

    expect(setSearchValue).toHaveBeenCalledWith("");
  });

  it("navigates to create reimbursement page when create button is clicked", () => {
    render(<SearchCreateReimbursementBtns setSearchValue={setSearchValue} searchValue="" />);

    fireEvent.click(screen.getByText("createReimbursement"));

    expect(mockNavigate).toHaveBeenCalledWith("/create-reimbursement");
  });
});
