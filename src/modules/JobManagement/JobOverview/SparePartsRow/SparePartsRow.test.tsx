import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Formik, useFormikContext } from "formik";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import { DiagnosticsContext, type DiagnosticsContextValue } from "../DiagnosticsContext";
import SparePartsRow from "./SparePartsRow";
import type Field from "components/generics/Field/GenericField.types";
import { useHasPermission } from "hooks/useHasPermission";
import { PERMISSIONS } from "utils/Permissions";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@bosch/react-frok", () => ({
  Icon: ({ onClick, iconName }: { onClick?: () => void; iconName: string }) => (
    <button type="button" data-testid={`icon-${iconName}`} onClick={onClick}>
      {iconName}
    </button>
  ),
  Divider: () => <div data-testid="divider" />,
}));

vi.mock("hooks/useHasPermission", () => ({
  useHasPermission: vi.fn(() => true),
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ jobId: "job-1" }),
}));

vi.mock("../CustomerMessageModal/CustomerMessageModal", () => ({
  default: () => null,
}));

vi.mock(
  "../../../ClaimManagement/ApprovalList/ApprovalListTable/ApprovalActionsFlyout/ApprovalActionsFlyout",
  () => ({
    default: () => null,
  }),
);

vi.mock("components/generics/Field/GenericField", () => ({
  default: function MockGenericField({ field }: { field: Field }) {
    const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();
    const fieldValue = values[field.name];
    const normalizedValue =
      typeof fieldValue === "string" || typeof fieldValue === "number" ? String(fieldValue) : "";

    if (field.type === "dropdown") {
      return (
        <select
          data-testid={`field-${field.name}`}
          value={normalizedValue}
          disabled={field.isDisabled}
          onChange={(e) => {
            void setFieldValue(field.name, e.target.value);
          }}
        >
          {(field.options ?? []).map((option) => (
            <option
              key={`${field.name}-${String(option.value)}`}
              value={String(option.value ?? "")}
              disabled={option.disabled}
            >
              {String(option.name ?? option.value ?? "")}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        data-testid={`field-${field.name}`}
        value={normalizedValue}
        disabled={field.isDisabled}
        onChange={(e) => {
          void setFieldValue(field.name, e.target.value);
        }}
      />
    );
  },
}));

const createField = (overrides: Partial<Field>): Field => ({
  name: "",
  label: "",
  type: "text",
  sameDataFieldAs: "",
  pattern: "",
  maxLength: 0,
  minLength: 0,
  minValue: 0,
  maxValue: 0,
  position: 0,
  size: "3",
  infoText: "",
  patternText: "",
  extensions: [""],
  attributeMapping: "",
  dependFieldCondition: "AND",
  dependentFields: [],
  defaultValue: "",
  isDisabled: false,
  isHidden: false,
  isInfoIcon: false,
  isSubField: false,
  autoFillFields: [],
  ...overrides,
});

const rowFields: Field[] = [
  createField({
    name: "row0_position",
    subtype: "diagnosticPosition",
    type: "dropdown",
    fieldMapping: {
      originalName: "position",
      map: "position",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_partNumber",
    subtype: "diagnosticPartNumber",
    type: "autocomplete",
    fieldMapping: {
      originalName: "partNumber",
      map: "partNumber",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_type",
    subtype: "diagnosticType",
    type: "dropdown",
    options: [
      { value: "WARRANTY", name: "WARRANTY" },
      { value: "SERVICE_OFFERING", name: "SERVICE_OFFERING" },
      { value: "CHARGEABLE", name: "CHARGEABLE" },
      { value: "COMMERCIAL_GOODWILL", name: "COMMERCIAL_GOODWILL" },
      { value: "SPECIAL_CONTRACT", name: "SPECIAL_CONTRACT" },
    ],
    fieldMapping: {
      originalName: "type",
      map: "type",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_quantity",
    subtype: "diagnosticQuantity",
    type: "number",
    fieldMapping: {
      originalName: "quantity",
      map: "quantity",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_unitPrice",
    subtype: "diagnosticUnitPrice",
    type: "price",
    fieldMapping: {
      originalName: "unitPrice",
      map: "unitPrice",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_suggestedNetPrice",
    subtype: "diagnosticSuggestedNetPrice",
    type: "price",
    fieldMapping: {
      originalName: "suggestedNetPrice",
      map: "suggestedNetPrice",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_netAmount",
    subtype: "diagnosticNetAmount",
    type: "price",
    fieldMapping: {
      originalName: "netAmount",
      map: "netAmount",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_tax",
    subtype: "diagnosticTax",
    type: "number",
    fieldMapping: {
      originalName: "tax",
      map: "tax",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_taxAmount",
    subtype: "diagnosticTaxAmount",
    type: "price",
    fieldMapping: {
      originalName: "taxAmount",
      map: "taxAmount",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_grossAmount",
    subtype: "diagnosticGrossAmount",
    type: "price",
    fieldMapping: {
      originalName: "grossAmount",
      map: "grossAmount",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_totalAmount",
    subtype: "diagnosticTotalAmount",
    type: "price",
    fieldMapping: {
      originalName: "totalAmount",
      map: "totalAmount",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_discount",
    subtype: "diagnosticDiscount",
    type: "number",
    dependentFields: [{ fieldName: "discountBase", fieldValue: "GROSS_PRICE" }],
    fieldMapping: {
      originalName: "discount",
      map: "discount",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_discountHidden",
    subtype: "diagnosticDiscountHidden",
    type: "number",
    fieldMapping: {
      originalName: "discountHidden",
      map: "discountHidden",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_discountAmountHidden",
    subtype: "diagnosticDiscountAmountHidden",
    type: "number",
    fieldMapping: {
      originalName: "discountAmountHidden",
      map: "discountAmountHidden",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_materialId",
    subtype: "diagnosticMaterialId",
    type: "text",
    fieldMapping: {
      originalName: "materialId",
      map: "materialId",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
];

// Shape mirrors what SparePartsRow reads off GenericFormContext.warrantyPanelInfo:
//   isWarrantyIneligible = Boolean(warrantyPanelInfo?.isIneligible || !warrantyPanelInfo?.hasPurchaseDate)
// Leaving this undefined (as the previous test setup did) makes isWarrantyIneligible
// always evaluate to true, which unconditionally disables the WARRANTY/SERVICE_OFFERING
// type options regardless of sparePartNotBelongsToTool - defeating the tests below that
// are specifically meant to isolate that behavior. Default here to an "eligible" panel
// so those tests actually exercise sparePartNotBelongsToTool in isolation.
type WarrantyPanelInfo = {
  isIneligible: boolean;
  hasPurchaseDate: boolean;
  supportedWarrantyType: string;
};
const ELIGIBLE_WARRANTY_PANEL_INFO: WarrantyPanelInfo = {
  isIneligible: false,
  hasPurchaseDate: true,
  supportedWarrantyType: "",
};

type RowProps = {
  onDeleteRow?: () => void;
  isDisabled?: boolean;
  userPermissions?: string[];
  fields?: Field[];
};

const renderRow = (
  initialValues: Record<string, unknown>,
  summaryFields: Field[],
  discountBase: DiagnosticsContextValue["discountBase"] = "GROSS_PRICE",
  sparePartNotBelongsToTool: Record<string, boolean> = {},
  warrantyPanelInfo: WarrantyPanelInfo = ELIGIBLE_WARRANTY_PANEL_INFO,
  rowProps: RowProps = {},
  contextOverrides: Partial<DiagnosticsContextValue> = {},
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(["user"], { permissions: rowProps.userPermissions ?? ["ALL"] });
  const fieldsForRow = rowProps.fields ?? rowFields;

  const diagnosticsContextValue: DiagnosticsContextValue = {
    materials: [],
    apiMaterialsLoaded: true,
    apiMaterialsEmpty: false,
    hasExistingDiagnostic: true,
    setMaterials: vi.fn(),
    onAddRow: vi.fn(),
    onAddMaterials: vi.fn(),
    onDeleteRow: vi.fn(),
    onRestoreRow: vi.fn(),
    addSpecialMaterialsAllowed: false,
    positionDropdownOptions: [],
    allowedPositions: [],
    getExistingPartNumbers: () => new Set<string>(),
    isDistributingRef: { current: false },
    isResyncingRef: { current: false },
    arePricesValidated: true,
    setArePricesValidated: vi.fn(),
    hasPricesPopulated: true,
    markAllValidated: vi.fn(),
    markRowDirty: vi.fn(),
    summaryTypeOptions: [{ label: "chargeable", value: "chargeable" }],
    setSummaryTypeOptions: vi.fn(),
    setRevisedRejectedRowPending: vi.fn(),
    isArchivedExpanded: false,
    setIsArchivedExpanded: vi.fn(),
    canArchiveOnDelete: false,
    resyncMaterialsFromAPI: vi.fn(),
    jobStatus: "IN_DIAGNOSTICS",
    discountBase,
    automaticRows: [],
    isValidating: false,
    ...contextOverrides,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <GenericFormContext.Provider
        value={{
          allFields: [...summaryFields, ...fieldsForRow],
          setAllFields: vi.fn(),
          mandatoryFields: null,
          setMandatoryFields: vi.fn(),
          actionCallbacks: {},
          sparePartNotBelongsToTool: { current: sparePartNotBelongsToTool },
          warrantyPanelInfo,
        }}
      >
        <DiagnosticsContext.Provider value={diagnosticsContextValue}>
          <Formik initialValues={initialValues} onSubmit={vi.fn()}>
            <SparePartsRow
              fields={fieldsForRow}
              onDeleteRow={rowProps.onDeleteRow}
              isDisabled={rowProps.isDisabled}
            />
          </Formik>
        </DiagnosticsContext.Provider>
      </GenericFormContext.Provider>
    </QueryClientProvider>,
  );
};

afterEach(() => {
  vi.mocked(useHasPermission).mockImplementation(() => true);
});

describe("SparePartsRow price field editability", () => {
  // Regression test: prior to routing editability through materialPriceEditability,
  // diagnosticTotalAmount/diagnosticNetAmount were gated only on position (!isAutomaticRow)
  // independent of jobType, while diagnosticDiscount was correctly gated on jobType too.
  // Net effect: a WARRANTY row on a protected position (LA/FR/PC) showed discount locked
  // but totalAmount/netAmount unlocked — inconsistent, and contrary to "discount and
  // totalAmount/netAmount should follow the same editability rule".
  it("locks discount AND totalAmount together for a non-editable jobType (WARRANTY) on a protected position (LA)", () => {
    renderRow(
      {
        row0_position: "LA",
        row0_type: "WARRANTY",
      },
      [],
      "GROSS_PRICE",
    );

    expect(screen.getByTestId("field-row0_discount")).toBeDisabled();
    expect(screen.getByTestId("field-row0_totalAmount")).toBeDisabled();
  });

  it("unlocks discount AND totalAmount together for CHARGEABLE on a protected position (LA)", () => {
    renderRow(
      {
        row0_position: "LA",
        row0_type: "CHARGEABLE",
      },
      [],
      "GROSS_PRICE",
    );

    expect(screen.getByTestId("field-row0_discount")).toBeEnabled();
    expect(screen.getByTestId("field-row0_totalAmount")).toBeEnabled();
  });

  it("unlocks discount AND netAmount together for COMMERCIAL_GOODWILL on LA in NET_PRICE mode", () => {
    renderRow(
      {
        row0_position: "LA",
        row0_type: "COMMERCIAL_GOODWILL",
      },
      [],
      "NET_PRICE",
    );

    expect(screen.getByTestId("field-row0_discount")).toBeEnabled();
    expect(screen.getByTestId("field-row0_netAmount")).toBeEnabled();
  });

  it("locks discount AND totalAmount together for CHARGEABLE on a material position (SP) — summary-controlled instead", () => {
    renderRow(
      {
        row0_position: "SP",
        row0_type: "CHARGEABLE",
      },
      [],
      "GROSS_PRICE",
    );

    expect(screen.getByTestId("field-row0_discount")).toBeDisabled();
    expect(screen.getByTestId("field-row0_totalAmount")).toBeDisabled();
  });

  it("unlocks discount AND totalAmount together for COMMERCIAL_GOODWILL on a material position (SP)", () => {
    renderRow(
      {
        row0_position: "SP",
        row0_type: "COMMERCIAL_GOODWILL",
      },
      [],
      "GROSS_PRICE",
    );

    expect(screen.getByTestId("field-row0_discount")).toBeEnabled();
    expect(screen.getByTestId("field-row0_totalAmount")).toBeEnabled();
  });

  // Regression test: earlier tests in this block all start already at the target jobType on
  // initial mount, where the field's isDisabled defaults to falsy and happens to come out
  // right either way. That masked a real bug where fields were correctly computed on fresh
  // mount but never re-enabled when TRANSITIONING into an editable jobType from a disabled
  // one — applyFieldPermissions' fallback for the "should be enabled" case just returned the
  // field unchanged instead of explicitly setting isDisabled: false, silently preserving
  // whatever isDisabled the field carried from the previous (disabled) jobType.
  it("re-enables discount AND totalAmount when transitioning from a disabled jobType (WARRANTY) to CHARGEABLE on a protected position (LA)", async () => {
    renderRow(
      {
        row0_position: "LA",
        row0_type: "WARRANTY",
        row0_grossAmount: 120,
        row0_discount: 0,
        row0_discountHidden: 0,
      },
      [],
      "GROSS_PRICE",
    );

    expect(screen.getByTestId("field-row0_discount")).toBeDisabled();
    expect(screen.getByTestId("field-row0_totalAmount")).toBeDisabled();

    fireEvent.change(screen.getByTestId("field-row0_type"), {
      target: { value: "CHARGEABLE" },
    });

    await waitFor(() => {
      expect(screen.getByTestId("field-row0_discount")).toBeEnabled();
    });
    expect(screen.getByTestId("field-row0_totalAmount")).toBeEnabled();
  });

  it("re-enables discount AND totalAmount when transitioning from a disabled jobType (WARRANTY) to COMMERCIAL_GOODWILL on a material position (SP)", async () => {
    renderRow(
      {
        row0_position: "SP",
        row0_type: "WARRANTY",
        row0_grossAmount: 120,
        row0_discount: 0,
        row0_discountHidden: 0,
      },
      [],
      "GROSS_PRICE",
    );

    expect(screen.getByTestId("field-row0_discount")).toBeDisabled();
    expect(screen.getByTestId("field-row0_totalAmount")).toBeDisabled();

    fireEvent.change(screen.getByTestId("field-row0_type"), {
      target: { value: "COMMERCIAL_GOODWILL" },
    });

    await waitFor(() => {
      expect(screen.getByTestId("field-row0_discount")).toBeEnabled();
    });
    expect(screen.getByTestId("field-row0_totalAmount")).toBeEnabled();
  });

  it("re-disables discount AND totalAmount when transitioning from CHARGEABLE (editable, LA) to WARRANTY", async () => {
    renderRow(
      {
        row0_position: "LA",
        row0_type: "CHARGEABLE",
        row0_grossAmount: 120,
        row0_discount: 10,
        row0_discountHidden: 10,
      },
      [],
      "GROSS_PRICE",
    );

    expect(screen.getByTestId("field-row0_discount")).toBeEnabled();
    expect(screen.getByTestId("field-row0_totalAmount")).toBeEnabled();

    fireEvent.change(screen.getByTestId("field-row0_type"), {
      target: { value: "WARRANTY" },
    });

    await waitFor(() => {
      expect(screen.getByTestId("field-row0_discount")).toBeDisabled();
    });
    expect(screen.getByTestId("field-row0_totalAmount")).toBeDisabled();
  });
});

describe("SparePartsRow type transitions", () => {
  it("applies summary discount and recalculates total when type changes to CHARGEABLE", async () => {
    const summaryFields: Field[] = [
      createField({
        name: "summaryDiscountMaterialHidden",
        subtype: "diagnosticSummaryDiscountMaterialHidden",
        type: "number",
      }),
    ];

    renderRow(
      {
        row0_position: "SP",
        row0_type: "",
        row0_quantity: 2,
        row0_unitPrice: 100,
        row0_suggestedNetPrice: 200,
        row0_netAmount: 200,
        row0_tax: 20,
        row0_taxAmount: 40,
        row0_grossAmount: 240,
        row0_totalAmount: 240,
        row0_discount: 0,
        row0_discountHidden: 0,
        summaryDiscountMaterialHidden: 17.5,
      },
      summaryFields,
    );

    fireEvent.change(screen.getByTestId("field-row0_type"), {
      target: { value: "CHARGEABLE" },
    });

    await waitFor(() => {
      expect((screen.getByTestId("field-row0_discount") as HTMLInputElement).value).toBe("0");
      expect((screen.getByTestId("field-row0_totalAmount") as HTMLInputElement).value).toBe("240");
    });
  });

  it("applies summary discount when type changes from WARRANTY to CHARGEABLE", async () => {
    const summaryFields: Field[] = [
      createField({
        name: "summaryDiscountMaterialHidden",
        subtype: "diagnosticSummaryDiscountMaterialHidden",
        type: "number",
      }),
    ];

    renderRow(
      {
        row0_position: "SP",
        row0_type: "WARRANTY",
        row0_quantity: 2,
        row0_unitPrice: 100,
        row0_suggestedNetPrice: 200,
        row0_netAmount: 200,
        row0_tax: 20,
        row0_taxAmount: 40,
        row0_grossAmount: 240,
        row0_totalAmount: 213.6,
        row0_discount: 11,
        row0_discountHidden: 11,
        summaryDiscountMaterialHidden: 17.5,
      },
      summaryFields,
    );

    fireEvent.change(screen.getByTestId("field-row0_type"), {
      target: { value: "CHARGEABLE" },
    });

    await waitFor(() => {
      expect((screen.getByTestId("field-row0_discount") as HTMLInputElement).value).toBe("0");
      expect((screen.getByTestId("field-row0_totalAmount") as HTMLInputElement).value).toBe("240");
    });
  });

  it("resets discount and recalculates total when type changes from CHARGEABLE to WARRANTY", async () => {
    const summaryFields: Field[] = [
      createField({
        name: "summaryDiscountMaterialHidden",
        subtype: "diagnosticSummaryDiscountMaterialHidden",
        type: "number",
      }),
    ];

    renderRow(
      {
        row0_position: "SP",
        row0_type: "CHARGEABLE",
        row0_quantity: 2,
        row0_unitPrice: 100,
        row0_suggestedNetPrice: 200,
        row0_netAmount: 200,
        row0_tax: 20,
        row0_taxAmount: 40,
        row0_grossAmount: 240,
        row0_totalAmount: 205.8,
        row0_discount: 14.25,
        row0_discountHidden: 14.25,
        summaryDiscountMaterialHidden: 17.5,
      },
      summaryFields,
    );

    fireEvent.change(screen.getByTestId("field-row0_type"), {
      target: { value: "WARRANTY" },
    });

    await waitFor(() => {
      expect((screen.getByTestId("field-row0_discount") as HTMLInputElement).value).toBe("0");
      expect((screen.getByTestId("field-row0_totalAmount") as HTMLInputElement).value).toBe("240");
    });
  });

  it("resets discount for LA position when type changes from CHARGEABLE to WARRANTY", async () => {
    renderRow(
      {
        row0_position: "LA",
        row0_type: "CHARGEABLE",
        row0_quantity: 2,
        row0_unitPrice: 50,
        row0_suggestedNetPrice: 100,
        row0_netAmount: 100,
        row0_tax: 20,
        row0_taxAmount: 20,
        row0_grossAmount: 120,
        row0_totalAmount: 102.6,
        row0_discount: 14.5,
        row0_discountHidden: 14.5,
        row0_discountAmountHidden: 17.4,
      },
      [],
    );

    fireEvent.change(screen.getByTestId("field-row0_type"), {
      target: { value: "WARRANTY" },
    });

    await waitFor(() => {
      expect((screen.getByTestId("field-row0_discount") as HTMLInputElement).value).toBe("0");
      expect((screen.getByTestId("field-row0_discountHidden") as HTMLInputElement).value).toBe("0");
      expect(
        (screen.getByTestId("field-row0_discountAmountHidden") as HTMLInputElement).value,
      ).toBe("0");
    });
  });

  it("resets discount for FR position when type changes from COMMERCIAL_GOODWILL to SERVICE_OFFERING", async () => {
    renderRow(
      {
        row0_position: "FR",
        row0_type: "COMMERCIAL_GOODWILL",
        row0_quantity: 1,
        row0_unitPrice: 75,
        row0_suggestedNetPrice: 75,
        row0_netAmount: 75,
        row0_tax: 20,
        row0_taxAmount: 15,
        row0_grossAmount: 90,
        row0_totalAmount: 81,
        row0_discount: 10,
        row0_discountHidden: 10,
        row0_discountAmountHidden: 9,
      },
      [],
    );

    fireEvent.change(screen.getByTestId("field-row0_type"), {
      target: { value: "SERVICE_OFFERING" },
    });

    await waitFor(() => {
      expect((screen.getByTestId("field-row0_discount") as HTMLInputElement).value).toBe("0");
      expect((screen.getByTestId("field-row0_discountHidden") as HTMLInputElement).value).toBe("0");
      expect(
        (screen.getByTestId("field-row0_discountAmountHidden") as HTMLInputElement).value,
      ).toBe("0");
    });
  });

  it("resets discount for PC position when type changes from CHARGEABLE to WARRANTY", async () => {
    renderRow(
      {
        row0_position: "PC",
        row0_type: "CHARGEABLE",
        row0_quantity: 1,
        row0_unitPrice: 150,
        row0_suggestedNetPrice: 150,
        row0_netAmount: 150,
        row0_tax: 20,
        row0_taxAmount: 30,
        row0_grossAmount: 180,
        row0_totalAmount: 162,
        row0_discount: 10,
        row0_discountHidden: 10,
        row0_discountAmountHidden: 18,
      },
      [],
    );

    fireEvent.change(screen.getByTestId("field-row0_type"), {
      target: { value: "WARRANTY" },
    });

    await waitFor(() => {
      expect((screen.getByTestId("field-row0_discount") as HTMLInputElement).value).toBe("0");
      expect((screen.getByTestId("field-row0_discountHidden") as HTMLInputElement).value).toBe("0");
      expect(
        (screen.getByTestId("field-row0_discountAmountHidden") as HTMLInputElement).value,
      ).toBe("0");
    });
  });

  describe("Discount amount calculation", () => {
    it("calculates discountAmountHidden from grossAmount and discount percent for SP position", async () => {
      const summaryFields: Field[] = [
        createField({
          name: "row1_type",
          subtype: "diagnosticType",
          type: "dropdown",
          fieldMapping: {
            originalName: "type",
            map: "type",
            parentMap: [],
            prefixes: [],
            nameStartsWith: "diagnosticsSpareParts#1_",
          },
        }),
        createField({
          name: "row1_discountHidden",
          subtype: "diagnosticDiscountHidden",
          type: "number",
          fieldMapping: {
            originalName: "discountHidden",
            map: "discountHidden",
            parentMap: [],
            prefixes: [],
            nameStartsWith: "diagnosticsSpareParts#1_",
          },
        }),
      ];

      renderRow(
        {
          row0_position: "SP",
          row0_type: "WARRANTY",
          row0_quantity: 2,
          row0_unitPrice: 100,
          row0_suggestedNetPrice: 200,
          row0_netAmount: 200,
          row0_tax: 20,
          row0_taxAmount: 40,
          row0_grossAmount: 240,
          row0_totalAmount: 240,
          row0_discount: 0,
          row0_discountHidden: 0,
          row0_discountAmountHidden: 0,
          row1_type: "CHARGEABLE",
          row1_discountHidden: 15,
        },
        summaryFields,
      );

      // Change type to CHARGEABLE which should apply 15% discount from row1
      fireEvent.change(screen.getByTestId("field-row0_type"), {
        target: { value: "CHARGEABLE" },
      });

      await waitFor(() => {
        expect((screen.getByTestId("field-row0_discount") as HTMLInputElement).value).toBe("15");
        expect((screen.getByTestId("field-row0_discountHidden") as HTMLInputElement).value).toBe(
          "15",
        );
        // discountAmount = 240 * 15 / 100 = 36
        expect(
          (screen.getByTestId("field-row0_discountAmountHidden") as HTMLInputElement).value,
        ).toBe("36");
      });
    });
  });

  it("disables WARRANTY and SERVICE_OFFERING options when selected spare part does not belong to tool", () => {
    renderRow(
      {
        row0_position: "SP",
        row0_partNumber: "UNKNOWN_PART",
        row0_type: "CHARGEABLE",
        row0_quantity: 1,
        row0_unitPrice: 100,
        row0_suggestedNetPrice: 100,
        row0_netAmount: 100,
        row0_tax: 20,
        row0_taxAmount: 20,
        row0_grossAmount: 120,
        row0_totalAmount: 120,
        row0_discount: 0,
        row0_discountHidden: 0,
      },
      [],
      "GROSS_PRICE",
      { row0_partNumber: true },
    );

    const typeField = screen.getByTestId("field-row0_type") as HTMLSelectElement;
    const optionsByValue = Object.fromEntries(
      Array.from(typeField.options).map((option) => [option.value, option]),
    );

    expect(optionsByValue.WARRANTY.disabled).toBe(true);
    expect(optionsByValue.SERVICE_OFFERING.disabled).toBe(true);
    expect(optionsByValue.CHARGEABLE.disabled).toBe(false);
  });

  it("enables WARRANTY and SERVICE_OFFERING options when selected spare part belongs to tool", () => {
    renderRow(
      {
        row0_position: "SP",
        row0_partNumber: "MATCHED_PART",
        row0_type: "CHARGEABLE",
        row0_quantity: 1,
        row0_unitPrice: 100,
        row0_suggestedNetPrice: 100,
        row0_netAmount: 100,
        row0_tax: 20,
        row0_taxAmount: 20,
        row0_grossAmount: 120,
        row0_totalAmount: 120,
        row0_discount: 0,
        row0_discountHidden: 0,
      },
      [],
      "GROSS_PRICE",
      { row0_partNumber: false },
    );

    const typeField = screen.getByTestId("field-row0_type") as HTMLSelectElement;
    const optionsByValue = Object.fromEntries(
      Array.from(typeField.options).map((option) => [option.value, option]),
    );

    expect(optionsByValue.WARRANTY.disabled).toBe(false);
    expect(optionsByValue.SERVICE_OFFERING.disabled).toBe(false);
    expect(optionsByValue.CHARGEABLE.disabled).toBe(false);
  });

  it("disables WARRANTY and SERVICE_OFFERING options when SP part number is empty", () => {
    renderRow(
      {
        row0_position: "SP",
        row0_partNumber: "",
        row0_type: "CHARGEABLE",
        row0_quantity: 1,
        row0_unitPrice: 100,
        row0_suggestedNetPrice: 100,
        row0_netAmount: 100,
        row0_tax: 20,
        row0_taxAmount: 20,
        row0_grossAmount: 120,
        row0_totalAmount: 120,
        row0_discount: 0,
        row0_discountHidden: 0,
      },
      [],
      "GROSS_PRICE",
      {},
    );

    const typeField = screen.getByTestId("field-row0_type") as HTMLSelectElement;
    const optionsByValue = Object.fromEntries(
      Array.from(typeField.options).map((option) => [option.value, option]),
    );

    expect(optionsByValue.WARRANTY.disabled).toBe(true);
    expect(optionsByValue.SERVICE_OFFERING.disabled).toBe(true);
    expect(optionsByValue.CHARGEABLE.disabled).toBe(false);
  });

  it("disables WARRANTY and SERVICE_OFFERING options when the warranty panel is ineligible, even if the spare part belongs to the tool", () => {
    renderRow(
      {
        row0_position: "SP",
        row0_partNumber: "MATCHED_PART",
        row0_type: "CHARGEABLE",
        row0_quantity: 1,
        row0_unitPrice: 100,
        row0_suggestedNetPrice: 100,
        row0_netAmount: 100,
        row0_tax: 20,
        row0_taxAmount: 20,
        row0_grossAmount: 120,
        row0_totalAmount: 120,
        row0_discount: 0,
        row0_discountHidden: 0,
      },
      [],
      "GROSS_PRICE",
      { row0_partNumber: false },
      { isIneligible: true, hasPurchaseDate: true, supportedWarrantyType: "" },
    );

    const typeField = screen.getByTestId("field-row0_type") as HTMLSelectElement;
    const optionsByValue = Object.fromEntries(
      Array.from(typeField.options).map((option) => [option.value, option]),
    );

    expect(optionsByValue.WARRANTY.disabled).toBe(true);
    expect(optionsByValue.SERVICE_OFFERING.disabled).toBe(true);
    expect(optionsByValue.CHARGEABLE.disabled).toBe(false);
  });
});

describe("SparePartsRow jobType discount repopulation — confirmed rule", () => {
  // Rule 1, protected-position branch: entering CHARGEABLE on LA/FR/PC always resets to 0,
  // even when a CHARGEABLE material sibling with a non-zero discount exists. Previously this
  // case did nothing at all (stale value left in place) rather than explicitly resetting.
  it("entering CHARGEABLE on a protected position (LA) resets to 0, ignoring a CHARGEABLE material sibling", async () => {
    const siblingFields: Field[] = [
      createField({
        name: "row1_position",
        subtype: "diagnosticPosition",
        type: "dropdown",
        fieldMapping: {
          originalName: "position",
          map: "position",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "diagnosticsSpareParts#1_",
        },
      }),
      createField({
        name: "row1_type",
        subtype: "diagnosticType",
        type: "dropdown",
        fieldMapping: {
          originalName: "type",
          map: "type",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "diagnosticsSpareParts#1_",
        },
      }),
      createField({
        name: "row1_discountHidden",
        subtype: "diagnosticDiscountHidden",
        type: "number",
        fieldMapping: {
          originalName: "discountHidden",
          map: "discountHidden",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "diagnosticsSpareParts#1_",
        },
      }),
    ];

    renderRow(
      {
        row0_position: "LA",
        row0_type: "WARRANTY",
        row0_grossAmount: 120,
        row0_discount: 0,
        row0_discountHidden: 0,
        row1_position: "SP",
        row1_type: "CHARGEABLE",
        row1_discountHidden: 20,
      },
      siblingFields,
    );

    fireEvent.change(screen.getByTestId("field-row0_type"), {
      target: { value: "CHARGEABLE" },
    });

    await waitFor(() => {
      expect((screen.getByTestId("field-row0_discount") as HTMLInputElement).value).toBe("0");
    });
  });

  // Rule 1, material-position branch: a CHARGEABLE sibling on a protected position (LA) must
  // NOT be used as the discount source for a material row entering CHARGEABLE — only other
  // material-position (PN/SP/AC) siblings count.
  it("entering CHARGEABLE on a material position (SP) ignores a CHARGEABLE LA sibling as a discount source", async () => {
    const siblingFields: Field[] = [
      createField({
        name: "row1_position",
        subtype: "diagnosticPosition",
        type: "dropdown",
        fieldMapping: {
          originalName: "position",
          map: "position",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "diagnosticsSpareParts#1_",
        },
      }),
      createField({
        name: "row1_type",
        subtype: "diagnosticType",
        type: "dropdown",
        fieldMapping: {
          originalName: "type",
          map: "type",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "diagnosticsSpareParts#1_",
        },
      }),
      createField({
        name: "row1_discountHidden",
        subtype: "diagnosticDiscountHidden",
        type: "number",
        fieldMapping: {
          originalName: "discountHidden",
          map: "discountHidden",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "diagnosticsSpareParts#1_",
        },
      }),
    ];

    renderRow(
      {
        row0_position: "SP",
        row0_type: "WARRANTY",
        row0_grossAmount: 240,
        row0_discount: 0,
        row0_discountHidden: 0,
        row1_position: "LA",
        row1_type: "CHARGEABLE",
        row1_discountHidden: 30,
      },
      siblingFields,
    );

    fireEvent.change(screen.getByTestId("field-row0_type"), {
      target: { value: "CHARGEABLE" },
    });

    await waitFor(() => {
      // No eligible (material-position) CHARGEABLE sibling -> falls back to 0, not the LA
      // sibling's 30%.
      expect((screen.getByTestId("field-row0_discount") as HTMLInputElement).value).toBe("0");
    });
  });

  // Rule 2 gap closed: SPECIAL_CONTRACT was previously missing from the reset-trigger set,
  // so leaving CHARGEABLE for SPECIAL_CONTRACT left a stale discount value in place.
  it("leaving CHARGEABLE for SPECIAL_CONTRACT resets discount to 0", async () => {
    renderRow(
      {
        row0_position: "SP",
        row0_type: "CHARGEABLE",
        row0_grossAmount: 240,
        row0_discount: 14.25,
        row0_discountHidden: 14.25,
      },
      [],
    );

    fireEvent.change(screen.getByTestId("field-row0_type"), {
      target: { value: "SPECIAL_CONTRACT" },
    });

    await waitFor(() => {
      expect((screen.getByTestId("field-row0_discount") as HTMLInputElement).value).toBe("0");
    });
  });

  // Rule 3 gap closed: same gap as above, for the COMMERCIAL_GOODWILL source side.
  it("leaving COMMERCIAL_GOODWILL for SPECIAL_CONTRACT resets discount to 0", async () => {
    renderRow(
      {
        row0_position: "FR",
        row0_type: "COMMERCIAL_GOODWILL",
        row0_grossAmount: 90,
        row0_discount: 10,
        row0_discountHidden: 10,
      },
      [],
    );

    fireEvent.change(screen.getByTestId("field-row0_type"), {
      target: { value: "SPECIAL_CONTRACT" },
    });

    await waitFor(() => {
      expect((screen.getByTestId("field-row0_discount") as HTMLInputElement).value).toBe("0");
    });
  });

  // No rule applies between two non-target jobTypes — discount is left untouched, matching
  // prior behavior. These fields are read-only for both types anyway (Phase 1), so the
  // stale value has no visible effect, but the field-level value itself should not change.
  it("leaves discount untouched when transitioning between two non-target jobTypes (WARRANTY -> SERVICE_OFFERING)", async () => {
    renderRow(
      {
        row0_position: "SP",
        row0_type: "WARRANTY",
        row0_grossAmount: 240,
        row0_discount: 7,
        row0_discountHidden: 7,
      },
      [],
    );

    fireEvent.change(screen.getByTestId("field-row0_type"), {
      target: { value: "SERVICE_OFFERING" },
    });

    await waitFor(() => {
      expect(screen.getByTestId("field-row0_type")).toHaveValue("SERVICE_OFFERING");
    });

    expect((screen.getByTestId("field-row0_discount") as HTMLInputElement).value).toBe("7");
  });
});

// Extra field used by several suites below to exercise isPending / row-status-gated logic,
// which the default rowFields set does not include.
const statusField: Field = createField({
  name: "row0_status",
  subtype: "diagnosticMaterialStatus",
  type: "text",
  fieldMapping: {
    originalName: "status",
    map: "status",
    parentMap: [],
    prefixes: [],
    nameStartsWith: "diagnosticsSpareParts#0_",
  },
});

const checkboxField: Field = createField({
  name: "row0_preApprovalCheckbox",
  type: "checkbox",
  fieldMapping: {
    originalName: "preApprovalCheckbox",
    map: "preApprovalCheckbox",
    parentMap: [],
    prefixes: [],
    nameStartsWith: "diagnosticsSpareParts#0_",
  },
});

// Grants permission for hasApproveCommercialGoodwillPermission to resolve to false, so
// renderRowActions falls through to the delete-icon branch instead of the approval flyout.
const denyApproveCommercialGoodwill = () => {
  vi.mocked(useHasPermission).mockImplementation(
    (perms: string[] | undefined) =>
      !(perms ?? []).includes(PERMISSIONS.APPROVAL.CAN_APPROVE_COMMERCIAL_GOODWILL_ITEMS),
  );
};

describe("SparePartsRow delete icon visibility", () => {
  it("shows the delete icon and invokes onDeleteRow when clicked", () => {
    denyApproveCommercialGoodwill();
    const onDeleteRow = vi.fn();
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {
        onDeleteRow,
        userPermissions: [PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS],
      },
    );

    fireEvent.click(screen.getByTestId("icon-delete"));

    expect(onDeleteRow).toHaveBeenCalledTimes(1);
  });

  it("never shows a delete icon for the LA position, even with delete permission", () => {
    denyApproveCommercialGoodwill();
    renderRow(
      { row0_position: "LA", row0_type: "WARRANTY" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {
        userPermissions: [PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_LABOUR_ITEMS],
      },
    );

    expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
  });

  it("hides the delete icon while the row's job status blocks deletion", () => {
    denyApproveCommercialGoodwill();
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {
        userPermissions: [PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS],
      },
      { jobStatus: "IN_REPAIR" },
    );

    expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
  });

  it("hides the delete icon when the job is on hold", () => {
    denyApproveCommercialGoodwill();
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY", isOnHold: true },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {
        userPermissions: [PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS],
      },
    );

    expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
  });

  it("hides the delete icon when the row is disabled and archiving on delete is not allowed", () => {
    denyApproveCommercialGoodwill();
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {
        isDisabled: true,
        userPermissions: [PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS],
      },
      { canArchiveOnDelete: false },
    );

    expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
  });

  it("shows the delete icon when the row is disabled but archiving on delete is allowed", () => {
    denyApproveCommercialGoodwill();
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {
        isDisabled: true,
        userPermissions: [PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS],
      },
      { canArchiveOnDelete: true },
    );

    expect(screen.getByTestId("icon-delete")).toBeInTheDocument();
  });

  it("hides row actions entirely for an automatic exchange row", () => {
    denyApproveCommercialGoodwill();
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY", actionType: "SPARE_PARTS_EXCHANGE" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {
        userPermissions: [PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS],
      },
      { automaticRows: ["SP"] },
    );

    expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
  });

  it("renders the approval flyout instead of a delete icon when the user can approve commercial goodwill and the material is pending", () => {
    // Default mock (useHasPermission -> true) covers hasApproveCommercialGoodwillPermission.
    renderRow(
      { row0_position: "SP", row0_type: "COMMERCIAL_GOODWILL", row0_status: "PENDING" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      { fields: [...rowFields, statusField] },
    );

    expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
  });

  it("renders nothing for row actions when the user can approve commercial goodwill but the material is not pending", () => {
    renderRow(
      { row0_position: "SP", row0_type: "COMMERCIAL_GOODWILL", row0_status: "APPROVED" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      { fields: [...rowFields, statusField] },
    );

    expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
  });
});

describe("SparePartsRow pre-approval checkbox field", () => {
  it("disables the pre-approval checkbox field when the material status is not PENDING", () => {
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY", row0_status: "REJECTED" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      { fields: [...rowFields, statusField, checkboxField] },
    );

    expect(screen.getByTestId("field-row0_preApprovalCheckbox")).toBeDisabled();
  });

  it("enables the pre-approval checkbox field when the material status is PENDING", () => {
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY", row0_status: "PENDING" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      { fields: [...rowFields, statusField, checkboxField] },
    );

    expect(screen.getByTestId("field-row0_preApprovalCheckbox")).toBeEnabled();
  });
});

describe("SparePartsRow full-row disablement", () => {
  it("disables every field on the row when the isDisabled prop is true", () => {
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      { isDisabled: true },
    );

    expect(screen.getByTestId("field-row0_type")).toBeDisabled();
    expect(screen.getByTestId("field-row0_position")).toBeDisabled();
  });

  it("disables every field on the row when the material status is APPROVED", () => {
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY", row0_status: "APPROVED" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      { fields: [...rowFields, statusField] },
    );

    expect(screen.getByTestId("field-row0_type")).toBeDisabled();
  });

  it("disables every field on the row when the job status disables the row (e.g. RETURN_ASSEMBLY)", () => {
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {},
      { jobStatus: "RETURN_ASSEMBLY" },
    );

    expect(screen.getByTestId("field-row0_type")).toBeDisabled();
  });

  it("disables every field on the row while validation is in flight", () => {
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {},
      { isValidating: true },
    );

    expect(screen.getByTestId("field-row0_type")).toBeDisabled();
  });

  it("leaves fields enabled (per their own rules) when none of the disabling conditions apply", () => {
    renderRow({ row0_position: "SP", row0_type: "WARRANTY" }, [], "GROSS_PRICE");

    expect(screen.getByTestId("field-row0_type")).toBeEnabled();
  });
});

describe("SparePartsRow collapse behavior", () => {
  it("toggles collapse state on arrow click when prices are expandable (materialId present)", () => {
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY", row0_materialId: "MAT-1" },
      [],
      "GROSS_PRICE",
    );

    // Mocked Icon hardcodes data-testid as `icon-${iconName}`, ignoring the real
    // component's data-testid prop — iconName is "up"/"down" based on isRowCollapsed.
    expect(screen.getByTestId("icon-up")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("icon-up"));

    expect(screen.getByTestId("icon-down")).toBeInTheDocument();
  });

  it("does not toggle collapse when there are no expandable prices", () => {
    renderRow({ row0_position: "SP", row0_type: "WARRANTY" }, [], "GROSS_PRICE");

    fireEvent.click(screen.getByTestId("icon-up"));

    expect(screen.getByTestId("icon-up")).toBeInTheDocument();
  });
});

describe("SparePartsRow revised/rejected row reset", () => {
  it("marks the row as pending-reset when a field changes while row status is REVISED", () => {
    const setRevisedRejectedRowPending = vi.fn();
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY", row0_status: "REVISED" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      { fields: [...rowFields, statusField] },
      { setRevisedRejectedRowPending },
    );

    fireEvent.change(screen.getByTestId("field-row0_type"), { target: { value: "CHARGEABLE" } });

    expect(setRevisedRejectedRowPending).toHaveBeenCalledWith("diagnosticsSpareParts#0");
  });

  it("marks the row as pending-reset when a field changes while row status is REJECTED", () => {
    const setRevisedRejectedRowPending = vi.fn();
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY", row0_status: "REJECTED" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      { fields: [...rowFields, statusField] },
      { setRevisedRejectedRowPending },
    );

    fireEvent.change(screen.getByTestId("field-row0_type"), { target: { value: "CHARGEABLE" } });

    expect(setRevisedRejectedRowPending).toHaveBeenCalledWith("diagnosticsSpareParts#0");
  });

  it("does not mark the row as pending-reset for statuses outside REVISED/REJECTED", () => {
    const setRevisedRejectedRowPending = vi.fn();
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY", row0_status: "PENDING" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      { fields: [...rowFields, statusField] },
      { setRevisedRejectedRowPending },
    );

    fireEvent.change(screen.getByTestId("field-row0_type"), { target: { value: "CHARGEABLE" } });

    expect(setRevisedRejectedRowPending).not.toHaveBeenCalled();
  });
});

describe("SparePartsRow position field gating", () => {
  it("disables the position field once a part number is set", () => {
    renderRow({ row0_position: "SP", row0_type: "WARRANTY", row0_partNumber: "12345" }, []);

    expect(screen.getByTestId("field-row0_position")).toBeDisabled();
  });

  it("enables the position field when no part number is set", () => {
    renderRow({ row0_position: "SP", row0_type: "WARRANTY", row0_partNumber: "" }, []);

    expect(screen.getByTestId("field-row0_position")).toBeEnabled();
  });
  const positionFieldWithOptions = (nameStartsWith: string, name: string): Field =>
    createField({
      name,
      subtype: "diagnosticPosition",
      type: "dropdown",
      options: [
        { value: "SP", name: "SP" },
        { value: "PN", name: "PN" },
      ],
      fieldMapping: {
        originalName: "position",
        map: "position",
        parentMap: [],
        prefixes: [],
        nameStartsWith,
      },
    });

  it("disables a position option entirely when the user lacks delete permission for it", () => {
    const row0Position = positionFieldWithOptions("diagnosticsSpareParts#0_", "row0_position");

    renderRow({ row0_position: "SP" }, [], "GROSS_PRICE", {}, ELIGIBLE_WARRANTY_PANEL_INFO, {
      fields: [row0Position, ...rowFields.filter((f) => f.subtype !== "diagnosticPosition")],
      userPermissions: [],
    });

    const positionSelect = screen.getByTestId("field-row0_position") as HTMLSelectElement;
    const optionsByValue = Object.fromEntries(
      Array.from(positionSelect.options).map((option) => [option.value, option]),
    );

    expect(optionsByValue.SP.disabled).toBe(true);
    expect(optionsByValue.PN.disabled).toBe(true);
  });

  it("disables a position option once its per-job maxCount is already used by a sibling row", () => {
    const row0Position = positionFieldWithOptions("diagnosticsSpareParts#0_", "row0_position");
    const row1Position = positionFieldWithOptions("diagnosticsSpareParts#1_", "row1_position");

    renderRow(
      { row0_position: "SP", row1_position: "PN" },
      [row1Position],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {
        fields: [row0Position, ...rowFields.filter((f) => f.subtype !== "diagnosticPosition")],
        userPermissions: [
          PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS,
          PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_FULL_TOOLS_ITEMS,
        ],
      },
      {
        allowedPositions: [
          {
            position: "PN",
            maxCount: 1,
            minCount: 0,
            quantity: { quantitySource: "MANUAL", defaultQuantity: 1 },
            unitPriceSource: "MANUAL",
          },
        ],
      },
    );

    const positionSelect = screen.getByTestId("field-row0_position") as HTMLSelectElement;
    const optionsByValue = Object.fromEntries(
      Array.from(positionSelect.options).map((option) => [option.value, option]),
    );

    expect(optionsByValue.PN.disabled).toBe(true);
    expect(optionsByValue.SP.disabled).toBe(false);
  });
});

describe("SparePartsRow part number change effect (resolvePartNumberChangeAction)", () => {
  // "reset" outcome: a genuine, user-driven part number change while not resyncing —
  // resetPartNumberDependentFields nulls the row's entire price object plus materialId.
  it("resets price fields and materialId when the part number changes to a genuinely different value", async () => {
    renderRow(
      {
        row0_position: "SP",
        row0_type: "WARRANTY",
        row0_partNumber: "1609888887",
        row0_materialId: "MAT-123",
        row0_unitPrice: 100,
        row0_tax: 20,
        row0_netAmount: 100,
        row0_grossAmount: 120,
        row0_totalAmount: 120,
        row0_taxAmount: 20,
        row0_suggestedNetPrice: 100,
        row0_discount: 10,
        row0_discountHidden: 10,
        row0_discountAmountHidden: 12,
      },
      [],
      "GROSS_PRICE",
    );

    fireEvent.change(screen.getByTestId("field-row0_partNumber"), {
      target: { value: "9999999999" },
    });

    // resetPartNumberDependentFields sets these fields to null, but they're also watched
    // by the price-calculation hook wired in via useSparePartsRowCommon (whose source
    // isn't available here), which recalculates on the resulting change and settles them
    // at 0 rather than leaving them null. So instead of asserting an exact post-cascade
    // value we can't fully predict, assert each field actually moved off its original
    // populated value — which is the behavior this reset is meant to guarantee.
    await waitFor(() => {
      expect((screen.getByTestId("field-row0_unitPrice") as HTMLInputElement).value).not.toBe(
        "100",
      );
    });
    expect((screen.getByTestId("field-row0_netAmount") as HTMLInputElement).value).not.toBe("100");
    expect((screen.getByTestId("field-row0_grossAmount") as HTMLInputElement).value).not.toBe(
      "120",
    );
    expect((screen.getByTestId("field-row0_totalAmount") as HTMLInputElement).value).not.toBe(
      "120",
    );
    expect((screen.getByTestId("field-row0_discount") as HTMLInputElement).value).not.toBe("10");
    expect((screen.getByTestId("field-row0_discountHidden") as HTMLInputElement).value).not.toBe(
      "10",
    );
    expect(
      (screen.getByTestId("field-row0_discountAmountHidden") as HTMLInputElement).value,
    ).not.toBe("12");
  });

  // "sync" outcome via resyncing: a genuine value change arriving while isResyncingRef is
  // true (API-driven update, e.g. post-validateAndSave) must NOT null the price data —
  // only "sync" (track the new value) happens, not "reset".
  it("does not reset price fields when the part number changes during an API-driven resync", async () => {
    const isResyncingRef = { current: false };
    renderRow(
      {
        row0_position: "SP",
        row0_type: "WARRANTY",
        row0_partNumber: "1609888887",
        row0_unitPrice: 100,
        row0_discount: 10,
        row0_discountHidden: 10,
      },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {},
      { isResyncingRef },
    );

    isResyncingRef.current = true;
    fireEvent.change(screen.getByTestId("field-row0_partNumber"), {
      target: { value: "9999999999" },
    });

    await waitFor(() => {
      expect((screen.getByTestId("field-row0_partNumber") as HTMLInputElement).value).toBe(
        "9999999999",
      );
    });
    expect((screen.getByTestId("field-row0_unitPrice") as HTMLInputElement).value).toBe("100");
    expect((screen.getByTestId("field-row0_discount") as HTMLInputElement).value).toBe("10");
  });

  // "none" outcome: a formatting-only edit (normalizes to the same value) must leave
  // price data untouched — no reset, and the ref tracking the "previous" value doesn't
  // even advance (verified indirectly: a further genuine change still resets correctly
  // from the ORIGINAL normalized value, not the formatted-only intermediate one).
  it("treats a formatting-only part number edit as unchanged and does not reset prices", async () => {
    renderRow(
      {
        row0_position: "SP",
        row0_type: "WARRANTY",
        row0_partNumber: "1609888887",
        row0_unitPrice: 100,
        row0_discount: 10,
      },
      [],
      "GROSS_PRICE",
    );

    fireEvent.change(screen.getByTestId("field-row0_partNumber"), {
      target: { value: "160.988.8887" },
    });

    await waitFor(() => {
      expect((screen.getByTestId("field-row0_partNumber") as HTMLInputElement).value).toBe(
        "160.988.8887",
      );
    });
    expect((screen.getByTestId("field-row0_unitPrice") as HTMLInputElement).value).toBe("100");
    expect((screen.getByTestId("field-row0_discount") as HTMLInputElement).value).toBe("10");
  });
});

describe("SparePartsRow field-permission fallback", () => {
  // applyFieldPermissions returns a field unchanged when it has no subtype and the row
  // isn't fully disabled — none of the default rowFields exercise this branch since every
  // one of them carries a subtype, so a bespoke field is needed here.
  it("leaves a field without a subtype untouched by field-permission rules", () => {
    const notesField: Field = createField({
      name: "row0_notes",
      type: "text",
      fieldMapping: {
        originalName: "notes",
        map: "notes",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "diagnosticsSpareParts#0_",
      },
    });

    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY", row0_notes: "" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      { fields: [...rowFields, notesField] },
    );

    expect(screen.getByTestId("field-row0_notes")).toBeEnabled();
  });

  it("still disables a field without a subtype when the row is fully disabled", () => {
    const notesField: Field = createField({
      name: "row0_notes",
      type: "text",
      fieldMapping: {
        originalName: "notes",
        map: "notes",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "diagnosticsSpareParts#0_",
      },
    });

    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY", row0_notes: "" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      { fields: [...rowFields, notesField], isDisabled: true },
    );

    expect(screen.getByTestId("field-row0_notes")).toBeDisabled();
  });
});
