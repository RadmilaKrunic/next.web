import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MessagesContext, MessagesContextType } from "../../../contexts/messagescontext";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Button: ({ children, ...props }: { children: React.ReactNode; [k: string]: unknown }) =>
    React.createElement("button", props, children),
  ActivityIndicator: () => React.createElement("span", null, "loading"),
  Notification: ({
    children,
    onCloseClick,
  }: {
    children: React.ReactNode;
    onCloseClick: () => void;
  }) =>
    React.createElement(
      "div",
      { role: "alert" },
      children,
      React.createElement("button", { onClick: onCloseClick }, "close"),
    ),
}));

vi.mock("../../../hooks/useBreadcrumbs", () => ({ useBreadcrumbs: vi.fn() }));

vi.mock("../../../components/ui/DatePicker/DatePicker", () => ({
  default: ({ name, label }: { name: string; label: string }) =>
    React.createElement("input", { "data-testid": `datepicker-${name}`, placeholder: label }),
}));

vi.mock("../../../api/axios-client/axiosClient", () => ({
  default: { post: vi.fn() },
}));

import BiqicReport from "./BiqicReport";

function renderBiqicReport() {
  const qc = new QueryClient();
  const messagesCtx: MessagesContextType = { messages: [], setMessages: vi.fn() };
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(
        MessagesContext.Provider,
        { value: messagesCtx },
        React.createElement(BiqicReport),
      ),
    ),
  );
}

describe("BiqicReport", () => {
  it("renders the report form", () => {
    renderBiqicReport();
    expect(screen.getByTestId("datepicker-fromDate")).toBeInTheDocument();
    expect(screen.getByTestId("datepicker-toDate")).toBeInTheDocument();
  });

  it("renders the section title", () => {
    renderBiqicReport();
    expect(screen.getByText("biqicReportTitle")).toBeInTheDocument();
  });

  it("renders the submit button", () => {
    renderBiqicReport();
    expect(screen.getByRole("button", { name: "biqicButtonLabel" })).toBeInTheDocument();
  });

  it("does not show error notification initially", () => {
    renderBiqicReport();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
