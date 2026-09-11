import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type Area from "components/generics/Area/GenericArea.types";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import ArchivedSparePartsArea from "./ArchivedSparePartsArea";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Icon: ({ iconName, onClick }: { iconName: string; onClick?: (e: React.MouseEvent) => void }) => (
    <button type="button" aria-label={`icon-${iconName}`} onClick={onClick}>
      {iconName}
    </button>
  ),
}));

const diagnosticsCtx = {
  onDeleteRow: vi.fn(),
  isArchivedExpanded: false,
  setIsArchivedExpanded: vi.fn(),
  onRestoreRow: vi.fn(),
};

vi.mock("../DiagnosticsContext", () => ({
  useDiagnosticsContext: () => diagnosticsCtx,
}));

vi.mock("../ArchivedSparePartsRow/ArchivedSparePartsRow", () => ({
  default: ({
    fields,
    onRestoreRow,
  }: {
    fields: Array<{ options?: Array<{ value: string; name: string }> }>;
    onRestoreRow: () => void;
  }) => (
    <div>
      <span>archived-row</span>
      <span>options-count:{fields[0]?.options?.length ?? 0}</span>
      <button type="button" onClick={onRestoreRow}>
        restore-row
      </button>
    </div>
  ),
}));

const area: Area = {
  name: "diagnosticData_archivedSpareParts#0",
  label: "archivedSpareParts",
  position: 0,
  fields: [
    {
      name: "diagnosticData_archivedSpareParts#0_position",
      label: "position",
      type: "dropdown",
      subtype: "archivedPosition",
    } as never,
  ],
  dependFieldCondition: "AND",
  dependentFields: [],
  actions: null,
  isSubArea: false,
};

const renderWithContext = (
  allFields?: Array<{ name: string; options?: Array<{ value: string; name: string }> }>,
) =>
  render(
    <GenericFormContext.Provider
      value={{
        allFields: allFields as never,
        setAllFields: vi.fn(),
        mandatoryFields: null,
        setMandatoryFields: vi.fn(),
        actionCallbacks: {},
      }}
    >
      <ArchivedSparePartsArea area={area} />
    </GenericFormContext.Provider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  diagnosticsCtx.isArchivedExpanded = false;
});

describe("ArchivedSparePartsArea", () => {
  it("renders archived area header for first area", () => {
    renderWithContext();

    expect(screen.getByText("archivedSpareParts")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "icon-down" })).toBeInTheDocument();
  });

  it("toggles expanded state from header click", () => {
    renderWithContext();

    fireEvent.click(screen.getByRole("button", { name: /archivedSpareParts/i }));

    expect(diagnosticsCtx.setIsArchivedExpanded).toHaveBeenCalledTimes(1);
  });

  it("deletes archived row from delete icon click", () => {
    renderWithContext();

    fireEvent.click(screen.getByRole("button", { name: "icon-delete" }));

    expect(diagnosticsCtx.onDeleteRow).toHaveBeenCalledWith("diagnosticData_archivedSpareParts#0");
  });

  it("renders row and enriches archived position options when expanded", () => {
    diagnosticsCtx.isArchivedExpanded = true;

    renderWithContext([
      {
        name: "diagnosticData_archivedSpareParts#0_position",
        options: [{ value: "SP", name: "SP" }],
      },
    ]);

    expect(screen.getByText("archived-row")).toBeInTheDocument();
    expect(screen.getByText("options-count:1")).toBeInTheDocument();
  });
});
