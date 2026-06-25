import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { Formik } from "formik";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Icon: ({
    iconName,
    onClick,
    title,
  }: {
    iconName: string;
    onClick?: () => void;
    title?: string;
  }) =>
    React.createElement("button", { "data-testid": `icon-${iconName}`, onClick, title }, iconName),
  Divider: () => React.createElement("hr", { "data-testid": "divider" }),
}));

vi.mock("components/generics/Field/GenericField", () => ({
  default: ({ field }: { field: { name: string } }) =>
    React.createElement("div", { "data-testid": `field-${field.name}` }, field.name),
}));

vi.mock("hooks/useHasPermission", () => ({
  useHasPermission: vi.fn(() => true),
}));

vi.mock("../DiagnosticsContext", () => ({
  useDiagnosticsContext: vi.fn(() => ({ jobStatus: "IN_DIAGNOSTICS" })),
}));

import ArchivedSparePartsRow from "./ArchivedSparePartsRow";

const fields = [
  {
    name: "archivedSpareParts#0_position",
    label: "Position",
    type: "dropdown",
    fieldMapping: { originalName: "position" },
    position: 1,
  },
  {
    name: "archivedSpareParts#0_total",
    label: "Total",
    type: "price",
    fieldMapping: { originalName: "totalAmount" },
    position: 2,
  },
];

describe("ArchivedSparePartsRow", () => {
  it("renders main row and revert action", () => {
    render(
      React.createElement(
        Formik,
        { initialValues: { "archivedSpareParts#0_total": 10 }, onSubmit: vi.fn() },
        React.createElement(ArchivedSparePartsRow, {
          fields: fields as never,
          onRestoreRow: vi.fn(),
        }),
      ),
    );

    expect(screen.getByTestId("field-archivedSpareParts#0_position")).toBeInTheDocument();
    expect(screen.getByTitle("revert")).toBeInTheDocument();
  });

  it("toggles collapsed section when arrow clicked", () => {
    render(
      React.createElement(
        Formik,
        { initialValues: { "archivedSpareParts#0_total": 10 }, onSubmit: vi.fn() },
        React.createElement(ArchivedSparePartsRow, {
          fields: fields as never,
          onRestoreRow: vi.fn(),
        }),
      ),
    );

    fireEvent.click(screen.getByTestId("icon-down"));
    expect(screen.getByTestId("divider")).toBeInTheDocument();
  });

  it("calls onRestoreRow when revert clicked", () => {
    const onRestoreRow = vi.fn();
    render(
      React.createElement(
        Formik,
        { initialValues: { "archivedSpareParts#0_total": 10 }, onSubmit: vi.fn() },
        React.createElement(ArchivedSparePartsRow, { fields: fields as never, onRestoreRow }),
      ),
    );

    fireEvent.click(screen.getByTitle("revert"));
    expect(onRestoreRow).toHaveBeenCalled();
  });
});
