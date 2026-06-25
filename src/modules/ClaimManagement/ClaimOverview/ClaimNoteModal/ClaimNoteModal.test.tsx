import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Dialog: ({
    children,
    open,
    title,
  }: {
    children: React.ReactNode;
    open: boolean;
    title: string;
  }) => (open ? React.createElement("div", { "data-testid": "dialog" }, title, children) : null),
  TextArea: ({
    value,
    onChange,
    "data-testid": testId,
  }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    "data-testid"?: string;
  }) => React.createElement("textarea", { value, onChange, "data-testid": testId }),
  Button: ({
    children,
    onClick,
    disabled,
    "data-testid": testId,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    "data-testid"?: string;
  }) => React.createElement("button", { onClick, disabled, "data-testid": testId }, children),
}));

vi.mock("api/services/claims/action", () => ({
  postClaimDecision: vi.fn(),
}));

import ClaimNoteModal from "./ClaimNoteModal";
import { postClaimDecision } from "api/services/claims/action";

function renderModal(props?: Record<string, unknown>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(ClaimNoteModal, {
        action: "Reject",
        claimId: "C1",
        jobId: "J1",
        isOpen: true,
        setIsOpen: vi.fn(),
        ...props,
      } as never),
    ),
  );
}

describe("ClaimNoteModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(postClaimDecision).mockResolvedValue(undefined as never);
  });

  it("renders modal and disables save when note required but empty", () => {
    renderModal();

    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("save-note-for-claim-reject-button")).toBeDisabled();
  });

  it("submits decision when note entered", async () => {
    renderModal();

    fireEvent.change(screen.getByTestId("claim-note-textarea"), { target: { value: "reason" } });
    fireEvent.click(screen.getByTestId("save-note-for-claim-reject-button"));

    await waitFor(() => expect(postClaimDecision).toHaveBeenCalled());
  });

  it("allows approve without required note", () => {
    renderModal({ action: "Approve" });

    expect(screen.getByTestId("save-note-for-claim-approve-button")).toBeEnabled();
  });
});
