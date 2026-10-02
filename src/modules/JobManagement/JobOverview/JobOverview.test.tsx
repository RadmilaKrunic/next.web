import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

// Minimal mocks for child components to keep render surface small
vi.mock("./JobOverviewHeader/JobOverviewHeader", () => ({
  __esModule: true,
  default: () => React.createElement("div", { "data-testid": "job-overview-header" }, "header"),
}));

vi.mock("components/generics/Section/GenericSection", () => ({
  default: ({ section }: any) =>
    React.createElement("div", { "data-testid": `section-${section.name}` }, section.name),
}));

vi.mock("components/generics/Action/GenericAction", () => ({
  default: () => React.createElement("div", { "data-testid": "generic-actions" }, "actions"),
}));

vi.mock("../../../components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay", () => ({
  default: () => React.createElement("div", { "data-testid": "loading" }, "loading"),
}));

// Hooks & contexts that JobOverview uses — keep stable, minimal behaviour
vi.mock("hooks/useFormInitialization", () => ({
  useFormInitialization: () => ({
    initialFormValues: { actionType: "", jobType: "" },
    setInitialFormValues: vi.fn(),
    allFields: [],
    setAllFields: vi.fn(),
    mandatoryFields: null,
    tabs: [{ name: "assetData", isTab: true, areas: [], permissions: [] }],
    setTabs: vi.fn(),
  }),
}));

vi.mock("hooks/useUIConfiguration", () => ({
  useResourceUIConfiguration: () => ({
    uiConfiguration: null,
    countryCode: "US",
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("hooks/useBreadcrumbs", () => ({ useBreadcrumbs: vi.fn() }));

vi.mock("contexts/messagescontext", () => ({
  MessagesContext: React.createContext({ setMessages: () => {} }),
}));

// Provide a query client helper
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

const mockJobData = {
  order: { orderId: "O001", countryCode: "US" },
  job: { jobId: "J001", jobStatus: "DRAFT" },
};

function renderWithJob(component: React.ReactElement, jobData = mockJobData) {
  const qc = createTestQueryClient();
  if (jobData) qc.setQueryData(["job", "J001"], jobData);
  qc.setQueryData(["diagnostic", "J001"], {});
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/job-overview/J001"] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, { path: "/job-overview/:jobId", element: component }),
        ),
      ),
    ),
  );
}

describe("JobOverview component", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders without crashing when job data present", async () => {
    const { default: JobOverview } =
      await vi.importActual<typeof import("./JobOverview")>("./JobOverview");
    renderWithJob(React.createElement(JobOverview));
    expect(await screen.findByTestId("job-overview-header")).toBeInTheDocument();
  });

  it("renders sections placeholder", async () => {
    const { default: JobOverview } =
      await vi.importActual<typeof import("./JobOverview")>("./JobOverview");
    renderWithJob(React.createElement(JobOverview));
    expect(screen.getByTestId("section-assetData")).toBeInTheDocument();
  });
});
