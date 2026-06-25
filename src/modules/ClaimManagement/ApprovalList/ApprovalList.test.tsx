import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
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
  useApprovals: () => ({ data: [], isLoading: false }),
  useApproveJobs: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("contexts/messagescontext", () => ({
  MessagesContext: React.createContext({ setMessages: vi.fn() }),
}));
vi.mock("@bosch/react-frok", () => ({
  ActivityIndicator: () => React.createElement("div", { "data-testid": "loading" }),
}));
vi.mock("components/ui/List/Filters/Filters", () => ({
  default: () => React.createElement("div", { "data-testid": "filters" }),
}));
vi.mock("components/ui/List/Table/Table", () => ({
  default: () => React.createElement("div", { "data-testid": "table" }),
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

import ApprovalList from "./ApprovalList";

function renderApprovalList() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(MemoryRouter, null, React.createElement(ApprovalList)),
    ),
  );
}

describe("ApprovalList", () => {
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
});
