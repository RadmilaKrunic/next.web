import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import ClientsList from "./ClientsList";
import { useClientManagementCustomers } from "api/services/clientManagement/hooks";

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

vi.mock("api/services/clientManagement/hooks", () => ({
  useClientManagementCustomers: vi.fn(),
}));

vi.mock("./ClientsListColumns.config", () => ({
  getClientColumns: () => [{ key: "name", header: "Name" }],
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
    vi.mocked(useClientManagementCustomers).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as never);
    const queryClient = createQueryClient();
    queryClient.setQueryData(["user"], { ascId: "123", countryCode: "US" });

    renderWithProviders(queryClient);

    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("shows error message when query fails", async () => {
    vi.mocked(useClientManagementCustomers).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as never);
    const queryClient = createQueryClient();
    queryClient.setQueryData(["user"], { ascId: "123", countryCode: "US" });

    renderWithProviders(queryClient);

    expect(await screen.findByText("SomethingWentWrong")).toBeInTheDocument();
  });

  it("renders table with fetched clients", async () => {
    vi.mocked(useClientManagementCustomers).mockReturnValue({
      data: {
        content: [
          { customerId: "1", name: "John Doe" },
          { customerId: "2", name: "Jane Smith" },
        ],
        page: { totalElements: 2, number: 0, size: 10, totalPages: 1 },
      },
      isLoading: false,
      isError: false,
    } as never);
    const queryClient = createQueryClient();
    queryClient.setQueryData(["user"], { ascId: "123", countryCode: "US" });

    renderWithProviders(queryClient);

    expect(await screen.findByTestId("table")).toHaveTextContent("2 rows");
    expect(screen.getByTestId("filters")).toBeInTheDocument();
  });

  it("does not show pagination when clients fit on one page", async () => {
    vi.mocked(useClientManagementCustomers).mockReturnValue({
      data: {
        content: [{ customerId: "1", name: "John Doe" }],
        page: { totalElements: 1, number: 0, size: 10, totalPages: 1 },
      },
      isLoading: false,
      isError: false,
    } as never);
    const queryClient = createQueryClient();
    queryClient.setQueryData(["user"], { ascId: "123", countryCode: "US" });

    renderWithProviders(queryClient);

    await screen.findByTestId("table");
    expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
  });
});
