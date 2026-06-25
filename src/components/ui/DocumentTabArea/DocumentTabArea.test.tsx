import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Formik } from "formik";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("components/ui/DocumentFile/DocumentFile", () => ({
  default: ({ fileId, hideDelete }: { fileId: string; hideDelete: boolean }) =>
    React.createElement(
      "div",
      { "data-testid": `doc-${fileId}`, "data-hide-delete": String(hideDelete) },
      fileId,
    ),
}));

vi.mock("components/generics/Field/GenericField", () => ({
  default: ({ field }: { field: { name: string } }) =>
    React.createElement("div", { "data-testid": "upload-field" }, field.name),
}));

vi.mock("components/generics/Action/GenericAction", () => ({
  default: ({
    actions,
    onActionClick,
  }: {
    actions: Array<{ onAction?: string }>;
    onActionClick: (action?: string) => void;
  }) =>
    React.createElement(
      "button",
      {
        "data-testid": "save-docs-action",
        onClick: () => onActionClick(actions[0]?.onAction),
      },
      "save",
    ),
}));

vi.mock("components/generics/Action/actionDependency", () => ({
  checkActionCondition: vi.fn(() => true),
}));

const mutateMock = vi.fn();
vi.mock("api/services/jobs/hooks", () => ({
  useUpdateJobAttachments: vi.fn((cfg: { onSuccess?: () => void }) => ({
    mutate: (payload: unknown) => {
      mutateMock(payload);
      cfg.onSuccess?.();
    },
  })),
}));

import DocumentTabArea from "./DocumentTabArea";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import { MessagesContext } from "contexts/messagescontext";

const area = {
  name: "documentList",
  label: "Documents",
  fields: [{ name: "uploadedDocs", label: "upload", type: "upload" }],
  actions: [{ label: "save", onAction: "onSaveDocuments" }],
};

function renderArea({
  entityType = "job",
  values = { uploadedDocs: [] },
  jobData,
}: {
  entityType?: "job" | "claim";
  values?: Record<string, unknown>;
  jobData: unknown;
}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(["job", "J1"], jobData);
  queryClient.setQueryData(["claim", "C1"], jobData);
  queryClient.setQueryData(["claim", undefined], jobData);
  queryClient.setQueryData(["user"], { permissions: [] });

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
          React.createElement(
            GenericFormContext.Provider,
            {
              value: {
                allFields: [],
                setAllFields: vi.fn(),
                mandatoryFields: null,
                setMandatoryFields: vi.fn(),
                actionCallbacks: {},
                onDeleteStart: vi.fn(),
                onDeleteEnd: vi.fn(),
              },
            },
            React.createElement(
              MemoryRouter,
              { initialEntries: ["/job-overview/J1"] },
              React.createElement(
                Routes,
                null,
                React.createElement(Route, {
                  path: "/job-overview/:jobId",
                  element: React.createElement(
                    Formik,
                    { initialValues: values, onSubmit: vi.fn() },
                    React.createElement(DocumentTabArea, { entityType, area: area as never }),
                  ),
                }),
              ),
            ),
          ),
        ),
      ),
    ),
  };
}

describe("DocumentTabArea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("scrollTo", vi.fn());
  });

  it("renders no-documents text when attachments empty", () => {
    renderArea({
      jobData: { job: { asset: { attachments: [] }, jobStatus: "DRAFT", isOnHold: false } },
    });

    expect(screen.getByText("NoDocumentsFound")).toBeInTheDocument();
    expect(screen.getByTestId("upload-field")).toBeInTheDocument();
    expect(screen.getByTestId("save-docs-action")).toBeInTheDocument();
  });

  it("renders document rows when attachments exist", () => {
    renderArea({
      jobData: {
        job: {
          asset: { attachments: [{ attachmentId: "A1", name: "n", type: "pdf" }] },
          jobStatus: "IN_PROGRESS",
          isOnHold: false,
        },
      },
    });

    expect(screen.getByTestId("doc-A1")).toBeInTheDocument();
  });

  it("saves uploaded documents through mutation", () => {
    const { setMessages } = renderArea({
      values: {
        uploadedDocs: [{ name: "Doc1", type: "pdf", attachmentId: "X1" }],
      },
      jobData: { job: { asset: { attachments: [] }, jobStatus: "DRAFT", isOnHold: false } },
    });

    fireEvent.click(screen.getByTestId("save-docs-action"));

    expect(mutateMock).toHaveBeenCalled();
    expect(setMessages).toHaveBeenCalled();
  });

  it("hides delete action for claim entity", () => {
    renderArea({
      entityType: "claim",
      jobData: {
        job: {
          asset: { attachments: [{ attachmentId: "A2", name: "n", type: "pdf" }] },
          jobStatus: "IN_PROGRESS",
          isOnHold: false,
        },
      },
    });

    expect(screen.getByTestId("doc-A2")).toHaveAttribute("data-hide-delete", "true");
  });
});
