import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) =>
    React.createElement("button", { onClick }, children),
  Icon: () => null,
  Badge: () => null,
}));

vi.mock("../../../api/services/jobs/hooks", () => ({
  useMessages: vi.fn().mockReturnValue({ data: [] }),
}));

vi.mock("../MessagesModal/MessagesPreview/MessagesPreview", () => ({
  default: ({ message }: { message: { messageId: string; text?: string } }) =>
    React.createElement(
      "div",
      { "data-testid": `message-${message.messageId}` },
      message.messageId,
    ),
}));

vi.mock("./NotesLegend", () => ({
  default: () => React.createElement("div", { "data-testid": "notes-legend" }),
}));

import NotesList from "./NotesList";
import { useMessages } from "../../../api/services/jobs/hooks";

const mockUseMessages = vi.mocked(useMessages);

function renderNotesList(jobId = "job-1", entityType?: "job" | "claim") {
  const qc = new QueryClient();
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(
        MemoryRouter,
        { initialEntries: [`/job-overview/${jobId}`] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: "/job-overview/:jobId",
            element: React.createElement(NotesList, entityType ? { entityType } : undefined),
          }),
        ),
      ),
    ),
  );
}

describe("NotesList", () => {
  it("renders empty notes message when no messages", () => {
    mockUseMessages.mockReturnValue({ data: [] } as ReturnType<typeof useMessages>);
    renderNotesList();
    expect(screen.getByText("notesWereNotAdded")).toBeInTheDocument();
  });

  it("renders messages when provided", () => {
    mockUseMessages.mockReturnValue({
      data: [
        { messageId: "m1", text: "Note 1", messageType: "INTERNAL" },
        { messageId: "m2", text: "Note 2", messageType: "INTERNAL" },
      ],
    } as ReturnType<typeof useMessages>);
    renderNotesList();
    expect(screen.getByTestId("message-m1")).toBeInTheDocument();
    expect(screen.getByTestId("message-m2")).toBeInTheDocument();
  });

  it("renders show more button when there are more than 3 messages", () => {
    mockUseMessages.mockReturnValue({
      data: [
        { messageId: "m1", messageType: "INTERNAL" },
        { messageId: "m2", messageType: "INTERNAL" },
        { messageId: "m3", messageType: "INTERNAL" },
        { messageId: "m4", messageType: "INTERNAL" },
      ],
    } as ReturnType<typeof useMessages>);
    renderNotesList();
    expect(screen.getByText("showMore")).toBeInTheDocument();
  });

  it("does not show more button when there are 3 or fewer messages", () => {
    mockUseMessages.mockReturnValue({
      data: [{ messageId: "m1", messageType: "INTERNAL" }],
    } as ReturnType<typeof useMessages>);
    renderNotesList();
    expect(screen.queryByText("showMore")).not.toBeInTheDocument();
  });

  it("renders notes legend when there are messages", () => {
    mockUseMessages.mockReturnValue({
      data: [{ messageId: "m1", messageType: "INTERNAL" }],
    } as ReturnType<typeof useMessages>);
    renderNotesList();
    expect(screen.getByTestId("notes-legend")).toBeInTheDocument();
  });
});
