import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.hoisted(() => vi.fn());
const mockApproveMutate = vi.hoisted(() => vi.fn());
const mockSetMessages = vi.hoisted(() => vi.fn());
const approvalsData = vi.hoisted(() => [
  { jobId: "job-1", jobStatus: "BOSCH_APPROVAL_PENDING" },
  { jobId: "job-2", jobStatus: "MULTIPLE_APPROVAL_PENDING" },
  { jobId: "job-3", jobStatus: "APPROVED" },
]);

let approveMutationOptions: {
  onSuccess?: (...args: unknown[]) => void;
  onError?: (...args: unknown[]) => void;
} = {};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});
vi.mock("../../../hooks/useBreadcrumbs", () => ({
  useBreadcrumbs: vi.fn(),
}));
vi.mock("hooks/useListFilterHandlers", () => ({
  useListFilterHandlers: () => ({
    handleToggleFilter: vi.fn(),
    applyAdvancedFilters: vi.fn(),
    resetAdvancedFilters: vi.fn(),
  }),
}));

vi.mock("../../../api/services/approvals/hooks", () => ({
  useApprovals: () => ({ data: approvalsData, isLoading: false }),
  useApproveJobs: (options: typeof approveMutationOptions) => {
    approveMutationOptions = options;
    return { mutate: mockApproveMutate, isPending: false };
  },
}));

vi.mock("contexts/messagescontext", () => ({
  MessagesContext: React.createContext({ setMessages: mockSetMessages }),
}));
vi.mock("@bosch/react-frok", () => ({
  ActivityIndicator: () => React.createElement("div", { "data-testid": "loading" }),
}));
vi.mock("components/ui/List/Filters/Filters", () => ({
  default: (props: {
    actionButton?: { label: string; disabled: boolean; onClick: () => void };
    onSearchChange: (value: string) => void;
  }) =>
    React.createElement(
      "div",
      { "data-testid": "filters" },
      React.createElement(
        "button",
        {
          "data-testid": "approve-action-button",
          disabled: props.actionButton?.disabled,
          onClick: () => props.actionButton?.onClick(),
        },
        props.actionButton?.label,
      ),
      React.createElement("input", {
        "data-testid": "search-input",
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => props.onSearchChange(e.target.value),
      }),
    ),
}));
vi.mock("components/ui/List/Table/Table", () => ({
  default: (props: {
    data: { jobId: string; jobStatus: string }[];
    onRowClick: (row: { jobId: string }) => void;
    renderRowActions?: (row: { jobId: string }) => React.ReactNode;
    isRowSelectable?: (row: { jobStatus: string }) => boolean;
    onSelectionChange: (rows: string[]) => void;
  }) =>
    React.createElement(
      "div",
      { "data-testid": "table" },
      props.data.map((row) =>
        React.createElement(
          "div",
          { key: row.jobId, "data-testid": `row-${row.jobId}` },
          React.createElement(
            "button",
            { onClick: () => props.onRowClick(row), "data-testid": `row-click-${row.jobId}` },
            row.jobId,
          ),
          React.createElement(
            "button",
            {
              "data-testid": `row-select-${row.jobId}`,
              disabled: !props.isRowSelectable?.(row),
              onClick: () => props.onSelectionChange([row.jobId]),
            },
            "select",
          ),
          props.renderRowActions?.(row),
        ),
      ),
    ),
}));
vi.mock("components/ui/Pagination/Pagination", () => ({
  default: () => React.createElement("div", { "data-testid": "pagination" }),
}));
vi.mock("./ApprovalListTable/ApprovalActionsFlyout/ApprovalActionsFlyout", () => ({
  default: () => React.createElement("div"),
}));
vi.mock("utils/scrollToError", () => ({
  scrollToTop: vi.fn(),
}));
vi.mock("@/analytics", () => ({
  useAnalytics: () => ({ trackPreApprovalReviewed: vi.fn() }),
  toJobStatus: (status: string) => status,
  PreApprovalAction: { APPROVED: "APPROVED" },
}));

import ApprovalList from "./ApprovalList";

function renderApprovalList() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
  render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(MemoryRouter, null, React.createElement(ApprovalList)),
    ),
  );
  return { invalidateSpy };
}

describe("ApprovalList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    approveMutationOptions = {};
  });

  it("renders filters", () => {
    renderApprovalList();
    expect(screen.getByTestId("filters")).toBeInTheDocument();
  });

  it("renders table", () => {
    renderApprovalList();
    expect(screen.getByTestId("table")).toBeInTheDocument();
  });

  it("renders pagination", () => {
    renderApprovalList();
    expect(screen.getByTestId("pagination")).toBeInTheDocument();
  });

  it("navigates to the approval detail page when a row is clicked", () => {
    renderApprovalList();
    fireEvent.click(screen.getByTestId("row-click-job-1"));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining("job-1"),
      expect.objectContaining({ state: { from: "approval-list" } }),
    );
  });

  it("disables the approve action button when no rows are selected", () => {
    renderApprovalList();
    expect(screen.getByTestId("approve-action-button")).toBeDisabled();
  });

  it("enables the approve action button when a pending row is selected", () => {
    renderApprovalList();
    fireEvent.click(screen.getByTestId("row-select-job-1"));
    expect(screen.getByTestId("approve-action-button")).toBeEnabled();
  });

  it("enables the approve action button when a multiple approval pending row is selected", () => {
    renderApprovalList();
    fireEvent.click(screen.getByTestId("row-select-job-2"));
    expect(screen.getByTestId("approve-action-button")).toBeEnabled();
  });

  it("marks non-pending rows as not selectable", () => {
    renderApprovalList();
    expect(screen.getByTestId("row-select-job-3")).toBeDisabled();
  });

  it("triggers the approve mutation with selected row ids", () => {
    renderApprovalList();
    fireEvent.click(screen.getByTestId("row-select-job-1"));
    fireEvent.click(screen.getByTestId("approve-action-button"));
    expect(mockApproveMutate).toHaveBeenCalledWith({ jobIds: ["job-1"] });
  });

  it("updates the search value when typing in the search field", () => {
    renderApprovalList();
    fireEvent.change(screen.getByTestId("search-input"), { target: { value: "abc" } });
    expect(screen.getByTestId("search-input")).toHaveValue("abc");
  });

  it("handles approve mutation onSuccess: clears selection, invalidates queries and shows a success message", () => {
    const { invalidateSpy } = renderApprovalList();
    fireEvent.click(screen.getByTestId("row-select-job-1"));

    approveMutationOptions.onSuccess?.();

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["approvals"] });
    expect(mockSetMessages).toHaveBeenCalled();
  });

  it("handles approve mutation onError by showing an error message", () => {
    renderApprovalList();

    approveMutationOptions.onError?.();

    expect(mockSetMessages).toHaveBeenCalled();
  });
});
