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
vi.mock("api/services/jobs/hooks", () => ({
  useJobs: () => ({ data: [], isLoading: false }),
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
vi.mock("components/ui/DocumentsModal/DocumentsModal", () => ({
  default: () => React.createElement("div"),
}));
vi.mock("components/ui/MessagesModal/MessagesModal", () => ({
  default: () => React.createElement("div"),
}));
vi.mock("./JobListTable/JobActionsFlyout/JobActionsFlyout", () => ({
  default: () => React.createElement("div"),
}));
vi.mock("./FiltersBar/FilterOptionsPopup/CustomizeColumnsPopup/CustomizeColumnsPopup", () => ({
  default: () => React.createElement("div"),
}));

import JobList from "./JobList";

function renderJobList() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(MemoryRouter, null, React.createElement(JobList)),
    ),
  );
}

describe("JobList", () => {
  it("renders filters", () => {
    renderJobList();
    expect(screen.getByTestId("filters")).toBeInTheDocument();
  });

  it("renders table", () => {
    renderJobList();
    expect(screen.getByTestId("table")).toBeInTheDocument();
  });

  it("renders pagination", () => {
    renderJobList();
    expect(screen.getByTestId("pagination")).toBeInTheDocument();
  });
});
