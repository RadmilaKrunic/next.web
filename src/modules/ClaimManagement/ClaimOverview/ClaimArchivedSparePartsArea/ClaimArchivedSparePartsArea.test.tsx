import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Formik } from "formik";
import Field from "components/generics/Field/GenericField.types";
import Area from "components/generics/Area/GenericArea.types";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("hooks/useHasPermission", () => ({
  useHasPermission: vi.fn(() => true),
}));

vi.mock("components/generics/Field/GenericField", () => ({
  default: ({ field }: { field: Field }) => <div data-testid={`field-${field.name}`} />,
}));

const mockUseClaimContext = vi.fn();
vi.mock("../ClaimContext", () => ({
  useClaimContext: () => mockUseClaimContext(),
}));

import { useHasPermission } from "hooks/useHasPermission";
import ClaimArchivedSparePartsArea from "./ClaimArchivedSparePartsArea";

const mockUseHasPermission = vi.mocked(useHasPermission);

const buildField = (overrides: Partial<Field> = {}): Field => ({
  name: "assetData#0_price",
  label: "Price",
  type: "price",
  fieldMapping: { originalName: "price" },
  ...overrides,
});

const buildArea = (overrides: Partial<Area> = {}): Area => ({
  name: "assetData#0_archivedSpareParts",
  label: "archivedSpareParts",
  position: 0,
  fields: [
    buildField({
      name: "assetData#0_position",
      type: "text",
      fieldMapping: { originalName: "position" },
    }),
  ],
  dependFieldCondition: "AND",
  dependentFields: [],
  actions: null,
  isSubArea: true,
  ...overrides,
});

function renderComponent(
  area: Area,
  claimContextOverrides: Partial<ReturnType<typeof mockUseClaimContext>> = {},
  formValues: Record<string, unknown> = {},
) {
  mockUseClaimContext.mockReturnValue({
    isArchivedExpanded: true,
    setIsArchivedExpanded: vi.fn(),
    onDeleteArchivedRow: vi.fn(),
    onRestoreRow: vi.fn(),
    canDeleteRows: true,
    ...claimContextOverrides,
  });

  return render(
    <Formik initialValues={formValues} onSubmit={() => {}}>
      <GenericFormContext.Provider
        value={{
          allFields: [],
          setAllFields: vi.fn(),
          mandatoryFields: null,
          setMandatoryFields: vi.fn(),
          actionCallbacks: {},
        }}
      >
        <ClaimArchivedSparePartsArea area={area} />
      </GenericFormContext.Provider>
    </Formik>,
  );
}

describe("ClaimArchivedSparePartsArea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseHasPermission.mockReturnValue(true);
  });

  it("renders the header and row for the first archived area", () => {
    renderComponent(buildArea());
    expect(screen.getByText("archivedSpareParts")).toBeInTheDocument();
    expect(screen.getByTestId("field-assetData#0_position")).toBeInTheDocument();
  });

  it("does not render header for non-first areas", () => {
    const area = buildArea({
      name: "assetData#1_archivedSpareParts",
      fields: [buildField({ name: "assetData#1_position", type: "text" })],
    });
    renderComponent(area);
    expect(screen.queryByText("archivedSpareParts")).not.toBeInTheDocument();
  });

  it("does not render the row when isArchivedExpanded is false", () => {
    renderComponent(buildArea(), { isArchivedExpanded: false });
    expect(screen.queryByTestId("field-assetData#0_position")).not.toBeInTheDocument();
  });

  it("calls onDeleteArchivedRow when the delete icon is clicked", () => {
    const onDeleteArchivedRow = vi.fn();
    renderComponent(buildArea(), { onDeleteArchivedRow });
    fireEvent.click(screen.getByTitle("delete"));
    expect(onDeleteArchivedRow).toHaveBeenCalledWith("assetData#0_archivedSpareParts");
  });

  it("toggles isArchivedExpanded when header button is clicked", () => {
    const setIsArchivedExpanded = vi.fn();
    renderComponent(buildArea(), { setIsArchivedExpanded });
    fireEvent.click(screen.getByRole("button", { name: "archivedSpareParts" }));
    expect(setIsArchivedExpanded).toHaveBeenCalled();
  });

  it("renders the revert icon when canDeleteRows is true and calls onRestoreRow", () => {
    const onRestoreRow = vi.fn();
    renderComponent(buildArea(), { canDeleteRows: true, onRestoreRow });
    fireEvent.click(screen.getByTitle("revert"));
    expect(onRestoreRow).toHaveBeenCalledWith("assetData#0_archivedSpareParts");
  });

  it("does not render the revert icon when canDeleteRows is false", () => {
    renderComponent(buildArea(), { canDeleteRows: false });
    expect(screen.queryByTitle("revert")).not.toBeInTheDocument();
  });

  it("shows the collapse arrow only when user has price view permission", () => {
    mockUseHasPermission.mockReturnValue(false);
    renderComponent(buildArea());
    expect(screen.queryByTitle("up")).not.toBeInTheDocument();
  });
});
