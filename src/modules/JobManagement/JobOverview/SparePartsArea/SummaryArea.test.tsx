import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { Formik } from "formik";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("hooks/useHasPermission", () => ({
  useHasPermission: vi.fn((permissions: string[]) => permissions.length > 0),
}));

vi.mock("utils/priceCalculator", () => ({
  aggregateRowPrices: vi.fn(() => ({
    suggestedNetPrice: 10,
    netAmount: 8,
    grossAmount: 12,
    totalAmount: 11,
    discount: 1,
    taxAmount: 2,
    discountAmount: 1,
  })),
  DISTRIBUTABLE_POSITIONS: new Set(["SP", "PN", "AC"]),
  SUMMARY_TYPE_FILTER: { totalSummary: () => true, chargeable: () => true },
}));

vi.mock("components/generics/Field/GenericField", () => ({
  default: ({ field }: { field: { name: string } }) =>
    React.createElement("div", { "data-testid": `summary-field-${field.name}` }, field.name),
}));

vi.mock("../DiagnosticsContext", () => ({
  useDiagnosticsContext: vi.fn(() => ({
    isDistributingRef: { current: false },
    hasPricesPopulated: true,
    setSummaryTypeOptions: vi.fn(),
    discountBase: "GROSS_PRICE",
  })),
}));

import SummaryArea from "./SummaryArea";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import { useDiagnosticsContext } from "../DiagnosticsContext";

const area = {
  name: "diagnosticsSummary",
  fields: [
    { name: "summaryType", type: "radiogroup", subtype: "diagnosticSummaryType", position: 1 },
    { name: "summaryTotal", type: "price", subtype: "diagnosticSummaryTotalAmount", position: 2 },
    {
      name: "summaryDiscountHidden",
      type: "price",
      subtype: "diagnosticSummaryDiscountHidden",
      position: 3,
    },
    {
      name: "summaryDiscount",
      type: "price",
      subtype: "diagnosticSummaryDiscount",
      dependentFields: [{ fieldName: "discountBase", fieldValue: "GROSS_PRICE" }],
      position: 4,
    },
  ],
} as never;

const allFields = [
  {
    name: "diagnosticData_diagnosticsSpareParts#0_type",
    subtype: "diagnosticType",
    options: [{ value: "CHARGEABLE", name: "Chargeable" }],
    fieldMapping: { nameStartsWith: "diagnosticsSpareParts", map: "type" },
  },
  {
    name: "diagnosticData_diagnosticsSpareParts#0_status",
    subtype: "diagnosticMaterialStatus",
    fieldMapping: { nameStartsWith: "diagnosticsSpareParts", map: "status" },
  },
];

function renderSummary(values?: Record<string, unknown>) {
  const setFieldValue = vi.fn();
  const activeValueChangeFieldRef = { current: null };

  const view = render(
    React.createElement(
      GenericFormContext.Provider,
      {
        value: {
          allFields: allFields as never,
          setAllFields: vi.fn(),
          mandatoryFields: null,
          setMandatoryFields: vi.fn(),
          actionCallbacks: {},
          activeValueChangeFieldRef,
        },
      },
      React.createElement(
        Formik,
        {
          initialValues: {
            summaryType: "totalSummary",
            discountBase: "GROSS_PRICE",
            ...values,
          },
          onSubmit: vi.fn(),
        },
        React.createElement(SummaryArea, { area }),
      ),
    ),
  );

  return { setFieldValue, ...view };
}

describe("SummaryArea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders summary fields", () => {
    renderSummary();
    expect(screen.getByTestId("summary-field-summaryType")).toBeInTheDocument();
    expect(screen.getByTestId("summary-field-summaryTotal")).toBeInTheDocument();
  });

  it("returns null when price permission gate is active and prices not populated", () => {
    vi.mocked(useDiagnosticsContext).mockReturnValue({
      isDistributingRef: { current: false },
      hasPricesPopulated: false,
      setSummaryTypeOptions: vi.fn(),
      discountBase: "GROSS_PRICE",
    } as never);

    renderSummary();
    expect(screen.queryByTestId("summary-field-summaryType")).not.toBeInTheDocument();
  });
});
