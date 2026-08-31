import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

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
  });

  it("renders tab navigation with two tabs", () => {
    render(
      <MemoryRouter initialEntries={["/reimbursement"]}>
        <Reimbursement />
      </MemoryRouter>,
    );

    expect(screen.getByText("ascList")).toBeInTheDocument();
    expect(screen.getByText("reimbursementList")).toBeInTheDocument();
  });

  it("renders ASC list by default when not on reimbursement-list path", () => {
    render(
      <MemoryRouter initialEntries={["/reimbursement"]}>
        <Reimbursement />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("asc-list")).toBeInTheDocument();
    expect(screen.queryByTestId("reimbursement-list")).not.toBeInTheDocument();
  });

  it("renders correct number of visible tabs", () => {
    render(
      <MemoryRouter initialEntries={["/reimbursement"]}>
        <Reimbursement />
      </MemoryRouter>,
    );

    expect(screen.getByText("ascList")).toBeInTheDocument();
    expect(screen.getByText("reimbursementList")).toBeInTheDocument();
  });
});
