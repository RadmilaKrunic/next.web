import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ServiceCenter } from "../../../../api/services/serviceCenters/serviceCenters.types";

const { navigateMock, getAllASCsMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  getAllASCsMock: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../../hooks/useBreadcrumbs", () => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("react-router", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("../../../../api/services/serviceCenters/action", () => ({
  getAllASCs: () => getAllASCsMock(),
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
      {actionButton ? (
        <button type="button" data-testid="add-asc-btn" onClick={actionButton.onClick}>
          add
        </button>
      ) : null}
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

import AscList from "./AscList";

const baseAsc = (
  ascId: string,
  name: string,
  createdOn: string,
  overrides: Partial<ServiceCenter> = {},
): ServiceCenter => ({
  ascId,
  name,
  gst: "GST-001",
  email: `${name.toLowerCase()}@mail.com`,
  phoneNumber: "123456789",
  biqicName: "BIQIC",
  customerCode: "C-001",
  companyVATNumber: "VAT-001",
  serviceCenterType: "AUTHORIZED",
  reimbursementType: "MONTHLY",
  reimbursementConfig: [],
  reimbursementCreateOn: createdOn,
  reimbursementPeriodType: "MONTH",
  address: {
    street: "Street",
    houseNumber: "10",
    additionalDetails: null,
    neighborhood: null,
    district: null,
    city: "City",
    stateProvinceRegion: "State",
    postalCode: "1000",
    countryCode: "ZA",
  },
  defaultCountry: "ZA",
  bankAccount: {
    accountId: 1,
    accountNumber: "123456",
    bankName: "Bank",
  },
  currency: "ZAR",
  currencySymbol: "R",
  laPrice: 1,
  frPrice: 1,
  pkPrice: 1,
  sparePartsDiscount: 0,
  accessoriesDiscount: 0,
  sparePartsIncentive: 0,
  accessoriesIncentive: 0,
  packagingCost: 0,
  notification: [],
  parentNotification: [],
  isActive: true,
  isDraft: false,
  logo: {
    logoId: "logo-1",
    name: "logo",
    type: "image/png",
  },
  createdOn,
  laPriceChargeable: 1,
  frPriceChargeable: 1,
  pkPriceChargeable: 1,
  ...overrides,
});

function renderAscList() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(["user"], { permissions: ["AG_M"] });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AscList />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AscList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("renders list after fetch", async () => {
    getAllASCsMock.mockResolvedValue([baseAsc("a1", "John", "2026-01-01T00:00:00Z")]);

    renderAscList();

    expect(await screen.findByTestId("filters")).toBeInTheDocument();
    expect(screen.getByTestId("table")).toBeInTheDocument();

    await waitFor(() => {
      expect(getAllASCsMock).toHaveBeenCalled();
    });

    expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
  });

  it("navigates to add ASC page on add button click", async () => {
    getAllASCsMock.mockResolvedValue([baseAsc("a1", "John", "2026-01-01T00:00:00Z")]);

    renderAscList();
    await screen.findByTestId("filters");

    fireEvent.click(screen.getByTestId("add-asc-btn"));

    expect(navigateMock).toHaveBeenCalledWith("/add-asc");
  });

  it("hides add ASC button without AG_M permission", async () => {
    getAllASCsMock.mockResolvedValue([baseAsc("a1", "John", "2026-01-01T00:00:00Z")]);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["user"], { permissions: [] });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AscList />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByTestId("filters");

    expect(screen.queryByTestId("add-asc-btn")).not.toBeInTheDocument();
  });

  it("navigates to edit route when clicked row is draft", async () => {
    getAllASCsMock.mockResolvedValue([
      baseAsc("draft-1", "Draft", "2026-01-01T00:00:00Z", { isDraft: true }),
    ]);

    renderAscList();
    await screen.findByTestId("row-click");

    fireEvent.click(screen.getByTestId("row-click"));

    expect(navigateMock).toHaveBeenCalledWith("/edit-asc/draft-1");
  });

  it("sorts by createdOn desc and opens latest ASC on row click", async () => {
    getAllASCsMock.mockResolvedValue([
      baseAsc("older", "Older", "2026-01-01T00:00:00Z"),
      baseAsc("newer", "Newer", "2026-02-01T00:00:00Z"),
    ]);

    renderAscList();
    await screen.findByTestId("row-click");

    fireEvent.click(screen.getByTestId("row-click"));

    expect(navigateMock).toHaveBeenCalledWith("/asc-overview/newer");
  });

  it("navigates to ASC overview from row action", async () => {
    getAllASCsMock.mockResolvedValue([baseAsc("a77", "John", "2026-01-01T00:00:00Z")]);

    renderAscList();
    await screen.findByTestId("asc-action-edit-a77");

    fireEvent.click(screen.getByTestId("asc-action-edit-a77"));

    expect(navigateMock).toHaveBeenCalledWith("/asc-overview/a77");
  });

  it("shows pagination when filtered result exceeds page size", async () => {
    const serviceCenters = Array.from({ length: 11 }, (_, i) =>
      baseAsc(`a${i}`, `John${i}`, `2026-01-${String((i % 28) + 1).padStart(2, "0")}T00:00:00Z`),
    );
    getAllASCsMock.mockResolvedValue(serviceCenters);

    renderAscList();

    expect(await screen.findByTestId("pagination")).toBeInTheDocument();
  });

  it("filters ASC list by search value", async () => {
    getAllASCsMock.mockResolvedValue([
      baseAsc("a1", "John", "2026-01-01T00:00:00Z"),
      baseAsc("a2", "Alice", "2026-01-02T00:00:00Z"),
    ]);

    renderAscList();
    await screen.findByTestId("table");

    expect(screen.getByTestId("row-count")).toHaveTextContent("2");

    fireEvent.click(screen.getByTestId("search-john"));

    await waitFor(() => {
      expect(screen.getByTestId("row-count")).toHaveTextContent("1");
    });
  });
});
