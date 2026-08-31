import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MessagesContext } from "../../../contexts/messagescontext";

const mockNavigate = vi.fn();
const mockHandleToggleFilter = vi.fn();
const mockGetQueryData = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    getQueryData: mockGetQueryData,
  }),
}));

vi.mock("api/services/reimbursements/hooks", () => ({
  useReimbursements: vi.fn(),
}));

vi.mock("api/services/header/action", () => ({}));

vi.mock("hooks/useReimbursementDateFilter", () => ({
  useReimbursementDateFilter: () => ({
    quickFilters: [{ key: "lastMonth", label: "lastMonth", selected: false }],
    handleToggleFilter: mockHandleToggleFilter,
  }),
}));

vi.mock("components/ui/DatePicker/DatePicker", () => ({
  default: ({ label }: { label: string }) => <div data-testid="date-picker">{label}</div>,
}));

vi.mock("components/ui/ScrollablePopover/ScrollablePopover", () => ({
  ScrollablePopover: ({
    children,
    trigger,
  }: {
    children: React.ReactNode;
    trigger: React.ReactNode;
  }) => (
    <div data-testid="scrollable-popover">
      {trigger}
      {children}
    </div>
  ),
}));

vi.mock("components/ui/List/Table/Table", () => ({
  default: ({ data, columns, getRowKey, onRowClick, renderRowActions }: any) => (
    <table>
      <tbody>
        {data.map((row: any) => (
          <tr key={getRowKey(row)} onClick={() => onRowClick?.(row)}>
            {columns.map((col: any) => (
              <td key={col.key}>{row[col.key]}</td>
            ))}
            {renderRowActions && <td>{renderRowActions(row)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

vi.mock("components/ui/Pagination/Pagination", () => ({
  default: () => <div data-testid="pagination" />,
}));

vi.mock("../SearchCreateReimbursementBtns/SearchCreateReimbursementBtns", () => ({
  default: ({ searchValue, setSearchValue }: any) => (
    <input
      placeholder="search"
      value={searchValue}
      onChange={(e) => setSearchValue(e.target.value)}
    />
  ),
}));

vi.mock("@bosch/react-frok", () => ({
  Chip: ({ label, onClick, onKeyDown }: any) => (
    <button onClick={onClick} onKeyDown={onKeyDown}>
      {label}
    </button>
  ),
  Button: (props: any) => <button {...props} />,
  Icon: () => <span data-testid="icon" />,
  ActivityIndicator: () => <div data-testid="activity-indicator" />,
}));

import ReimbursementList from "./ReimbursementList";
import { useReimbursements } from "api/services/reimbursements/hooks";

const mockUseReimbursements = vi.mocked(useReimbursements);

const buildReimbursement = (id: string) => ({
  reimbursementId: id,
  ascId: "asc-1",
  ascName: `ASC ${id}`,
  claimCount: 3,
  creditAmount: 100,
  status: "APPROVED",
  countryCode: "string" as const,
  materialCount: 0 as const,
  periodEndDate: new Date("2026-01-31T00:00:00Z"),
  periodStartDate: new Date("2026-01-01T00:00:00Z"),
  periodType: "MONTHLY",
  totalAmount: 150.5,
  claims: [],
  claimIds: [],
  customerCode: "CUST-1",
  paymentSummaries: [],
});

function renderComponent() {
  return render(
    <MemoryRouter>
      <MessagesContext.Provider value={{ messages: [], setMessages: vi.fn() }}>
        <ReimbursementList />
      </MessagesContext.Provider>
    </MemoryRouter>,
  );
}

describe("ReimbursementList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // default: nema podataka o korisniku -> tretira se kao non-ASC
    mockGetQueryData.mockReturnValue(undefined);
    mockUseReimbursements.mockReturnValue({
      data: {
        content: [buildReimbursement("1"), buildReimbursement("2")],
        page: { totalElements: 2 },
      },
      isLoading: false,
    } as any);
  });

  it("renders reimbursement rows from data", () => {
    renderComponent();
    expect(screen.getByText("ASC 1")).toBeInTheDocument();
    expect(screen.getByText("ASC 2")).toBeInTheDocument();
  });

  it("renders loading state when reimbursements are loading", () => {
    mockUseReimbursements.mockReturnValue({ isLoading: true, data: undefined } as any);

    renderComponent();

    expect(screen.getByTestId("activity-indicator")).toBeInTheDocument();
    expect(screen.queryByText("ASC 1")).not.toBeInTheDocument();
  });

  it("navigates to reimbursement-claims when a row is clicked", () => {
    renderComponent();
    fireEvent.click(screen.getByText("ASC 1"));
    expect(mockNavigate).toHaveBeenCalledWith("/reimbursement-claims/1");
  });

  it("updates search value on input change", () => {
    renderComponent();
    const searchInput = screen.getByPlaceholderText("search");
    fireEvent.change(searchInput, { target: { value: "test" } });
    expect(searchInput).toHaveValue("test");
  });

  it("does not render pagination when total elements below page size", () => {
    renderComponent();
    expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
  });

  it("renders pagination when total elements exceed page size", () => {
    mockUseReimbursements.mockReturnValue({
      data: {
        content: [buildReimbursement("1")],
        page: { totalElements: 25 },
      },
      isLoading: false,
    } as any);
    renderComponent();
    expect(screen.getByTestId("pagination")).toBeInTheDocument();
  });

  it("renders date picker filters", () => {
    renderComponent();
    expect(screen.getAllByTestId("date-picker")).toHaveLength(2);
  });

  it("renders quick filter chip", () => {
    renderComponent();
    expect(screen.getByText("lastMonth")).toBeInTheDocument();
  });

  it("toggles quick filter selection on click", () => {
    renderComponent();
    fireEvent.click(screen.getByText("lastMonth"));
    expect(mockHandleToggleFilter).toHaveBeenCalledWith("lastMonth");
  });
  it("uses a ~14 day default range for non-ASC users", () => {
    mockGetQueryData.mockReturnValue({ type: "CUSTOMER" });
    renderComponent();

    const [fromDateArg, toDateArg] = mockUseReimbursements.mock.calls[0];
    expect(fromDateArg).toBeInstanceOf(Date);
    expect(toDateArg).toBeInstanceOf(Date);
    if (!fromDateArg || !toDateArg) throw new Error("Expected dates to be defined");

    const diffDays = Math.round(
      (toDateArg.getTime() - fromDateArg.getTime()) / (1000 * 60 * 60 * 24),
    );
    expect(diffDays).toBe(14);
  });

  it("uses a ~2 month default range for ASC users", () => {
    mockGetQueryData.mockReturnValue({ type: "ASC" });
    renderComponent();

    const [fromDateArg, toDateArg] = mockUseReimbursements.mock.calls[0];
    expect(fromDateArg).toBeInstanceOf(Date);
    expect(toDateArg).toBeInstanceOf(Date);
    if (!fromDateArg || !toDateArg) throw new Error("Expected dates to be defined");

    const diffDays = Math.round(
      (toDateArg.getTime() - fromDateArg.getTime()) / (1000 * 60 * 60 * 24),
    );
    expect(diffDays).toBeGreaterThan(40);
  });
});
