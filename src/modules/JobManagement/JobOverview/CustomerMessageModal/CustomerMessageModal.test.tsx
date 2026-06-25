import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? React.createElement("div", { "data-testid": "customer-message-modal" }, children) : null,
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

vi.mock("../../../../api/services/jobs/action", () => ({
  postMessage: vi.fn(),
}));

vi.mock("../../../../hooks/useClickOutside", () => ({
  useClickOutside: vi.fn(),
}));

import CustomerMessageModal from "./CustomerMessageModal";
import { postMessage } from "../../../../api/services/jobs/action";

function renderModal(onClose = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(CustomerMessageModal, {
        jobId: "J1",
        isOpen: true,
        onClose,
        title: "title",
        placeholder: "placeholder",
      }),
    ),
  );
}

describe("CustomerMessageModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(postMessage).mockResolvedValue(undefined as never);
  });

  it("disables send when message is empty", () => {
    renderModal();
    expect(screen.getByTestId("send-button")).toBeDisabled();
  });

  it("sends message when valid input provided", async () => {
    renderModal();
    fireEvent.change(screen.getByTestId("customer-message-input"), {
      target: { value: "hello" },
    });
    fireEvent.click(screen.getByTestId("send-button"));

    await waitFor(() => expect(postMessage).toHaveBeenCalled());
  });

  it("clears and closes on cancel", () => {
    const onClose = vi.fn();
    renderModal(onClose);
    fireEvent.click(screen.getByTestId("cancel-button"));
    expect(onClose).toHaveBeenCalled();
  });
});
