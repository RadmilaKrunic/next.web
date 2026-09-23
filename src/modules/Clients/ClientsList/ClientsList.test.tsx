import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import ClientsList from "./ClientsList";
import { getCustomersByAsc } from "api/services/customers/customers";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("api/services/customers/customers", () => ({
  getCustomersByAsc: vi.fn(),
}));

vi.mock("./ClientsListColumns.config", () => ({
  getClientColumns: () => [{ key: "name", header: "Name" }],
}));

vi.mock("./ClientsList.utils", () => ({
  filterClients: (clients: unknown[]) => clients,
}));

vi.mock("hooks/useListFilterHandlers", () => ({
  useListFilterHandlers: () => ({
    handleToggleFilter: vi.fn(),
    applyAdvancedFilters: vi.fn(),
    resetAdvancedFilters: vi.fn(),
  }),
}));

vi.mock("components/ui/List/Filters/Filters", () => ({
  default: () => <div data-testid="filters" />,
}));

vi.mock("components/ui/List/Table/Table", () => ({
  default: ({ data }: { data: unknown[] }) => <div data-testid="table">{data.length} rows</div>,
}));

vi.mock("components/ui/Pagination/Pagination", () => ({
  default: () => <div data-testid="pagination" />,
}));

vi.mock("components/ui/ScrollablePopover/ScrollablePopover", () => ({
  ScrollablePopover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@bosch/react-frok", () => ({
  ActivityIndicator: () => <div data-testid="loading" />,
  Button: (props: Record<string, unknown>) => <button {...props} />,
  Icon: () => <span />,
}));

function renderWithProviders(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ClientsList />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

describe("ClientsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("shows loading indicator while fetching", () => {
    vi.mocked(getCustomersByAsc).mockReturnValue(new Promise(() => {}));
    const queryClient = createQueryClient();
    queryClient.setQueryData(["user"], { ascId: "123", countryCode: "US" });

    renderWithProviders(queryClient);

    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("shows error message when query fails", async () => {
    vi.mocked(getCustomersByAsc).mockRejectedValue(new Error("fail"));
    const queryClient = createQueryClient();
    queryClient.setQueryData(["user"], { ascId: "123", countryCode: "US" });

    renderWithProviders(queryClient);

    expect(await screen.findByText("SomethingWentWrong")).toBeInTheDocument();
  });

  it("renders table with fetched clients", async () => {
    vi.mocked(getCustomersByAsc).mockResolvedValue([
      { customerId: "1", firstName: "John", lastName: "Doe" },
      { customerId: "2", firstName: "Jane", lastName: "Smith" },
    ] as never);
    const queryClient = createQueryClient();
    queryClient.setQueryData(["user"], { ascId: "123", countryCode: "US" });

    renderWithProviders(queryClient);

    expect(await screen.findByTestId("table")).toHaveTextContent("2 rows");
    expect(screen.getByTestId("filters")).toBeInTheDocument();
  });

  it("does not fetch clients when user has no ascId", () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(["user"], { ascId: "", countryCode: "US" });

    renderWithProviders(queryClient);

    expect(getCustomersByAsc).not.toHaveBeenCalled();
  });

  it("does not show pagination when clients fit on one page", async () => {
    vi.mocked(getCustomersByAsc).mockResolvedValue([
      { customerId: "1", firstName: "John", lastName: "Doe" },
    ] as never);
    const queryClient = createQueryClient();
    queryClient.setQueryData(["user"], { ascId: "123", countryCode: "US" });

    renderWithProviders(queryClient);

    await screen.findByTestId("table");
    expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
  });
});
