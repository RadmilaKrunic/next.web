import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

vi.mock("./ClaimOverviewHeader/ClaimOverviewHeader", () => ({
  __esModule: true,
  default: () =>
    React.createElement("div", { "data-testid": "claim-overview-header" }, "claim-header"),
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

vi.mock("hooks/useFormInitialization", () => ({
  useFormInitialization: () => ({
    initialFormValues: { actionType: "", jobType: "" },
    setInitialFormValues: vi.fn(),
    allFields: [],
    setAllFields: vi.fn(),
    mandatoryFields: null,
    tabs: [{ name: "claims", isTab: true, areas: [], permissions: [] }],
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

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

const mockClaimData = { id: "C001", claimStatus: "PENDING", jobDiagnostic: {} };

function renderWithClaim(component: React.ReactElement, claimData = mockClaimData) {
  const qc = createTestQueryClient();
  if (claimData) qc.setQueryData(["claim", "C001"], claimData);
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/claim-overview/C001"] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, { path: "/claim-overview/:claimId", element: component }),
        ),
      ),
    ),
  );
}

describe("ClaimOverview component", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders without crashing when claim data present", async () => {
    const { default: ClaimOverview } =
      await vi.importActual<typeof import("./ClaimOverview")>("./ClaimOverview");
    renderWithClaim(React.createElement(ClaimOverview));
    expect(await screen.findByTestId("claim-overview-header")).toBeInTheDocument();
  });

  it("renders claims tab placeholder", async () => {
    const { default: ClaimOverview } =
      await vi.importActual<typeof import("./ClaimOverview")>("./ClaimOverview");
    renderWithClaim(React.createElement(ClaimOverview));
    expect(screen.getByTestId("section-claims")).toBeInTheDocument();
  });
});
