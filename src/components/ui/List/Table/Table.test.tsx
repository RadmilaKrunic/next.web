import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Table: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement("table", { className }, children),
  TableHead: ({ children }: { children: React.ReactNode }) =>
    React.createElement("thead", null, children),
  TableBody: ({ children }: { children: React.ReactNode }) =>
    React.createElement("tbody", null, children),
  TableRow: ({
    children,
    onClick,
    onKeyDown,
    tabIndex,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    tabIndex?: number;
    className?: string;
  }) => React.createElement("tr", { onClick, onKeyDown, tabIndex, className }, children),
  TableCell: ({
    children,
    header,
    colSpan,
    "data-testid": dtid,
    onClick,
  }: {
    children?: React.ReactNode;
    header?: boolean;
    colSpan?: number;
    "data-testid"?: string;
    onClick?: () => void;
  }) =>
    React.createElement(header ? "th" : "td", { colSpan, "data-testid": dtid, onClick }, children),
  Checkbox: ({
    id,
    onChange,
  }: {
    id: string;
    label?: string;
    checked?: boolean;
    onChange?: () => void;
    disabled?: boolean;
    onClick?: (e: React.MouseEvent) => void;
  }) => React.createElement("button", { id, "data-testid": id, onClick: () => onChange?.() }),
}));

import Table from "./Table";

interface TestRow {
  id: string;
  name: string;
}

const columns = [{ key: "name", label: "Name", render: (row: TestRow) => row.name }];

const data: TestRow[] = [
  { id: "1", name: "Tool A" },
  { id: "2", name: "Tool B" },
];

describe("Table", () => {
  it("renders column headers", () => {
    render(
      React.createElement(Table<TestRow>, {
        data,
        columns,
        visibleColumns: ["name"],
        getRowKey: (row) => row.id,
        renderRowActions: () => null,
      }),
    );
    expect(screen.getByTestId("header-name")).toBeInTheDocument();
  });

  it("renders data rows", () => {
    render(
      React.createElement(Table<TestRow>, {
        data,
        columns,
        visibleColumns: ["name"],
        getRowKey: (row) => row.id,
        renderRowActions: () => null,
      }),
    );
    expect(screen.getByText("Tool A")).toBeInTheDocument();
    expect(screen.getByText("Tool B")).toBeInTheDocument();
  });

  it("shows no results message when data is empty", () => {
    render(
      React.createElement(Table<TestRow>, {
        data: [],
        columns,
        visibleColumns: ["name"],
        getRowKey: (row) => row.id,
        renderRowActions: () => null,
      }),
    );
    expect(screen.getByText("noJobsFoundMessage")).toBeInTheDocument();
  });

  it("calls onRowClick when row cell clicked", () => {
    const onRowClick = vi.fn();
    render(
      React.createElement(Table<TestRow>, {
        data,
        columns,
        visibleColumns: ["name"],
        getRowKey: (row) => row.id,
        renderRowActions: () => null,
        onRowClick,
      }),
    );
    fireEvent.click(screen.getAllByTestId("body-name")[0], { bubbles: true });
    expect(onRowClick).toHaveBeenCalled();
  });

  it("calls onRowClick on Enter key", () => {
    const onRowClick = vi.fn();
    render(
      React.createElement(Table<TestRow>, {
        data,
        columns,
        visibleColumns: ["name"],
        getRowKey: (row) => row.id,
        renderRowActions: () => null,
        onRowClick,
      }),
    );
    fireEvent.keyDown(screen.getAllByRole("row")[1], { key: "Enter" });
    expect(onRowClick).toHaveBeenCalled();
  });

  it("renders selectable checkboxes when selectable=true", () => {
    render(
      React.createElement(Table<TestRow>, {
        data,
        columns,
        visibleColumns: ["name"],
        getRowKey: (row) => row.id,
        renderRowActions: () => null,
        selectable: true,
        selectedRows: [],
        onSelectionChange: vi.fn(),
      }),
    );
    expect(screen.getByTestId("select-all-checkbox")).toBeInTheDocument();
  });

  it("calls onSelectionChange when row checkbox changed", () => {
    const onSelectionChange = vi.fn();
    render(
      React.createElement(Table<TestRow>, {
        data,
        columns,
        visibleColumns: ["name"],
        getRowKey: (row) => row.id,
        renderRowActions: () => null,
        selectable: true,
        selectedRows: [],
        onSelectionChange,
      }),
    );
    const rowCheckbox = screen.getByTestId("row-checkbox-1");
    fireEvent.click(rowCheckbox);
    expect(onSelectionChange).toHaveBeenCalledWith(["1"]);
  });

  it("selects all when header checkbox clicked and none selected", () => {
    const onSelectionChange = vi.fn();
    render(
      React.createElement(Table<TestRow>, {
        data,
        columns,
        visibleColumns: ["name"],
        getRowKey: (row) => row.id,
        renderRowActions: () => null,
        selectable: true,
        selectedRows: [],
        onSelectionChange,
      }),
    );
    const selectAllCheckbox = screen.getByTestId("select-all-checkbox");
    fireEvent.click(selectAllCheckbox);
    expect(onSelectionChange).toHaveBeenCalledWith(["1", "2"]);
  });
});
