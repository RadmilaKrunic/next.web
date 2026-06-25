import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Icon: ({ iconName }: { iconName: string }) =>
    React.createElement("span", { "data-testid": `icon-${iconName}` }),
}));

vi.mock("../../../api/services/file/action", () => ({
  deleteFileFromServer: vi.fn().mockResolvedValue(undefined),
  downloadFileFromServer: vi.fn().mockResolvedValue(new Blob(["data"])),
}));

vi.mock("../../../api/services/jobs/action", () => ({
  deleteJobAttachment: vi.fn().mockResolvedValue([]),
}));

import DocumentFile from "./DocumentFile";

function renderDocumentFile(props: Record<string, unknown> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(DocumentFile, {
        name: "test.pdf",
        type: "INVOICE",
        fileId: "file-123",
        dataTestid: "test-doc",
        ...props,
      }),
    ),
  );
}

describe("DocumentFile", () => {
  it("renders the document row", () => {
    renderDocumentFile();
    expect(screen.getByTestId("document-file-test-doc")).toBeInTheDocument();
  });

  it("renders file name with type", () => {
    renderDocumentFile();
    expect(screen.getByText("test.pdf")).toBeInTheDocument();
  });

  it("renders file name without type when type not provided", () => {
    renderDocumentFile({ type: undefined });
    expect(screen.getByText("test.pdf")).toBeInTheDocument();
  });

  it("renders file size when provided", () => {
    renderDocumentFile({ size: 1048576 }); // 1MB
    expect(screen.getByText(/1\.0 MB/)).toBeInTheDocument();
  });

  it("renders delete button for deletable type", () => {
    renderDocumentFile();
    expect(screen.getByTestId("delete-document-test-doc")).toBeInTheDocument();
  });

  it("hides delete button when hideDelete=true", () => {
    renderDocumentFile({ hideDelete: true });
    expect(screen.queryByTestId("delete-document-test-doc")).not.toBeInTheDocument();
  });

  it("calls removeFile when provided and delete clicked", async () => {
    const removeFile = vi.fn();
    renderDocumentFile({ removeFile });
    await userEvent.click(screen.getByTestId("delete-document-test-doc"));
    expect(removeFile).toHaveBeenCalled();
  });

  it("renders document icon", () => {
    renderDocumentFile();
    expect(screen.getByTestId("icon-document-plain")).toBeInTheDocument();
  });
});
