import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Formik } from "formik";
import type Area from "components/generics/Area/GenericArea.types";
import type Field from "components/generics/Field/GenericField.types";
import { DiagnosticsContext, type DiagnosticsContextValue } from "../DiagnosticsContext";
import SparePartsArea from "./SparePartsArea";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("../SparePartsRow/SparePartsRow", () => ({
  default: () => <div data-testid="spare-parts-row" />,
}));

const createField = (name: string): Field =>
  ({
    name,
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
  }) as Field;

const createArea = (name: string): Area => ({
  name,
  label: "diagnosticsSpareParts",
  position: 0,
  fields: [createField(`${name}#0_position`)],
  dependFieldCondition: "AND",
  dependentFields: [],
  actions: null,
  isSubArea: true,
  isMultiple: true,
});

const createDiagnosticsContextValue = (
  overrides: Partial<DiagnosticsContextValue>,
): DiagnosticsContextValue => ({
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
  hasPricesPopulated: false,
  markAllValidated: vi.fn(),
  markRowDirty: vi.fn(),
  summaryTypeOptions: [{ value: "totalSummary", label: "totalSummary" }],
  setSummaryTypeOptions: vi.fn(),
  setRevisedRowPending: vi.fn(),
  isArchivedExpanded: false,
  setIsArchivedExpanded: vi.fn(),
  canArchiveOnDelete: false,
  resyncMaterialsFromAPI: vi.fn(),
  jobStatus: "IN_DIAGNOSTICS",
  discountBase: "GROSS_PRICE",
  automaticRows: [],
  ...overrides,
});

const renderArea = (area: Area, contextValue: DiagnosticsContextValue) =>
  render(
    <Formik initialValues={{}} onSubmit={vi.fn()}>
      <DiagnosticsContext.Provider value={contextValue}>
        <SparePartsArea area={area} />
      </DiagnosticsContext.Provider>
    </Formik>,
  );

describe("SparePartsArea", () => {
  it("renders title and empty-state message for diagnosticsSpareParts when API responded with empty materials", () => {
    const area = createArea("diagnosticData_diagnosticsSpareParts#0");

    renderArea(
      area,
      createDiagnosticsContextValue({
        apiMaterialsLoaded: true,
        apiMaterialsEmpty: true,
        materials: [
          {
            position: "SP",
            partNumber: "123",
            description: "Generated row",
            type: "CHARGEABLE",
            quantity: 1,
            unitPrice: 10,
            netAmount: 10,
            tax: 10,
            grossAmount: 11,
            discount: 0,
            taxAmount: 1,
            totalAmount: 11,
          },
        ],
      }),
    );

    expect(screen.getByText("diagnosticsSpareParts")).toBeInTheDocument();
    expect(screen.getByText("diagnosticsNoItemsToShow")).toBeInTheDocument();
    expect(screen.queryByTestId("spare-parts-row")).not.toBeInTheDocument();
  });

  it("renders diagnosticsSpareParts row when API responded with materials", () => {
    const area = createArea("diagnosticData_diagnosticsSpareParts#0");

    renderArea(
      area,
      createDiagnosticsContextValue({
        apiMaterialsLoaded: true,
        apiMaterialsEmpty: false,
        materials: [
          {
            position: "SP",
            partNumber: "123",
            description: "Material",
            type: "CHARGEABLE",
            quantity: 1,
            unitPrice: 10,
            netAmount: 10,
            tax: 10,
            grossAmount: 11,
            discount: 0,
            taxAmount: 1,
            totalAmount: 11,
          },
        ],
      }),
    );

    expect(screen.getByTestId("spare-parts-row")).toBeInTheDocument();
  });

  it("renders claimSpareParts row when API responded with empty materials", () => {
    const area = createArea("claims_claimSpareParts#0");

    renderArea(
      area,
      createDiagnosticsContextValue({
        apiMaterialsLoaded: true,
        apiMaterialsEmpty: true,
        materials: [],
      }),
    );

    expect(screen.getByTestId("spare-parts-row")).toBeInTheDocument();
  });

  it("renders diagnosticsSpareParts row for new diagnostics even when API materials are empty", () => {
    const area = createArea("diagnosticData_diagnosticsSpareParts#0");

    renderArea(
      area,
      createDiagnosticsContextValue({
        apiMaterialsLoaded: true,
        apiMaterialsEmpty: true,
        hasExistingDiagnostic: false,
        materials: [],
      }),
    );

    expect(screen.getByTestId("spare-parts-row")).toBeInTheDocument();
    expect(screen.queryByText("diagnosticsNoItemsToShow")).not.toBeInTheDocument();
  });
});
