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
  useHasPermission: vi.fn(),
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
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement("button", props, children),
}));
vi.mock("components/ui/List/Filters/Filters", () => ({
  default: ({ optionsContent }: { optionsContent?: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "filters" }, optionsContent),
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
vi.mock(
  "components/ui/List/Filters/FiltersOptionsPopup/CustomizeColumnsPopup/CustomizeColumnsPopup",
  () => ({ default: () => React.createElement("div") }),
);
vi.mock("./ClaimListExportDialog/ClaimListExportDialog", () => ({
  default: () => React.createElement("div", { "data-testid": "export-dialog" }),
}));

import ClaimList from "./ClaimList";
import { useHasPermission } from "hooks/useHasPermission";

const mockedUseHasPermission = vi.mocked(useHasPermission);

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
  it("renders export button when user can download claim list", () => {
    mockedUseHasPermission.mockReturnValue(true);

    renderClaimList();

    expect(screen.getByRole("button", { name: "exportClaimList" })).toBeInTheDocument();
  });

  it("hides export button when user cannot download claim list", () => {
    mockedUseHasPermission.mockReturnValue(false);

    renderClaimList();

    expect(screen.queryByRole("button", { name: "exportClaimList" })).not.toBeInTheDocument();
  });

  it.each([
    ["filters", "filters"],
    ["table", "table"],
    ["pagination", "pagination"],
  ])("renders %s", (_, testId) => {
    renderClaimList();
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });
});
