import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
  }) =>
    open
      ? React.createElement(
          "dialog",
          { "data-testid": "documents-modal", open: true },
          React.createElement("h1", null, title),
          children,
        )
      : null,
}));

vi.mock("../DocumentFile/DocumentFile", () => ({
  default: ({ name }: { name: string }) =>
    React.createElement("div", { "data-testid": `doc-file-${name}` }, name),
}));

vi.mock("../../../hooks/useClickOutside", () => ({ useClickOutside: vi.fn() }));

import DocumentsModal from "./DocumentsModal";
import type { Attachment } from "./DocumentsModal";

const attachments: Attachment[] = [
  { name: "file1.pdf", type: "INVOICE", attachmentId: "att-1" },
  { name: "file2.jpg", type: "PRODUCT_PHOTO", attachmentId: "att-2" },
];

function renderModal(props: Record<string, unknown> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(DocumentsModal, {
        attachments,
        isOpen: true,
        onClose: vi.fn(),
        jobId: "job-1",
        ...props,
      }),
    ),
  );
}

describe("DocumentsModal", () => {
  it("renders when open", () => {
    renderModal();
    expect(screen.getByTestId("documents-modal")).toBeInTheDocument();
  });

  it("renders attachment files", () => {
    renderModal();
    expect(screen.getByTestId("doc-file-file1.pdf")).toBeInTheDocument();
    expect(screen.getByTestId("doc-file-file2.jpg")).toBeInTheDocument();
  });

  it("renders empty message when no attachments", () => {
    renderModal({ attachments: [] });
    expect(screen.getByText("NoDocumentsFound")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    renderModal({ isOpen: false });
    expect(screen.queryByTestId("documents-modal")).not.toBeInTheDocument();
  });

  it("renders modal title", () => {
    renderModal();
    expect(screen.getByText("documents")).toBeInTheDocument();
  });
});
