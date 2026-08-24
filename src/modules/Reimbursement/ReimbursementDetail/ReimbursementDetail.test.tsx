import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MessagesContext } from "../../../contexts/messagescontext";

const mockNavigate = vi.fn();
let mockLocationState: { ascName?: string } | undefined = { ascName: "ASC Name" };
let mockLocationSearch = "";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ ascId: "asc-1" }),
  useLocation: () => ({ state: mockLocationState, search: mockLocationSearch }),
}));

vi.mock("hooks/useBreadcrumbs", () => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("@/hooks/useHasPermission", () => ({
  useHasPermission: vi.fn(() => true),
}));

vi.mock("api/services/reimbursements/hooks", () => ({
  useReimbursementsByAscId: vi.fn(),
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

import ReimbursementDetail from "./ReimbursementDetail";
import { useReimbursementsByAscId } from "api/services/reimbursements/hooks";
import { useHasPermission } from "@/hooks/useHasPermission";

const mockUseReimbursementsByAscId = vi.mocked(useReimbursementsByAscId);
const mockUseHasPermission = vi.mocked(useHasPermission);

const buildItem = (id: string) => ({
  reimbursementId: id,
  createdAt: new Date("2026-01-05T00:00:00Z"),
  timePeriod: "2026-01-01 - 2026-01-31",
  claimsIncluded: 5,
  creditNoteAmount: 100.5,
  status: "APPROVED",
});

function renderComponent() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MessagesContext.Provider value={{ messages: [], setMessages: vi.fn() }}>
          <ReimbursementDetail />
        </MessagesContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ReimbursementDetail", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    sessionStorage.clear();
    mockLocationState = { ascName: "ASC Name" };
    mockLocationSearch = "";
    mockUseHasPermission.mockReturnValue(true);
    mockUseReimbursementsByAscId.mockReturnValue({
      data: {
        content: [buildItem("1"), buildItem("2")],
        page: { totalElements: 2 },
      },
    } as any);
  });

  it("renders header with ascName when user has permission", () => {
    renderComponent();
    expect(screen.getByText("ASC Name")).toBeInTheDocument();
  });

  it("renders header with ascName from query when state is missing", () => {
    mockLocationState = undefined;
    mockLocationSearch = "?ascName=ASC%20From%20Query";

    renderComponent();

    expect(screen.getByText("ASC From Query")).toBeInTheDocument();
  });

  it("renders generic header when user lacks permission", () => {
    mockUseHasPermission.mockReturnValue(false);
    renderComponent();
    expect(screen.getByText("reimbursementDetail")).toBeInTheDocument();
    expect(screen.queryByText("ASC Name")).not.toBeInTheDocument();
  });

  it("renders rows from data", () => {
    renderComponent();
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
  });

  it("navigates to reimbursement-claims when a row is clicked", () => {
    renderComponent();
    fireEvent.click(screen.getAllByText("1")[0]);
    expect(mockNavigate).toHaveBeenCalledWith("/reimbursement-claims/1");
  });

  it("renders quick filter chip", () => {
    renderComponent();
    expect(screen.getByText("lastMonth")).toBeInTheDocument();
  });

  it("toggles quick filter selection without persisting to sessionStorage", () => {
    renderComponent();
    fireEvent.click(screen.getByText("lastMonth"));
    expect(sessionStorage.getItem("reimbursementDetail-quickFilters")).toBeNull();
  });

  it("renders date picker filters", () => {
    renderComponent();
    expect(screen.getAllByTestId("date-picker")).toHaveLength(2);
  });
});
