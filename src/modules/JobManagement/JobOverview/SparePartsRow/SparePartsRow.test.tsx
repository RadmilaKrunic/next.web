import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Formik, useFormikContext } from "formik";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import { DiagnosticsContext, type DiagnosticsContextValue } from "../DiagnosticsContext";
import SparePartsRow from "./SparePartsRow";
import type Field from "components/generics/Field/GenericField.types";

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
  useHasPermission: () => true,
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
        onChange={(e) => {
          void setFieldValue(field.name, e.target.value);
        }}
      />
    );
  },
}));

const createField = (overrides: Partial<Field>): Field =>
  ({
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
  }) as Field;

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
];

const renderRow = (
  initialValues: Record<string, unknown>,
  summaryFields: Field[],
  discountBase: DiagnosticsContextValue["discountBase"] = "GROSS_PRICE",
  sparePartBelongsToTool: Record<string, boolean> = {},
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(["user"], { permissions: ["ALL"] });

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
    setRevisedRowPending: vi.fn(),
    isArchivedExpanded: false,
    setIsArchivedExpanded: vi.fn(),
    canArchiveOnDelete: false,
    resyncMaterialsFromAPI: vi.fn(),
    jobStatus: "IN_DIAGNOSTICS",
    discountBase,
    automaticRows: [],
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <GenericFormContext.Provider
        value={{
          allFields: [...summaryFields, ...rowFields],
          setAllFields: vi.fn(),
          mandatoryFields: null,
          setMandatoryFields: vi.fn(),
          actionCallbacks: {},
          sparePartBelongsToTool: { current: sparePartBelongsToTool },
        }}
      >
        <DiagnosticsContext.Provider value={diagnosticsContextValue}>
          <Formik initialValues={initialValues} onSubmit={vi.fn()}>
            <SparePartsRow fields={rowFields} />
          </Formik>
        </DiagnosticsContext.Provider>
      </GenericFormContext.Provider>
    </QueryClientProvider>,
  );
};

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
      expect((screen.getByTestId("field-row0_discount") as HTMLInputElement).value).toBe("17.5");
      expect((screen.getByTestId("field-row0_totalAmount") as HTMLInputElement).value).toBe("198");
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
      expect((screen.getByTestId("field-row0_discount") as HTMLInputElement).value).toBe("17.5");
      expect((screen.getByTestId("field-row0_totalAmount") as HTMLInputElement).value).toBe("198");
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
      { row0_partNumber: false },
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
      { row0_partNumber: true },
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
});
