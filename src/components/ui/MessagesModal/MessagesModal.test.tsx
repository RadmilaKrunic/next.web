import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    React.createElement("button", { onClick }, children),
  Dialog: ({
    children,
    open,
    title,
  }: {
    children: React.ReactNode;
    open: boolean;
    title: string;
  }) =>
    open
      ? React.createElement(
          "dialog",
          { "data-testid": "messages-modal", open: true },
          React.createElement("h1", null, title),
          children,
        )
      : null,
  Icon: () => null,
}));

vi.mock("api/services/jobs/hooks", () => ({
  useMessages: vi.fn().mockReturnValue({ data: [] }),
}));

vi.mock("hooks/useClickOutside", () => ({ useClickOutside: vi.fn() }));

vi.mock("./MessagesPreview/MessagesPreview", () => ({
  default: ({ message }: { message: { messageId: string } }) =>
    React.createElement("div", { "data-testid": `preview-${message.messageId}` }),
}));

vi.mock("../NotesSection/NotesLegend", () => ({
  default: () => React.createElement("div", { "data-testid": "notes-legend" }),
}));

import MessagesModal from "./MessagesModal";
import { useMessages } from "api/services/jobs/hooks";

const mockUseMessages = vi.mocked(useMessages);

function renderModal(props: Record<string, unknown> = {}) {
  const qc = new QueryClient();
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(MessagesModal, {
          isOpen: true,
          onClose: vi.fn(),
          jobId: "job-1",
          ...props,
        }),
      ),
    ),
  );
}

describe("MessagesModal", () => {
  it("renders when open", () => {
    mockUseMessages.mockReturnValue({ data: [] } as ReturnType<typeof useMessages>);
    renderModal();
    expect(screen.getByTestId("messages-modal")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    mockUseMessages.mockReturnValue({ data: [] } as ReturnType<typeof useMessages>);
    renderModal({ isOpen: false });
    expect(screen.queryByTestId("messages-modal")).not.toBeInTheDocument();
  });

  it("renders show all button", () => {
    mockUseMessages.mockReturnValue({ data: [] } as ReturnType<typeof useMessages>);
    renderModal();
    expect(screen.getByText("ShowAll")).toBeInTheDocument();
  });

  it("renders message previews when messages exist", () => {
    mockUseMessages.mockReturnValue({
      data: [
        { messageId: "m1", messageType: "INTERNAL" },
        { messageId: "m2", messageType: "CUSTOMER" },
      ],
    } as ReturnType<typeof useMessages>);
    renderModal();
    expect(screen.getByTestId("preview-m1")).toBeInTheDocument();
    expect(screen.getByTestId("preview-m2")).toBeInTheDocument();
  });

  it("does not render notes legend when no messages", () => {
    mockUseMessages.mockReturnValue({ data: [] } as ReturnType<typeof useMessages>);
    renderModal();
    expect(screen.queryByTestId("notes-legend")).not.toBeInTheDocument();
  });

  it("renders empty state when no messages", () => {
    mockUseMessages.mockReturnValue({ data: [] } as ReturnType<typeof useMessages>);
    renderModal();
    expect(screen.getByText("NoMessagesFound")).toBeInTheDocument();
  });
});
