import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useLocation: () => ({ hash: "" }),
  useNavigate: () => mockNavigate,
}));

vi.mock("@bosch/react-frok", async () => {
  const React = await import("react");

  return {
    TabNavigation: ({ children, onTabSelect }: any) => (
      <div data-testid="tab-navigation">
        {React.Children.map(children, (child: any) =>
          React.cloneElement(child, {
            onClick: () => onTabSelect(null, { value: child.props.value }),
          }),
        )}
      </div>
    ),
    Tab: ({ children, onClick, value }: any) => (
      <button type="button" data-testid={`tab-${value}`} onClick={onClick}>
        {children}
      </button>
    ),
  };
});

vi.mock("../../hooks/useBreadcrumbs", () => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("./ReimbursementASCList/ReimbursementASCList", () => ({
  default: () => <div data-testid="asc-list">ASC List Component</div>,
}));

vi.mock("./ReimbursementList/ReimbursementList", () => ({
  default: () => <div data-testid="reimbursement-list">Reimbursement List Component</div>,
}));

import Reimbursement from "./Reimbursement";
import { useBreadcrumbs } from "../../hooks/useBreadcrumbs";

const mockUseBreadcrumbs = vi.mocked(useBreadcrumbs);

describe("Reimbursement", () => {
  beforeEach(() => {
    mockUseBreadcrumbs.mockClear();
    mockNavigate.mockClear();
  });

  it("renders tab navigation with two tabs", () => {
    render(<Reimbursement />);

    expect(screen.getByText("ascList")).toBeInTheDocument();
    expect(screen.getByText("reimbursementList")).toBeInTheDocument();
  });

  it("renders ASC list by default when not on reimbursement-list path", () => {
    render(<Reimbursement />);

    expect(screen.getByTestId("asc-list")).toBeInTheDocument();
    expect(screen.queryByTestId("reimbursement-list")).not.toBeInTheDocument();
  });

  it("renders correct number of visible tabs", () => {
    render(<Reimbursement />);

    expect(screen.getByText("ascList")).toBeInTheDocument();
    expect(screen.getByText("reimbursementList")).toBeInTheDocument();
  });

  it("navigates to selected tab hash", () => {
    render(<Reimbursement />);

    fireEvent.click(screen.getByTestId("tab-reimbursement-list"));

    expect(mockNavigate).toHaveBeenCalledWith("/reimbursement#reimbursement-list", {
      replace: true,
    });
  });
});
