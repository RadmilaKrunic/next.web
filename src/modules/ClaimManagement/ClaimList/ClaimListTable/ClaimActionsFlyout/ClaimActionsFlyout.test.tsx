import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
  }) => React.createElement("div", { "data-testid": "claim-actions-popover" }, trigger, children),
}));

vi.mock("../ClaimAction/ClaimAction", () => ({
  default: ({ actionName, onClick }: { actionName: string; onClick?: () => void }) =>
    React.createElement(
      "button",
      { "data-testid": `claim-action-${actionName}`, onClick },
      actionName,
    ),
}));

vi.mock("../../../ClaimOverview/ClaimNoteModal/ClaimNoteModal", () => ({
  default: ({ isOpen, action }: { isOpen: boolean; action: string }) =>
    isOpen ? React.createElement("div", { "data-testid": "claim-note-modal" }, action) : null,
}));

vi.mock("hooks/useClaimDecisionPermissions", () => ({
  useClaimDecisionPermissions: vi.fn(() => ({
    canChangeClaimDecision: () => true,
    showDecisionActions: true,
  })),
}));

import ClaimActionsFlyout from "./ClaimActionsFlyout";
import { MessagesContext } from "contexts/messagescontext";

function renderFlyout() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const setSelectedClaimId = vi.fn();
  const setShowDocumentModal = vi.fn();
  const setShowMessagesModal = vi.fn();

  render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        MessagesContext.Provider,
        { value: { messages: [], setMessages: vi.fn() } },
        React.createElement(ClaimActionsFlyout, {
          claim: { claimId: "C1", jobId: "J1", status: "PENDING" } as never,
          setSelectedClaimId,
          setShowDocumentModal,
          setShowMessagesModal,
        }),
      ),
    ),
  );

  return { setSelectedClaimId, setShowDocumentModal, setShowMessagesModal };
}

describe("ClaimActionsFlyout", () => {
  it("opens note modal for decision action", () => {
    renderFlyout();
    fireEvent.click(screen.getByTestId("claim-action-approve"));
    expect(screen.getByTestId("claim-note-modal")).toHaveTextContent("Approve");
  });

  it("opens messages and documents", () => {
    const { setSelectedClaimId, setShowMessagesModal, setShowDocumentModal } = renderFlyout();

    fireEvent.click(screen.getByTestId("claim-action-messages"));
    fireEvent.click(screen.getByTestId("claim-action-documents"));

    expect(setSelectedClaimId).toHaveBeenCalledWith("C1");
    expect(setShowMessagesModal).toHaveBeenCalledWith(true);
    expect(setShowDocumentModal).toHaveBeenCalledWith(true);
  });
});
