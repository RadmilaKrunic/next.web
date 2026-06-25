import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const navigateMock = vi.fn();
const mutateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Button: ({ "data-testid": testId }: { "data-testid"?: string }) =>
    React.createElement("button", { "data-testid": testId }, "trigger"),
}));

vi.mock("components/ui/ScrollablePopover/ScrollablePopover", () => ({
  ScrollablePopover: ({
    trigger,
    children,
  }: {
    trigger: React.ReactNode;
    children: React.ReactNode;
  }) => React.createElement("div", { "data-testid": "approval-popover" }, trigger, children),
}));

vi.mock("../ApprovalAction/ApprovalAction", () => ({
  default: ({ actionName, onClick }: { actionName: string; onClick?: () => void }) =>
    React.createElement(
      "button",
      { "data-testid": `approval-action-${actionName}`, onClick },
      actionName,
    ),
}));

vi.mock("../ApprovalDecisionModal/ApprovalDecisionModal", () => ({
  default: ({ onConfirm, title }: { onConfirm: (msg: string) => void; title: string }) =>
    React.createElement(
      "div",
      { "data-testid": "decision-modal" },
      React.createElement("span", null, title),
      React.createElement(
        "button",
        { "data-testid": "confirm-decision", onClick: () => onConfirm("ok") },
        "confirm",
      ),
    ),
}));

vi.mock("api/services/approvals/hooks", () => ({
  useUpdateApprovalStatus: vi.fn((cfg: { onSuccess?: () => void; onError?: () => void }) => ({
    mutate: (payload: unknown) => {
      mutateMock(payload);
      cfg.onSuccess?.();
    },
  })),
}));

import ApprovalActionsFlyout from "./ApprovalActionsFlyout";
import { MessagesContext } from "contexts/messagescontext";

function renderFlyout() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(["job", "J1"], {
    job: { pendingApprovals: [] },
  });
  const setMessages = vi.fn();

  return {
    setMessages,
    ...render(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(
          MessagesContext.Provider,
          { value: { messages: [], setMessages } },
          React.createElement(ApprovalActionsFlyout, {
            jobId: "J1",
            materialId: "M1",
            showJobDetailsAction: true,
          }),
        ),
      ),
    ),
  };
}

describe("ApprovalActionsFlyout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("scrollTo", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens job details action and navigates", () => {
    renderFlyout();

    fireEvent.click(screen.getByTestId("approval-action-openJobDetails"));

    expect(navigateMock).toHaveBeenCalledWith("/job-overview/J1#diagnosticData", {
      state: { from: "approval-list" },
    });
  });

  it("opens modal on approve action and submits decision", async () => {
    const { setMessages } = renderFlyout();

    fireEvent.click(screen.getByTestId("approval-action-approveGoodwill"));
    expect(screen.getByTestId("decision-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("confirm-decision"));

    await waitFor(() => expect(mutateMock).toHaveBeenCalled());
    expect(setMessages).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith("/approval-list");
  });

  it("opens revised modal title for clarification action", () => {
    renderFlyout();

    fireEvent.click(screen.getByTestId("approval-action-requestClarification"));

    expect(screen.getByTestId("decision-modal")).toHaveTextContent("requestClarification");
  });
});
