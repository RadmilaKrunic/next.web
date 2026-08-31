import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SearchField from "./SearchField";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Icon: ({ iconName }: { iconName: string }) => <span data-testid={`icon-${iconName}`} />,
}));

describe("SearchField", () => {
  it("renders search form", () => {
    render(<SearchField />);
    expect(screen.getByTestId("search-form")).toBeInTheDocument();
  });

  it("renders search button", () => {
    render(<SearchField />);
    expect(screen.getByTestId("search-button")).toBeInTheDocument();
  });

  it("expands when search button clicked", () => {
    render(<SearchField />);
    fireEvent.click(screen.getByTestId("search-button"));
    expect(screen.getByPlaceholderText("search")).toBeInTheDocument();
  });

  it("shows clear button when search value is entered", () => {
    render(<SearchField />);
    fireEvent.click(screen.getByTestId("search-button"));
    fireEvent.change(screen.getByPlaceholderText("search"), { target: { value: "abc" } });
    expect(screen.getByTestId("clear-search-button")).toBeInTheDocument();
  });

  it("clears and collapses when clear button clicked", () => {
    render(<SearchField />);
    fireEvent.click(screen.getByTestId("search-button"));
    fireEvent.change(screen.getByPlaceholderText("search"), { target: { value: "abc" } });
    fireEvent.click(screen.getByTestId("clear-search-button"));
    expect(screen.queryByPlaceholderText("search")).not.toBeInTheDocument();
  });
});
