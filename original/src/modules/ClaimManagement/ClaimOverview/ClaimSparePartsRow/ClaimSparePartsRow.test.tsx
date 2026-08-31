import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { Formik, useFormikContext } from "formik";
import { useHasPermission } from "hooks/useHasPermission";
import { useClaimContext } from "../ClaimContext";
import { useSparePartsRowCommon } from "modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.shared";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";

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
    automaticRows: [],
    materials: [{ isNew: true }],
    isClaimPending: false,
  })),
}));

vi.mock("components/generics/Form/GenericForm.context", () => ({
  GenericFormContext: React.createContext<any>({
    allFields: [],
    sparePartNotBelongsToTool: { current: {} },
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

// Captured from the (mocked) SparePartsMainFields so we can exercise the
// internal `applyFieldPermissions` callback and inspect the fully-computed
// `positionFieldsWithDisabledOptions` without needing to render real fields.
let capturedApplyFieldPermissions: ((field: any) => any) | undefined;
let capturedPositionFields: any[] = [];

vi.mock("modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.components", () => ({
  SparePartsMainFields: ({
    mainFields,
    positionFieldsWithDisabledOptions,
    applyFieldPermissions,
  }: any) => {
    capturedApplyFieldPermissions = applyFieldPermissions;
    capturedPositionFields = positionFieldsWithDisabledOptions;
    return React.createElement("div", { "data-testid": "main-fields" }, String(mainFields.length));
  },
  SparePartsCollapsedSection: ({ isRowCollapsed }: { isRowCollapsed: boolean }) =>
    React.createElement("div", { "data-testid": "collapsed-section" }, String(isRowCollapsed)),
}));

import ClaimSparePartsRow from "./ClaimSparePartsRow";

const mockUseHasPermission = vi.mocked(useHasPermission);
const mockUseClaimContext = vi.mocked(useClaimContext);
const mockUseSparePartsRowCommon = vi.mocked(useSparePartsRowCommon);

const baseClaimContext = {
  arePricesValidated: true,
  markRowDirty: vi.fn(),
  allowedPositions: [] as Array<{ position: string; maxCount: number }>,
  positionDropdownOptions: [] as Array<{ value: string; name: string }>,
  isResyncingRef: { current: false },
  discountBase: "GROSS_PRICE",
  canDeleteRows: true,
  automaticRows: [] as string[],
  materials: [{ isNew: true }],
  isClaimPending: false,
};

// Using the same "#0_" prefix for both the field name and the Formik value
// key so that positionValue/partNumberValue resolve correctly (the previous
// test suite had a mismatch here: field names used "#0_" while the Formik
// initialValues used "_0_", so positionValue always resolved to "").
const NAME_PREFIX = "claims_claimSpareParts#0_";
const positionFieldName = `${NAME_PREFIX}position`;
const unitPriceFieldName = `${NAME_PREFIX}unitPrice`;
const partNumberFieldName = `${NAME_PREFIX}partNumber`;
const typeFieldName = `${NAME_PREFIX}type`;

const positionField = {
  name: positionFieldName,
  label: "Position",
  type: "dropdown",
  subtype: "diagnosticPosition",
  fieldMapping: { originalName: "position", nameStartsWith: NAME_PREFIX },
};

const unitPriceField = {
  name: unitPriceFieldName,
  label: "Unit Price",
  type: "price",
  subtype: "diagnosticUnitPrice",
  fieldMapping: { originalName: "unitPrice", nameStartsWith: NAME_PREFIX },
};

const partNumberField = {
  name: partNumberFieldName,
  label: "Part Number",
  type: "text",
  subtype: "diagnosticPartNumber",
  fieldMapping: { originalName: "partNumber", nameStartsWith: NAME_PREFIX },
};

const typeField = {
  name: typeFieldName,
  label: "Type",
  type: "dropdown",
  subtype: "diagnosticType",
  options: [
    { value: "WARRANTY", name: "Warranty" },
    { value: "REPAIR", name: "Repair" },
    { value: "SERVICE_OFFERING", name: "Service Offering" },
  ],
  fieldMapping: { originalName: "type", nameStartsWith: NAME_PREFIX },
};

const fields = [positionField, unitPriceField, partNumberField, typeField];

const defaultFormContextValue = { allFields: [], sparePartNotBelongsToTool: { current: {} } };

function buildElement({
  onDeleteRow = vi.fn(),
  props = {},
  initialValues = {},
  formContextValue = defaultFormContextValue,
  customFields = fields,
}: {
  onDeleteRow?: () => void;
  props?: Partial<{ isDisabled: boolean }>;
  initialValues?: Record<string, unknown>;

  formContextValue?: any;
  customFields?: typeof fields;
} = {}) {
  return React.createElement(
    Formik,
    { initialValues, onSubmit: vi.fn() },
    React.createElement(
      GenericFormContext.Provider,
      { value: formContextValue },
      React.createElement(ClaimSparePartsRow, {
        fields: customFields as never,
        onDeleteRow,
        ...props,
      }),
    ),
  );
}

function renderRow(options: Parameters<typeof buildElement>[0] = {}) {
  return render(buildElement(options));
}

describe("ClaimSparePartsRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseHasPermission.mockReturnValue(true);
    mockUseClaimContext.mockReturnValue(baseClaimContext as never);
    mockUseSparePartsRowCommon.mockReturnValue("non-price-key");
    capturedApplyFieldPermissions = undefined;
    capturedPositionFields = [];
  });

  describe("basic rendering", () => {
    it("renders row with main and collapsed sections", () => {
      renderRow({ initialValues: { [unitPriceFieldName]: 10 } });

      expect(screen.getByTestId("main-fields")).toHaveTextContent("3"); // position, partNumber, type
      expect(screen.getByTestId("collapsed-section")).toBeInTheDocument();
    });

    it("toggles collapse when arrow is clicked and prices are expandable", () => {
      renderRow({ initialValues: { [unitPriceFieldName]: 10 } });

      expect(screen.getByTestId("collapsed-section")).toHaveTextContent("true");
      fireEvent.click(screen.getByTestId(`${NAME_PREFIX}arrowUp`));
      expect(screen.getByTestId("collapsed-section")).toHaveTextContent("false");
    });

    it("does not toggle collapse when there are no expandable (populated) prices", () => {
      renderRow({ initialValues: {} });

      fireEvent.click(screen.getByTestId("arrowUp"));
      expect(screen.getByTestId("collapsed-section")).toHaveTextContent("true");
    });

    it("calls onDeleteRow when delete icon clicked", () => {
      const onDeleteRow = vi.fn();
      renderRow({ onDeleteRow });

      fireEvent.click(screen.getByTitle("delete"));

      expect(onDeleteRow).toHaveBeenCalled();
    });

    it("does not render the collapse arrow when user lacks price view permission", () => {
      mockUseHasPermission.mockReturnValue(false);
      renderRow();

      expect(screen.queryByTestId("arrowUp")).not.toBeInTheDocument();
      expect(screen.queryByTestId("arrowDown")).not.toBeInTheDocument();
    });

    it("does not render the delete icon when canDeleteRows is false", () => {
      mockUseClaimContext.mockReturnValue({ ...baseClaimContext, canDeleteRows: false } as never);
      renderRow();

      expect(screen.queryByTitle("delete")).not.toBeInTheDocument();
    });

    it("does not render the delete icon for automatic rows", () => {
      mockUseClaimContext.mockReturnValue({ ...baseClaimContext, automaticRows: ["SP"] } as never);
      renderRow({ initialValues: { [positionFieldName]: "SP" } });

      expect(screen.queryByTitle("delete")).not.toBeInTheDocument();
    });

    it("renders the delete icon when the row's position is not in automaticRows", () => {
      mockUseClaimContext.mockReturnValue({ ...baseClaimContext, automaticRows: ["LB"] } as never);
      renderRow({ initialValues: { [positionFieldName]: "SP" } });

      expect(screen.getByTitle("delete")).toBeInTheDocument();
    });

    it("renders with all fields disabled when isDisabled prop is true", () => {
      renderRow({ props: { isDisabled: true } });
      expect(screen.getByTestId("main-fields")).toBeInTheDocument();
    });

    it("renders with all fields disabled when claim status is pending", () => {
      mockUseClaimContext.mockReturnValue({
        ...baseClaimContext,
        isClaimPending: true,
      } as never);

      renderRow();

      expect(screen.getByTestId("main-fields")).toBeInTheDocument();
    });

    it("renders when the row's spare part is not a new row", () => {
      mockUseClaimContext.mockReturnValue({
        ...baseClaimContext,
        materials: [{ isNew: false }],
      } as never);
      renderRow();

      expect(screen.getByTestId("main-fields")).toBeInTheDocument();
    });
  });

  describe("applyFieldPermissions", () => {
    it("disables every field when the isDisabled prop is true", () => {
      renderRow({ props: { isDisabled: true } });

      expect(capturedApplyFieldPermissions!(typeField).isDisabled).toBe(true);
      expect(capturedApplyFieldPermissions!(partNumberField).isDisabled).toBe(true);
    });

    it("disables every field when claim status is pending", () => {
      mockUseClaimContext.mockReturnValue({
        ...baseClaimContext,
        isClaimPending: true,
      } as never);
      renderRow();

      expect(capturedApplyFieldPermissions!(typeField).isDisabled).toBe(true);
      expect(capturedApplyFieldPermissions!(partNumberField).isDisabled).toBe(true);
      expect(capturedApplyFieldPermissions!(unitPriceField).isDisabled).toBe(true);
    });

    it("keeps the diagnosticType field enabled even for an existing (non-new) row", () => {
      mockUseClaimContext.mockReturnValue({
        ...baseClaimContext,
        materials: [{ isNew: false }],
      } as never);
      renderRow();

      expect(capturedApplyFieldPermissions!(typeField).isDisabled).toBe(false);
    });

    it("disables price fields but enables other fields for a new row", () => {
      mockUseClaimContext.mockReturnValue({
        ...baseClaimContext,
        materials: [{ isNew: true }],
      } as never);
      renderRow();

      expect(capturedApplyFieldPermissions!(unitPriceField).isDisabled).toBe(true);
      expect(capturedApplyFieldPermissions!(partNumberField).isDisabled).toBe(false);
    });

    it("disables all non-type fields for an existing (non-new) row", () => {
      mockUseClaimContext.mockReturnValue({
        ...baseClaimContext,
        materials: [{ isNew: false }],
      } as never);
      renderRow();

      expect(capturedApplyFieldPermissions!(partNumberField).isDisabled).toBe(true);
      expect(capturedApplyFieldPermissions!(unitPriceField).isDisabled).toBe(true);
    });

    it("parses the area index from the field name prefix to look up the correct material", () => {
      const prefix = "claims_claimSpareParts#2_";
      const customFields = [
        {
          ...positionField,
          name: `${prefix}position`,
          fieldMapping: { originalName: "position", nameStartsWith: prefix },
        },
        {
          ...partNumberField,
          name: `${prefix}partNumber`,
          fieldMapping: { originalName: "partNumber", nameStartsWith: prefix },
        },
      ];
      mockUseClaimContext.mockReturnValue({
        ...baseClaimContext,
        materials: [{ isNew: false }, { isNew: false }, { isNew: true }],
      } as never);
      renderRow({ customFields });

      // materials[2].isNew is true, so a non-price field should be enabled
      expect(capturedApplyFieldPermissions!(customFields[1]).isDisabled).toBe(false);
    });
  });

  describe("position options disabling", () => {
    it("falls back to positionDropdownOptions from context when the field defines no options", () => {
      mockUseClaimContext.mockReturnValue({
        ...baseClaimContext,
        positionDropdownOptions: [{ value: "SP", name: "Spare Part" }],
      } as never);
      renderRow();

      const posField = capturedPositionFields.find((f) => f.subtype === "diagnosticPosition");
      expect(posField.options).toContainEqual(
        expect.objectContaining({ value: "SP", name: "Spare Part" }),
      );
    });

    it("prefers the field's own options over the context's positionDropdownOptions", () => {
      const customFields = [
        { ...positionField, options: [{ value: "SP", name: "Own Spare Part" }] },
        unitPriceField,
      ];
      mockUseClaimContext.mockReturnValue({
        ...baseClaimContext,
        positionDropdownOptions: [{ value: "SP", name: "Context Spare Part" }],
      } as never);
      renderRow({ customFields });

      const posField = capturedPositionFields.find((f) => f.subtype === "diagnosticPosition");
      expect(posField.options).toContainEqual(
        expect.objectContaining({ value: "SP", name: "Own Spare Part" }),
      );
    });

    it("prepends a disabled 'Select' placeholder to the position options", () => {
      mockUseClaimContext.mockReturnValue({
        ...baseClaimContext,
        positionDropdownOptions: [{ value: "SP", name: "Spare Part" }],
      } as never);
      renderRow();

      const posField = capturedPositionFields.find((f) => f.subtype === "diagnosticPosition");
      expect(posField.options[0]).toMatchObject({
        value: "",
        name: "SelectAnOption",
        disabled: true,
      });
    });

    it("leaves the position field untouched when no options are available anywhere", () => {
      renderRow();

      const posField = capturedPositionFields.find((f) => f.subtype === "diagnosticPosition");
      expect(posField.options).toBeUndefined();
    });

    it("disables a position option once it has reached its configured max usage elsewhere on the form", () => {
      mockUseClaimContext.mockReturnValue({
        ...baseClaimContext,
        allowedPositions: [{ position: "SP", maxCount: 1 }],
        positionDropdownOptions: [{ value: "SP", name: "Spare Part" }],
      } as never);
      renderRow({
        formContextValue: {
          allFields: [{ name: "claims_claimSpareParts#1_position", subtype: "diagnosticPosition" }],
          sparePartNotBelongsToTool: { current: {} },
        },
        initialValues: { "claims_claimSpareParts#1_position": "SP" },
      });

      const posField = capturedPositionFields.find((f) => f.subtype === "diagnosticPosition");
      const spOption = posField.options.find((o: { value: string }) => o.value === "SP");
      expect(spOption.disabled).toBe(true);
    });

    it("leaves a position option enabled when it has no maxCount configuration", () => {
      mockUseClaimContext.mockReturnValue({
        ...baseClaimContext,
        allowedPositions: [],
        positionDropdownOptions: [{ value: "SP", name: "Spare Part" }],
      } as never);
      renderRow();

      const posField = capturedPositionFields.find((f) => f.subtype === "diagnosticPosition");
      const spOption = posField.options.find((o: { value: string }) => o.value === "SP");
      expect(spOption.disabled).toBeFalsy();
    });
  });

  describe("restricted spare-part type options", () => {
    it("disables WARRANTY and SERVICE_OFFERING when position is 'SP' and no part number is set", () => {
      renderRow({ initialValues: { [positionFieldName]: "SP", [partNumberFieldName]: "" } });

      const typeF = capturedPositionFields.find((f) => f.subtype === "diagnosticType");
      const warranty = typeF.options.find((o: { value: string }) => o.value === "WARRANTY");
      const serviceOffering = typeF.options.find(
        (o: { value: string }) => o.value === "SERVICE_OFFERING",
      );
      const repair = typeF.options.find((o: { value: string }) => o.value === "REPAIR");

      expect(warranty.disabled).toBe(true);
      expect(serviceOffering.disabled).toBe(true);
      expect(repair.disabled).toBeFalsy();
    });

    it("leaves type options enabled when the part number is filled and belongs to the tool", () => {
      renderRow({
        initialValues: { [positionFieldName]: "SP", [partNumberFieldName]: "12345" },
        formContextValue: {
          allFields: [],
          sparePartNotBelongsToTool: { current: { [partNumberFieldName]: false } },
        },
      });

      const typeF = capturedPositionFields.find((f) => f.subtype === "diagnosticType");
      const warranty = typeF.options.find((o: { value: string }) => o.value === "WARRANTY");
      expect(warranty.disabled).toBeFalsy();
    });

    it("disables restricted type options when the part is marked as not belonging to the tool", () => {
      renderRow({
        initialValues: { [positionFieldName]: "SP", [partNumberFieldName]: "12345" },
        formContextValue: {
          allFields: [],
          sparePartNotBelongsToTool: { current: { [partNumberFieldName]: true } },
        },
      });

      const typeF = capturedPositionFields.find((f) => f.subtype === "diagnosticType");
      const warranty = typeF.options.find((o: { value: string }) => o.value === "WARRANTY");
      expect(warranty.disabled).toBe(true);
    });

    it("does not restrict type options when position is not 'SP'", () => {
      renderRow({ initialValues: { [positionFieldName]: "LB", [partNumberFieldName]: "" } });

      const typeF = capturedPositionFields.find((f) => f.subtype === "diagnosticType");
      const warranty = typeF.options.find((o: { value: string }) => o.value === "WARRANTY");
      expect(warranty.disabled).toBeFalsy();
    });
  });

  describe("position autofill", () => {
    const descriptionFieldName = `${NAME_PREFIX}description`;
    const descriptionField = {
      name: descriptionFieldName,
      label: "Description",
      type: "text",
      subtype: "diagnosticDescription",
      fieldMapping: { originalName: "description", nameStartsWith: NAME_PREFIX },
    };
    const autofillFields = [positionField, partNumberField, descriptionField];

    function ValuesProbe() {
      const { values } = useFormikContext<Record<string, unknown>>();
      return React.createElement(
        "div",
        { "data-testid": "values-probe" },
        `${values[partNumberFieldName] ?? ""}|${values[descriptionFieldName] ?? ""}`,
      );
    }

    function PositionSetter({ value }: { value: string }) {
      const { setFieldValue } = useFormikContext<Record<string, unknown>>();
      return React.createElement(
        "button",
        { "data-testid": "set-position", onClick: () => setFieldValue(positionFieldName, value) },
        "set",
      );
    }

    function renderAutofillRow(initialValues: Record<string, unknown>, positionToSet: string) {
      return render(
        React.createElement(
          Formik,
          { initialValues, onSubmit: vi.fn() },
          React.createElement(
            GenericFormContext.Provider,
            { value: defaultFormContextValue as never },
            React.createElement(PositionSetter, { value: positionToSet }),
            React.createElement(ClaimSparePartsRow, { fields: autofillFields as never }),
            React.createElement(ValuesProbe),
          ),
        ),
      );
    }

    it("autofills part number and description when position changes to 'FR'", async () => {
      renderAutofillRow({ [positionFieldName]: "" }, "FR");

      fireEvent.click(screen.getByTestId("set-position"));

      expect(await screen.findByTestId("values-probe")).toHaveTextContent("1609888888|freightCost");
    });

    it("autofills part number and description when position changes to 'LA'", async () => {
      renderAutofillRow({ [positionFieldName]: "" }, "LA");

      fireEvent.click(screen.getByTestId("set-position"));

      expect(await screen.findByTestId("values-probe")).toHaveTextContent("1609888887|labourCost");
    });

    it("does not autofill for a position without hardcoded autofill data", async () => {
      renderAutofillRow({ [positionFieldName]: "" }, "SP");

      fireEvent.click(screen.getByTestId("set-position"));

      expect(await screen.findByTestId("values-probe")).toHaveTextContent("|");
    });

    it("does not autofill on initial mount even if position is already set", () => {
      render(
        React.createElement(
          Formik,
          { initialValues: { [positionFieldName]: "FR" }, onSubmit: vi.fn() },
          React.createElement(
            GenericFormContext.Provider,
            { value: defaultFormContextValue as never },
            React.createElement(ClaimSparePartsRow, { fields: autofillFields as never }),
            React.createElement(ValuesProbe),
          ),
        ),
      );

      expect(screen.getByTestId("values-probe")).toHaveTextContent("|");
    });
  });

  describe("markRowDirty effect", () => {
    it("does not call markRowDirty on the initial render", () => {
      const markRowDirty = vi.fn();
      mockUseClaimContext.mockReturnValue({ ...baseClaimContext, markRowDirty } as never);

      renderRow();

      expect(markRowDirty).not.toHaveBeenCalled();
    });

    it("calls markRowDirty when the row's non-price input key changes after mount", () => {
      const markRowDirty = vi.fn();
      mockUseClaimContext.mockReturnValue({ ...baseClaimContext, markRowDirty } as never);
      mockUseSparePartsRowCommon.mockReturnValue("key-1");

      const { rerender } = render(buildElement());
      expect(markRowDirty).not.toHaveBeenCalled();

      mockUseSparePartsRowCommon.mockReturnValue("key-2");
      rerender(buildElement());

      expect(markRowDirty).toHaveBeenCalled();
    });

    it("does not call markRowDirty while resyncing, even if the row's key changes", () => {
      const markRowDirty = vi.fn();
      mockUseClaimContext.mockReturnValue({
        ...baseClaimContext,
        markRowDirty,
        isResyncingRef: { current: true },
      } as never);
      mockUseSparePartsRowCommon.mockReturnValue("key-1");

      const { rerender } = render(buildElement());

      mockUseSparePartsRowCommon.mockReturnValue("key-2");
      rerender(buildElement());

      expect(markRowDirty).not.toHaveBeenCalled();
    });

    it("does not call markRowDirty when prices have not been validated", () => {
      const markRowDirty = vi.fn();
      mockUseClaimContext.mockReturnValue({
        ...baseClaimContext,
        markRowDirty,
        arePricesValidated: false,
      } as never);
      mockUseSparePartsRowCommon.mockReturnValue("key-1");

      const { rerender } = render(buildElement());

      mockUseSparePartsRowCommon.mockReturnValue("key-2");
      rerender(buildElement());

      expect(markRowDirty).not.toHaveBeenCalled();
    });
  });

  describe("collapsed-state sync with arePricesValidated", () => {
    it("follows arePricesValidated when the user has price-view permission", () => {
      mockUseClaimContext.mockReturnValue({
        ...baseClaimContext,
        arePricesValidated: false,
      } as never);

      const { rerender } = render(buildElement({ initialValues: { [unitPriceFieldName]: 10 } }));
      expect(screen.getByTestId("collapsed-section")).toHaveTextContent("false");

      mockUseClaimContext.mockReturnValue({
        ...baseClaimContext,
        arePricesValidated: true,
      } as never);
      rerender(buildElement({ initialValues: { [unitPriceFieldName]: 10 } }));

      expect(screen.getByTestId("collapsed-section")).toHaveTextContent("true");
    });

    it("does not sync collapsed state when the user lacks price-view permission", () => {
      mockUseHasPermission.mockReturnValue(false);
      mockUseClaimContext.mockReturnValue({
        ...baseClaimContext,
        arePricesValidated: false,
      } as never);

      const { rerender } = render(buildElement({ initialValues: { [unitPriceFieldName]: 10 } }));
      expect(screen.getByTestId("collapsed-section")).toHaveTextContent("false");

      mockUseClaimContext.mockReturnValue({
        ...baseClaimContext,
        arePricesValidated: true,
      } as never);
      rerender(buildElement({ initialValues: { [unitPriceFieldName]: 10 } }));

      // Effect bails out early without permission, so state should not follow.
      expect(screen.getByTestId("collapsed-section")).toHaveTextContent("false");
    });
  });
});
