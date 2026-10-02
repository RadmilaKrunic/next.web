import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCustomerOrders } from "api/services/customers/customers";
import ClientOrdersTab from "./ClientOrdersTab";

vi.mock("api/services/customers/customers", () => ({ getCustomerOrders: vi.fn() }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay", () => ({
  default: () => <div data-testid="loading-orders" />,
}));
vi.mock("components/ui/List/Filters/Filters", () => ({
  default: ({
    searchValue,
    onSearchChange,
    onSearchReset,
  }: {
    searchValue: string;
    onSearchChange: (value: string) => void;
    onSearchReset: () => void;
  }) => (
    <div>
      <input
        aria-label="search"
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <button type="button" onClick={onSearchReset}>
        clear
      </button>
    </div>
  ),
}));
vi.mock("components/ui/List/Table/Table", () => ({
  default: ({ data }: { data: { orderId: string }[] }) => (
    <div data-testid="orders-table">
      {data.map((order) => (
        <span key={order.orderId} data-testid="order-row">
          {order.orderId}
        </span>
      ))}
    </div>
  ),
}));
vi.mock("components/ui/Pagination/Pagination", () => ({
  default: ({
    totalResults,
    onPageChange,
    onDropdownOptionChange,
  }: {
    totalResults: number;
    onPageChange: (page: number) => void;
    onDropdownOptionChange: (option: string) => void;
  }) => (
    <div>
      <span>{totalResults} results</span>
      <button type="button" onClick={() => onDropdownOptionChange("5")}>
        show 5
      </button>
      <button type="button" onClick={() => onPageChange(2)}>
        page 2
      </button>
    </div>
  ),
}));

const renderTab = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ClientOrdersTab clientId="client-123" />
    </QueryClientProvider>,
  );

describe("ClientOrdersTab", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders backend page content and requests following page", async () => {
    vi.mocked(getCustomerOrders).mockImplementation(async (_customerId, query) => ({
      page: { number: query.page ?? 0, totalElements: 12, totalPages: 2, size: query.size ?? 10 },
      content:
        query.page === 1
          ? [
              {
                orderId: "order-22",
                assets: 1,
                createdOn: "2026-09-01T00:00:00Z",
                updatedOn: "2026-09-22T00:00:00Z",
              },
              {
                orderId: "order-21",
                assets: 1,
                createdOn: "2026-09-01T00:00:00Z",
                updatedOn: "2026-09-21T00:00:00Z",
              },
            ]
          : Array.from({ length: 10 }, (_, index) => ({
              orderId: `order-${10 - index}`,
              assets: index + 1,
              createdOn: "2026-09-01T00:00:00Z",
              updatedOn: `2026-09-${String(index + 1).padStart(2, "0")}T00:00:00Z`,
            })),
    }));

    renderTab();

    expect(await screen.findByText("order-10")).toBeInTheDocument();
    const displayedOrders = screen.getAllByTestId("order-row");
    expect(displayedOrders).toHaveLength(10);
    expect(displayedOrders[0]).toHaveTextContent("order-10");
    expect(screen.getByText("12 results")).toBeInTheDocument();
    expect(getCustomerOrders).toHaveBeenCalledWith("client-123", {
      searchTerm: undefined,
      page: 0,
      size: 10,
    });

    fireEvent.click(screen.getByRole("button", { name: "page 2" }));
    expect(await screen.findByText("order-22")).toBeInTheDocument();
    expect(screen.getAllByTestId("order-row")).toHaveLength(2);
    expect(getCustomerOrders).toHaveBeenLastCalledWith("client-123", {
      searchTerm: undefined,
      page: 1,
      size: 10,
    });
  });

  it("sends search value to backend and renders returned content", async () => {
    vi.mocked(getCustomerOrders).mockImplementation(async (_customerId, query) => ({
      page: { number: query.page ?? 0, totalElements: 1, totalPages: 1, size: query.size ?? 10 },
      content: [
        {
          orderId: query.searchTerm ? "order-match" : "order-initial",
          assets: 1,
          createdOn: "2026-09-01T00:00:00Z",
          updatedOn: "2026-09-02T00:00:00Z",
        },
      ],
    }));
    renderTab();

    fireEvent.change(await screen.findByRole("textbox", { name: "search" }), {
      target: { value: "order-match" },
    });

    expect(await screen.findByText("order-match")).toBeInTheDocument();
    expect(screen.getByText("1 results")).toBeInTheDocument();
    expect(getCustomerOrders).toHaveBeenLastCalledWith("client-123", {
      searchTerm: "order-match",
      page: 0,
      size: 10,
    });
  });

  it("sends selected page size to backend", async () => {
    vi.mocked(getCustomerOrders).mockImplementation(async (_customerId, query) => ({
      page: { number: query.page ?? 0, totalElements: 20, totalPages: 4, size: query.size ?? 10 },
      content: Array.from({ length: query.size ?? 10 }, (_, index) => ({
        orderId: `order-${index + 1}`,
        assets: 1,
        createdOn: "2026-09-01T00:00:00Z",
        updatedOn: "2026-09-02T00:00:00Z",
      })),
    }));
    renderTab();

    await screen.findByText("order-1");
    fireEvent.click(screen.getByRole("button", { name: "show 5" }));
    await waitFor(() => expect(screen.getAllByTestId("order-row")).toHaveLength(5));
    expect(getCustomerOrders).toHaveBeenLastCalledWith("client-123", {
      searchTerm: undefined,
      page: 0,
      size: 5,
    });
  });

  it("shows request failures instead of table", async () => {
    vi.mocked(getCustomerOrders).mockRejectedValue(new Error("Network error"));
    renderTab();

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("errorLoadingOrders"));
    expect(screen.queryByTestId("orders-table")).not.toBeInTheDocument();
  });
});
