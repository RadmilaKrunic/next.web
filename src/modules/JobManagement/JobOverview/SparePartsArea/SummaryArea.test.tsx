import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { useFormikContext } from "formik";
import { PERMISSIONS } from "utils/Permissions";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("formik", () => ({
  useFormikContext: vi.fn(),
}));

vi.mock("hooks/useHasPermission", () => ({
  useHasPermission: vi.fn(),
}));

vi.mock("hooks/useDiagnosticsManager", () => ({
  getChargeablePendingInfo: vi.fn(() => ({ hasChargeablePending: true })),
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

const renderedFields: Array<Record<string, unknown>> = [];

vi.mock("components/generics/Field/GenericField", () => ({
  default: ({ field }: { field: { name: string } }) => {
    renderedFields.push(field as Record<string, unknown>);
    return React.createElement("div", { "data-testid": `summary-field-${field.name}` }, field.name);
  },
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
import { useHasPermission } from "hooks/useHasPermission";

const useFormikContextMock = vi.mocked(useFormikContext);
const useHasPermissionMock = vi.mocked(useHasPermission);

const area = {
  name: "diagnosticsSummary",
  fields: [
    { name: "summaryType", type: "radiogroup", subtype: "diagnosticSummaryType", position: 1 },
    {
      name: "summaryGrossAmountBase",
      type: "price",
      subtype: "diagnosticSummaryGrossAmount",
      fieldMapping: { map: "grossAmount" },
      position: 2,
    },
    {
      name: "summaryGrossAmountNet",
      type: "price",
      subtype: "diagnosticSummaryGrossAmount",
      fieldMapping: { map: "grossAmount" },
      dependentFields: [{ fieldName: "discountBase", fieldValue: "NET_PRICE" }],
      position: 3,
    },
    { name: "summaryTotal", type: "price", subtype: "diagnosticSummaryTotalAmount", position: 4 },
    {
      name: "summaryDiscountHidden",
      type: "price",
      subtype: "diagnosticSummaryDiscountHidden",
      position: 5,
    },
    {
      name: "summaryDiscount",
      type: "price",
      subtype: "diagnosticSummaryDiscount",
      dependentFields: [{ fieldName: "discountBase", fieldValue: "GROSS_PRICE" }],
      position: 6,
    },
    {
      name: "summaryNetAmountMaterial",
      type: "price",
      subtype: "diagnosticSummaryNetAmountMaterial",
      position: 7,
    },
    {
      name: "summaryDiscountMaterial",
      type: "price",
      subtype: "diagnosticSummaryDiscountMaterial",
      position: 8,
    },
    {
      name: "summaryTotalAmountMaterial",
      type: "price",
      subtype: "diagnosticSummaryTotalAmountMaterial",
      position: 9,
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
  {
    name: "diagnosticData_diagnosticsSpareParts#0_position",
    subtype: "diagnosticPosition",
    fieldMapping: { nameStartsWith: "diagnosticsSpareParts", map: "position" },
  },
];

function renderSummary(values?: Record<string, unknown>) {
  const setFieldValue = vi.fn();
  const activeValueChangeFieldRef = { current: null };
  const mergedValues = {
    summaryType: "chargeable",
    discountBase: "GROSS_PRICE",
    summaryGrossAmountBase: 12,
    summaryGrossAmountNet: 0,
    summaryTotal: 11,
    summaryDiscountHidden: 1,
    summaryDiscount: 0,
    summaryNetAmountMaterial: 8,
    summaryDiscountMaterial: 0,
    summaryTotalAmountMaterial: 0,
    "diagnosticData_diagnosticsSpareParts#0_type": "CHARGEABLE",
    "diagnosticData_diagnosticsSpareParts#0_status": "OPEN",
    "diagnosticData_diagnosticsSpareParts#0_position": "SP",
    ...values,
  };

  useFormikContextMock.mockReturnValue({ values: mergedValues, setFieldValue } as never);

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
      React.createElement(SummaryArea, { area }),
    ),
  );

  return { setFieldValue, values: mergedValues, activeValueChangeFieldRef, ...view };
}

describe("SummaryArea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    renderedFields.length = 0;
    useHasPermissionMock.mockImplementation((permissions: string[]) => {
      if (
        permissions.includes(PERMISSIONS.DIAGNOSTICS.CAN_EDIT_TOTAL_DISCOUNT) ||
        permissions.includes(PERMISSIONS.DIAGNOSTICS.CAN_EDIT_TOTAL_AMOUNT) ||
        permissions.includes(PERMISSIONS.DIAGNOSTICS.CAN_VIEW_PRICES)
      ) {
        return true;
      }
      return false;
    });
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

  it("disables material fields from discountBase, status, and permission rules", () => {
    vi.mocked(useDiagnosticsContext).mockReturnValue({
      isDistributingRef: { current: false },
      hasPricesPopulated: true,
      setSummaryTypeOptions: vi.fn(),
      discountBase: "NET_PRICE",
      isValidating: false,
      jobStatus: "WAITING_FOR_APPROVAL",
    } as never);

    renderSummary();

    const netAmountField = renderedFields.find(
      (field) => field.name === "summaryNetAmountMaterial",
    );
    const discountField = renderedFields.find((field) => field.name === "summaryDiscountMaterial");
    const totalAmountField = renderedFields.find(
      (field) => field.name === "summaryTotalAmountMaterial",
    );

    expect(netAmountField).toMatchObject({ isDisabled: false });
    expect(discountField).toMatchObject({ isDisabled: false });
    expect(totalAmountField).toMatchObject({ isDisabled: true });
  });

  it("uses matching summary field name for current discountBase when mappings collide", () => {
    vi.mocked(useDiagnosticsContext).mockReturnValue({
      isDistributingRef: { current: false },
      hasPricesPopulated: true,
      setSummaryTypeOptions: vi.fn(),
      discountBase: "NET_PRICE",
      isValidating: false,
      jobStatus: "WAITING_FOR_APPROVAL",
    } as never);

    const { setFieldValue } = renderSummary();

    expect(setFieldValue).toHaveBeenCalledWith("summaryGrossAmountNet", 12);
    expect(setFieldValue).not.toHaveBeenCalledWith("summaryGrossAmountBase", 12);
  });
});
