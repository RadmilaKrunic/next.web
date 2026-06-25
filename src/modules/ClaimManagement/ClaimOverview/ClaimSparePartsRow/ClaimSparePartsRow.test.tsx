import { describe, it, expect, vi, beforeEach } from "vitest";
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
    "data-testid": testId,
  }: {
    iconName: string;
    onClick?: () => void;
    title?: string;
    "data-testid"?: string;
  }) =>
    React.createElement(
      "button",
      { "data-testid": testId ?? `icon-${iconName}`, onClick, title },
      iconName,
    ),
}));

vi.mock("hooks/useHasPermission", () => ({
  useHasPermission: vi.fn(() => true),
}));

vi.mock("../ClaimContext", () => ({
  useClaimContext: vi.fn(() => ({
    arePricesValidated: true,
    markRowDirty: vi.fn(),
    allowedPositions: [],
    positionDropdownOptions: [],
    isResyncingRef: { current: false },
    discountBase: "GROSS_PRICE",
    canDeleteRows: true,
    materials: [{ isNew: true }],
  })),
}));

vi.mock("components/generics/Form/GenericForm.context", () => ({
  GenericFormContext: React.createContext({
    allFields: [],
    activeValueChangeFieldRef: { current: null },
  }),
}));

vi.mock("modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.shared", () => ({
  resolveDiscountFieldNames: vi.fn(() => ({
    discountHiddenFieldName: "discountHidden",
    discountAmountHiddenFieldName: "discountAmountHidden",
    activeDiscountFieldName: "discount",
    discountSiblingFieldName: "total",
  })),
  useSparePartsRowCommon: vi.fn(() => "non-price-key"),
}));

vi.mock("modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.components", () => ({
  SparePartsMainFields: ({ mainFields }: { mainFields: Array<{ name: string }> }) =>
    React.createElement("div", { "data-testid": "main-fields" }, String(mainFields.length)),
  SparePartsCollapsedSection: ({ isRowCollapsed }: { isRowCollapsed: boolean }) =>
    React.createElement("div", { "data-testid": "collapsed-section" }, String(isRowCollapsed)),
}));

import ClaimSparePartsRow from "./ClaimSparePartsRow";

const fields = [
  {
    name: "claims_claimSpareParts#0_position",
    label: "Position",
    type: "dropdown",
    subtype: "diagnosticPosition",
    fieldMapping: { originalName: "position", nameStartsWith: "claims_claimSpareParts#0_" },
  },
  {
    name: "claims_claimSpareParts#0_unitPrice",
    label: "Unit Price",
    type: "price",
    subtype: "diagnosticUnitPrice",
    fieldMapping: { originalName: "unitPrice", nameStartsWith: "claims_claimSpareParts#0_" },
  },
];

function renderRow(onDeleteRow = vi.fn()) {
  return render(
    React.createElement(
      Formik,
      {
        initialValues: {
          claims_claimSpareParts_0_unitPrice: 10,
          claims_claimSpareParts_0_position: "SP",
        },
        onSubmit: vi.fn(),
      },
      React.createElement(ClaimSparePartsRow, { fields: fields as never, onDeleteRow }),
    ),
  );
}

describe("ClaimSparePartsRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders row with main and collapsed sections", () => {
    renderRow();

    expect(screen.getByTestId("main-fields")).toBeInTheDocument();
    expect(screen.getByTestId("collapsed-section")).toBeInTheDocument();
  });

  it("toggles collapse when arrow is clicked", () => {
    renderRow();

    fireEvent.click(screen.getByTestId("arrowUp"));

    expect(screen.getByTestId("collapsed-section")).toBeInTheDocument();
  });

  it("calls onDeleteRow when delete icon clicked", () => {
    const onDeleteRow = vi.fn();
    renderRow(onDeleteRow);

    fireEvent.click(screen.getByTitle("delete"));

    expect(onDeleteRow).toHaveBeenCalled();
  });
});
