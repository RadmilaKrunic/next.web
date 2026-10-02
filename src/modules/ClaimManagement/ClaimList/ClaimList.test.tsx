import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
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
const { bulkApproveMutate, setMessagesMock } = vi.hoisted(() => ({
  bulkApproveMutate: vi.fn(),
  setMessagesMock: vi.fn(),
}));
let claimsState: { data: unknown[]; isLoading: boolean } = { data: [], isLoading: false };
let bulkApproveOptions: {
  onSuccess?: (data: unknown, variables: { decision: string }) => void;
  onError?: (error: unknown, variables: { decision: string }) => void;
} = {};

vi.mock("api/services/claims/hooks", () => ({
  useClaims: () => claimsState,
  useClaimById: () => ({ data: null }),
  useBulkApproveClaims: (options: typeof bulkApproveOptions) => {
    bulkApproveOptions = options;
    return { mutate: bulkApproveMutate, isPending: false };
  },
}));
vi.mock("contexts/messagescontext", () => ({
  MessagesContext: React.createContext({ setMessages: setMessagesMock }),
}));
vi.mock("@bosch/react-frok", () => ({
  ActivityIndicator: () => React.createElement("div", { "data-testid": "loading" }),
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement("button", props, children),
}));
vi.mock("components/ui/List/Filters/Filters", () => ({
  default: ({
    splitActionButton,
    optionsContent,
  }: {
    splitActionButton?: {
      primaryLabel: string;
      primaryAction?: () => void;
      primaryDisabled?: boolean;
      options: Array<{ label: string; onClick: () => void; disabled?: boolean }>;
    };
    optionsContent?: React.ReactNode;
  }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    return React.createElement(
      "div",
      { "data-testid": "filters" },
      splitActionButton &&
        React.createElement(
          "div",
          { "data-testid": "split-action-button" },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: splitActionButton.primaryAction,
              disabled: splitActionButton.primaryDisabled,
            },
            splitActionButton.primaryLabel,
          ),
          React.createElement(
            "button",
            {
              type: "button",
              "aria-label": "moreOptions",
              onClick: () => setIsOpen((open) => !open),
            },
            "moreOptions",
          ),
          isOpen &&
            React.createElement(
              "div",
              { "data-testid": "split-action-menu" },
              splitActionButton.options.map((option) =>
                React.createElement(
                  "button",
                  {
                    key: option.label,
                    type: "button",
                    disabled: option.disabled,
                    onClick: option.onClick,
                  },
                  option.label,
                ),
              ),
            ),
        ),
      optionsContent,
    );
  },
}));
vi.mock("components/ui/List/Table/Table", () => ({
  default: ({ onSelectionChange }: { onSelectionChange?: (rows: string[]) => void }) =>
    React.createElement(
      "div",
      { "data-testid": "table" },
      React.createElement(
        "button",
        { type: "button", onClick: () => onSelectionChange?.(["claim-1"]) },
        "select-row",
      ),
    ),
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
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    claimsState = { data: [], isLoading: false };
    mockedUseHasPermission.mockReturnValue(true);
  });

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

  it("renders split bulk decision action with reject and revise options only in the dropdown", () => {
    mockedUseHasPermission.mockReturnValue(true);
    renderClaimList();

    expect(screen.getByRole("button", { name: "approve" })).toBeInTheDocument();
    expect(screen.getByLabelText("moreOptions")).toBeInTheDocument();

    const moreOptionsButton = screen.getByLabelText("moreOptions");

    fireEvent.click(moreOptionsButton);

    expect(screen.getByTestId("split-action-menu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "reject" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "revise" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "approve" })).toBeInTheDocument();
  });

  it("shows loading indicator while claims load", () => {
    claimsState = { data: [], isLoading: true };

    renderClaimList();

    expect(screen.getByTestId("loading")).toBeInTheDocument();
    expect(screen.queryByTestId("table")).not.toBeInTheDocument();
  });

  it("hides split action button when user cannot perform claim decision", () => {
    mockedUseHasPermission.mockReturnValue(false);

    renderClaimList();

    expect(screen.queryByTestId("split-action-button")).not.toBeInTheDocument();
  });

  it("disables bulk actions while no row is selected", () => {
    renderClaimList();

    expect(screen.getByRole("button", { name: "approve" })).toBeDisabled();

    fireEvent.click(screen.getByLabelText("moreOptions"));

    expect(screen.getByRole("button", { name: "reject" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "revise" })).toBeDisabled();
  });

  it.each([
    ["approve", "APPROVED", "Approved after bulk review"],
    ["reject", "REJECTED", "Rejected after bulk review"],
    ["revise", "REVISED", "Revision requested after bulk review"],
  ])("triggers %s bulk decision for selected claims", (label, decision, message) => {
    renderClaimList();

    fireEvent.click(screen.getByRole("button", { name: "select-row" }));
    fireEvent.click(screen.getByLabelText("moreOptions"));
    fireEvent.click(screen.getByRole("button", { name: label }));

    expect(bulkApproveMutate).toHaveBeenCalledWith({
      claimIds: ["claim-1"],
      decision,
      message,
    });
  });

  it.each([
    ["APPROVED", "successfulClaimsBulkApprove"],
    ["REJECTED", "successfulClaimsBulkReject"],
    ["REVISED", "successfulClaimsBulkRevise"],
  ])("pushes success message for %s decision", (decision, expectedText) => {
    renderClaimList();

    act(() => {
      bulkApproveOptions.onSuccess?.(undefined, { decision });
    });

    const updater = setMessagesMock.mock.calls[0][0] as (prev: unknown[]) => unknown[];
    expect(updater([])).toEqual([{ type: "success", text: expectedText, duration: 3000 }]);
  });

  it.each([
    ["APPROVED", "errorClaimsBulkApprove"],
    ["REJECTED", "errorClaimsBulkReject"],
    ["REVISED", "errorClaimsBulkRevise"],
  ])("pushes error message for %s decision", (decision, expectedText) => {
    renderClaimList();

    bulkApproveOptions.onError?.(new Error("failed"), { decision });

    const updater = setMessagesMock.mock.calls[0][0] as (prev: unknown[]) => unknown[];
    expect(updater([])).toEqual([{ type: "error", text: expectedText, duration: 3000 }]);
  });
});
