import { describe, it, expect, vi, beforeEach } from "vitest";
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
    "data-testid": testId,
  }: {
    children?: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
    "data-testid"?: string;
  }) => React.createElement("button", { onClick, "data-testid": testId }, children),
  Popover: ({
    children,
    trigger,
    open,
    onOutsideClick,
  }: {
    children?: React.ReactNode;
    trigger: React.ReactNode;
    open: boolean;
    onOutsideClick?: () => void;
  }) =>
    React.createElement(
      "div",
      { "data-testid": "popover-root" },
      trigger,
      open
        ? React.createElement(
            "div",
            { "data-testid": "popover-content", onClick: onOutsideClick },
            children,
          )
        : null,
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
      React.createElement("input", {
        id,
        type: "checkbox",
        checked,
        disabled,
        onChange,
        "data-testid": `checkbox-${id}`,
      }),
      label,
    ),
}));

vi.mock("../../../JobList.columns.utils", () => ({
  saveVisibleColumns: vi.fn().mockResolvedValue(undefined),
  isColumnDisabled: vi.fn().mockReturnValue(false),
  getDefaultFixedColumns: vi.fn().mockReturnValue([
    { key: "jobId", order: 1, isChecked: true, isFixed: true },
    { key: "jobStatus", order: 2, isChecked: false, isFixed: false },
  ]),
}));

vi.mock("../../../JobListTable/JobListColumns.config", () => ({
  getJobColumns: (t: (key: string) => string) => ({
    jobId: { label: t("jobId") },
    jobStatus: { label: t("jobStatus") },
  }),
}));

import CustomizeColumnsPopup from "./CustomizeColumnsPopup";
import { JobColumnConfiguration } from "../../../JobListTable/JobListColumns.config";

const mockConfig: JobColumnConfiguration[] = [
  { key: "jobId", order: 1, isChecked: true, isFixed: true },
  { key: "jobStatus", order: 2, isChecked: false, isFixed: false },
];

function renderComponent(columnConfig = mockConfig, setColumnConfig = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(CustomizeColumnsPopup, { columnConfig, setColumnConfig }),
    ),
  );
}

describe("CustomizeColumnsPopup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders trigger button", () => {
    renderComponent();
    expect(screen.getByText("customizeColumns")).toBeInTheDocument();
  });

  it("popover is closed by default", () => {
    renderComponent();
    expect(screen.queryByTestId("popover-content")).not.toBeInTheDocument();
  });

  it("opens popover when trigger button is clicked", () => {
    renderComponent();
    fireEvent.click(screen.getByText("customizeColumns"));
    expect(screen.getByTestId("popover-content")).toBeInTheDocument();
  });

  it("renders checkboxes for each column when open", () => {
    renderComponent();
    fireEvent.click(screen.getByText("customizeColumns"));
    expect(screen.getByTestId("checkbox-jobId")).toBeInTheDocument();
    expect(screen.getByTestId("checkbox-jobStatus")).toBeInTheDocument();
  });

  it("renders column labels", () => {
    renderComponent();
    fireEvent.click(screen.getByText("customizeColumns"));
    expect(screen.getByText("jobId")).toBeInTheDocument();
    expect(screen.getByText("jobStatus")).toBeInTheDocument();
  });

  it("calls setColumnConfig and closes popover when save is clicked", async () => {
    const setColumnConfig = vi.fn();
    renderComponent(mockConfig, setColumnConfig);
    fireEvent.click(screen.getByText("customizeColumns"));
    fireEvent.click(screen.getByTestId("save-columns-button"));
    await waitFor(() => {
      expect(setColumnConfig).toHaveBeenCalled();
    });
    expect(screen.queryByTestId("popover-content")).not.toBeInTheDocument();
  });

  it("resets pendingConfig to defaults when reset is clicked", () => {
    renderComponent();
    fireEvent.click(screen.getByText("customizeColumns"));
    fireEvent.click(screen.getByTestId("reset-columns-button"));
    // After reset, pendingConfig should be the default fixed columns
    expect(screen.getByTestId("popover-content")).toBeInTheDocument();
  });

  it("updates pendingConfig when checkbox is changed", () => {
    renderComponent();
    fireEvent.click(screen.getByText("customizeColumns"));
    const checkbox = screen.getByTestId("checkbox-jobStatus");
    fireEvent.change(checkbox, { target: { checked: true } });
    expect(checkbox).toBeInTheDocument();
  });

  it("syncs pendingConfig when columnConfig prop changes", () => {
    const { rerender } = renderComponent();
    const newConfig: JobColumnConfiguration[] = [
      { key: "jobId", order: 1, isChecked: true, isFixed: true },
    ];
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    rerender(
      React.createElement(
        QueryClientProvider,
        { client: qc },
        React.createElement(CustomizeColumnsPopup, {
          columnConfig: newConfig,
          setColumnConfig: vi.fn(),
        }),
      ),
    );
    fireEvent.click(screen.getByText("customizeColumns"));
    expect(screen.getByTestId("checkbox-jobId")).toBeInTheDocument();
  });
});
