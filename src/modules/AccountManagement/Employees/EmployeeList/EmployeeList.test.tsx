import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { Employee } from "./EmployeeList.columns.config";

const { navigateMock, searchUsersMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  searchUsersMock: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../../hooks/useBreadcrumbs", () => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("../../../../api/services/users/action", () => ({
  searchUsers: (...args: unknown[]) => searchUsersMock(...args),
}));

vi.mock("@bosch/react-frok", () => ({
  ActivityIndicator: () => <div data-testid="loading" />,
  Button: ({ onClick, children, ...rest }: any) => (
    <button type="button" onClick={onClick} {...rest}>
      {children}
    </button>
  ),
  Icon: () => <span data-testid="icon" />,
}));

vi.mock("../../../../components/ui/List/Filters/Filters", () => ({
  default: ({ actionButton, onSearchChange }: any) => (
    <div data-testid="filters">
      <button type="button" data-testid="add-employee-btn" onClick={actionButton.onClick}>
        add
      </button>
      <button type="button" data-testid="search-john" onClick={() => onSearchChange("john")}>
        search
      </button>
    </div>
  ),
}));

vi.mock("../../../../components/ui/List/Table/Table", () => ({
  default: ({ data, onRowClick, renderRowActions }: any) => (
    <div data-testid="table">
      <div data-testid="row-count">{data.length}</div>
      {data[0] ? (
        <button type="button" data-testid="row-click" onClick={() => onRowClick(data[0])}>
          open-row
        </button>
      ) : null}
      {data[0] ? renderRowActions(data[0]) : null}
    </div>
  ),
}));

vi.mock("../../../../components/ui/Pagination/Pagination", () => ({
  default: () => <div data-testid="pagination" />,
}));

vi.mock("../../../../components/ui/ScrollablePopover/ScrollablePopover", () => ({
  ScrollablePopover: ({ trigger, children }: any) => (
    <div data-testid="popover">
      {trigger}
      {children}
    </div>
  ),
}));

vi.mock("../DeleteEmployeeDialog/DeleteEmployeeDialog", () => ({
  default: ({
    showDeleteDialog,
    employeeId,
  }: {
    showDeleteDialog: boolean;
    employeeId: string;
  }) => <div data-testid="delete-dialog">{showDeleteDialog ? `open:${employeeId}` : "closed"}</div>,
}));

import EmployeeList from "./EmployeeList";

const baseEmployee = (id: string, firstName: string): Employee => ({
  userId: id,
  accountRoles: [{ id: "1", name: "ASC Technician" }],
  ascId: "ASC8",
  firstName,
  lastName: "Doe",
  employeeCode: "E-001",
  email: `${firstName.toLowerCase()}@mail.com`,
  phoneNumber: "12345",
  boschId: "B1",
  createdOn: "2026-01-01T00:00:00Z",
});

function renderEmployeeList() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(["user"], { ascId: "ASC8" });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <EmployeeList />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("EmployeeList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("fetches employees with ascId and renders base list", async () => {
    searchUsersMock.mockResolvedValue([baseEmployee("u1", "John")]);

    renderEmployeeList();

    expect(await screen.findByTestId("filters")).toBeInTheDocument();
    expect(screen.getByTestId("table")).toBeInTheDocument();

    await waitFor(() => {
      expect(searchUsersMock).toHaveBeenCalledWith("ASC8");
    });

    expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
  });

  it("navigates to add employee on action button click", async () => {
    searchUsersMock.mockResolvedValue([baseEmployee("u1", "John")]);

    renderEmployeeList();
    await screen.findByTestId("filters");

    fireEvent.click(screen.getByTestId("add-employee-btn"));

    expect(navigateMock).toHaveBeenCalledWith("/add-employee");
  });

  it("navigates to employee overview on row click", async () => {
    searchUsersMock.mockResolvedValue([baseEmployee("u22", "John")]);

    renderEmployeeList();
    await screen.findByTestId("row-click");

    fireEvent.click(screen.getByTestId("row-click"));

    expect(navigateMock).toHaveBeenCalledWith("/employee-overview/u22");
  });

  it("opens delete dialog with selected employee id", async () => {
    searchUsersMock.mockResolvedValue([baseEmployee("u77", "John")]);

    renderEmployeeList();
    await screen.findByTestId("employee-action-delete-u77");

    fireEvent.click(screen.getByTestId("employee-action-delete-u77"));

    expect(screen.getByTestId("delete-dialog")).toHaveTextContent("open:u77");
  });

  it("shows pagination when filtered result exceeds page size", async () => {
    const employees = Array.from({ length: 11 }, (_, i) => baseEmployee(`u${i}`, `John${i}`));
    searchUsersMock.mockResolvedValue(employees);

    renderEmployeeList();

    expect(await screen.findByTestId("pagination")).toBeInTheDocument();
  });

  it("filters employees by search value", async () => {
    searchUsersMock.mockResolvedValue([baseEmployee("u1", "John"), baseEmployee("u2", "Alice")]);

    renderEmployeeList();
    await screen.findByTestId("table");

    expect(screen.getByTestId("row-count")).toHaveTextContent("2");

    fireEvent.click(screen.getByTestId("search-john"));

    await waitFor(() => {
      expect(screen.getByTestId("row-count")).toHaveTextContent("1");
    });
  });
});
