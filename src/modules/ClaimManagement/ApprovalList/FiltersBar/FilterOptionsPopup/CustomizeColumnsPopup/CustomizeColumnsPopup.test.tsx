import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Button: ({
    children,
    onClick,
    label,
    "data-testid": testId,
  }: {
    children?: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
    label?: string;
    "data-testid"?: string;
  }) => React.createElement("button", { onClick, "data-testid": testId }, label ?? children),
  Popover: ({
    trigger,
    children,
    open,
  }: {
    trigger: React.ReactNode;
    children: React.ReactNode;
    open: boolean;
  }) =>
    React.createElement(
      "div",
      null,
      trigger,
      open ? React.createElement("div", { "data-testid": "popover" }, children) : null,
    ),
  Checkbox: ({
    id,
    label,
    checked,
    disabled,
    onChange,
  }: {
    id: string;
    label: string;
    checked?: boolean;
    disabled?: boolean;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) =>
    React.createElement(
      "label",
      { htmlFor: id },
      React.createElement("input", { id, type: "checkbox", checked, disabled, onChange }),
      label,
    ),
}));

vi.mock("../../../ApprovalList.columns.utils", () => ({
  saveVisibleColumns: vi.fn().mockResolvedValue(undefined),
  isColumnDisabled: vi.fn(() => false),
  getDefaultFixedColumns: vi.fn(() => [
    { key: "approvalStatus", order: 1, isChecked: true },
    { key: "jobId", order: 2, isChecked: false },
  ]),
}));

vi.mock("../../../ApprovalListTable/ApprovalListColumns.config", () => ({
  getApprovalColumns: (t: (key: string) => string) => ({
    approvalStatus: { label: t("approvalStatus") },
    jobId: { label: t("jobId") },
  }),
}));

import CustomizeColumnsPopup from "./CustomizeColumnsPopup";

const config = [
  { key: "approvalStatus", order: 1, isChecked: true },
  { key: "jobId", order: 2, isChecked: false },
] as never;

function renderPopup(setColumnConfig = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    setColumnConfig,
    ...render(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(CustomizeColumnsPopup, {
          columnConfig: config,
          setColumnConfig,
        }),
      ),
    ),
  };
}

describe("Approval CustomizeColumnsPopup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens popup and renders column checkboxes", () => {
    renderPopup();
    fireEvent.click(screen.getByText("customizeColumns"));
    expect(screen.getByTestId("popover")).toBeInTheDocument();
    expect(screen.getByLabelText("approvalStatus")).toBeInTheDocument();
  });

  it("saves selected columns", async () => {
    const { setColumnConfig } = renderPopup();
    fireEvent.click(screen.getByText("customizeColumns"));
    fireEvent.click(screen.getByTestId("save-columns-button"));

    await waitFor(() => expect(setColumnConfig).toHaveBeenCalled());
  });

  it("resets pending columns", () => {
    renderPopup();
    fireEvent.click(screen.getByText("customizeColumns"));
    fireEvent.click(screen.getByTestId("reset-columns-button"));
    expect(screen.getByLabelText("approvalStatus")).toBeInTheDocument();
  });
});
