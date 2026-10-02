import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCustomerJobs } from "api/services/customers/customers";
import ClientJobsTab from "./ClientJobsTab";

vi.mock("api/services/customers/customers", () => ({
  getCustomerJobs: vi.fn(),
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("@bosch/react-frok", () => ({ Icon: () => null }));
vi.mock("components/ui/List/Filters/Filters", () => ({
  default: ({ onSearchChange }: { onSearchChange: (value: string) => void }) => (
    <input aria-label="search" onChange={(event) => onSearchChange(event.target.value)} />
  ),
}));
vi.mock("components/ui/Pagination/Pagination", () => ({
  default: ({
    onPageChange,
    onDropdownOptionChange,
  }: {
    onPageChange: (page: number) => void;
    onDropdownOptionChange: (size: string) => void;
  }) => (
    <div>
      <button onClick={() => onPageChange(2)}>next page</button>
      <button onClick={() => onDropdownOptionChange("20")}>page size 20</button>
    </div>
  ),
}));
vi.mock("components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay", () => ({
  default: () => <div data-testid="loading-jobs" />,
}));
vi.mock("components/ui/StatusIndicator/StatusIndicator", () => ({
  default: ({ status }: { status: string }) => <span>{status}</span>,
}));
vi.mock("components/ui/List/Table/Table", () => ({
  default: ({
    data,
    columns,
  }: {
    data: Record<string, unknown>[];
    columns: { key: string; render: (row: Record<string, unknown>) => React.ReactNode }[];
  }) => (
    <div data-testid="jobs-table">
      {data.map((row) => (
        <div key={String(row.jobId)}>
          {columns.map((column) => (
            <span key={column.key}>{column.render(row)}</span>
          ))}
        </div>
      ))}
    </div>
  ),
}));

const renderTab = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ClientJobsTab clientId="client-123" onRowClick={vi.fn()} onCreateJob={vi.fn()} />
    </QueryClientProvider>,
  );

describe("ClientJobsTab", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads customer jobs and displays API fields", async () => {
    vi.mocked(getCustomerJobs).mockResolvedValue({
      page: { number: 0, totalElements: 1, totalPages: 1, size: 10 },
      content: [
        {
          jobId: "job-1",
          orderId: "order-1",
          serialNumber: "SN-123",
          assetName: "Drill",
          createdOn: "2026-09-01T00:00:00Z",
          updatedOn: "2026-09-02T00:00:00Z",
          assigneeName: "Pat",
          status: "COMPLETED",
        },
      ],
    });

    renderTab();

    expect(await screen.findByText("SN-123")).toBeInTheDocument();
    expect(screen.getByText("Drill")).toBeInTheDocument();
    expect(screen.getByText("COMPLETED")).toBeInTheDocument();
    expect(getCustomerJobs).toHaveBeenCalledWith("client-123", {
      searchTerm: undefined,
      page: 0,
      size: 10,
    });
    expect(screen.queryByText("order-1")).not.toBeInTheDocument();
  });

  it("sends search, page, and page size to the backend", async () => {
    vi.mocked(getCustomerJobs).mockResolvedValue({
      page: { number: 0, totalElements: 0, totalPages: 0, size: 10 },
      content: [],
    });

    renderTab();
    await screen.findByTestId("jobs-table");

    fireEvent.change(screen.getByRole("textbox", { name: "search" }), {
      target: { value: "drill" },
    });
    await waitFor(() =>
      expect(getCustomerJobs).toHaveBeenLastCalledWith("client-123", {
        searchTerm: "drill",
        page: 0,
        size: 10,
      }),
    );

    fireEvent.click(screen.getByText("next page"));
    await waitFor(() =>
      expect(getCustomerJobs).toHaveBeenLastCalledWith("client-123", {
        searchTerm: "drill",
        page: 1,
        size: 10,
      }),
    );

    fireEvent.click(screen.getByText("page size 20"));
    await waitFor(() =>
      expect(getCustomerJobs).toHaveBeenLastCalledWith("client-123", {
        searchTerm: "drill",
        page: 0,
        size: 20,
      }),
    );
  });

  it("shows request failures instead of an empty table", async () => {
    vi.mocked(getCustomerJobs).mockRejectedValue(new Error("Network error"));

    renderTab();

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("errorLoadingJobs"));
    expect(screen.queryByTestId("jobs-table")).not.toBeInTheDocument();
  });
});
