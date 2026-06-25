import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("hooks/useListFilterHandlers", () => ({
  useListFilterHandlers: () => ({
    handleToggleFilter: vi.fn(),
    applyAdvancedFilters: vi.fn(),
    resetAdvancedFilters: vi.fn(),
  }),
}));
vi.mock("hooks/useHasPermission", () => ({
  useHasPermission: () => true,
}));
vi.mock("api/services/claims/hooks", () => ({
  useClaims: () => ({ data: [], isLoading: false }),
  useClaimById: () => ({ data: null }),
  useBulkApproveClaims: () => ({ mutate: vi.fn(), isPending: false }),
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
vi.mock("components/ui/DocumentsModal/DocumentsModal", () => ({
  default: () => React.createElement("div", { "data-testid": "docs-modal" }),
}));
vi.mock("components/ui/MessagesModal/MessagesModal", () => ({
  default: () => React.createElement("div", { "data-testid": "messages-modal" }),
}));
vi.mock("./ClaimListTable/ClaimActionsFlyout/ClaimActionsFlyout", () => ({
  default: () => React.createElement("div"),
}));

import ClaimList from "./ClaimList";

function renderClaimList() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(MemoryRouter, null, React.createElement(ClaimList)),
    ),
  );
}

describe("ClaimList", () => {
  it("renders filters", () => {
    renderClaimList();
    expect(screen.getByTestId("filters")).toBeInTheDocument();
  });

  it("renders table", () => {
    renderClaimList();
    expect(screen.getByTestId("table")).toBeInTheDocument();
  });

  it("renders pagination", () => {
    renderClaimList();
    expect(screen.getByTestId("pagination")).toBeInTheDocument();
  });
});
