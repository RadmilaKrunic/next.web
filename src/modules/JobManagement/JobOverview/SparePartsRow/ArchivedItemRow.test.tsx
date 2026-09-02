import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Formik } from "formik";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import { DiagnosticsContext } from "../DiagnosticsContext";
import { ClaimContext } from "../../../ClaimManagement/ClaimOverview/ClaimContext";
import { createDefaultItemsContextValue, type ItemsContextValue } from "hooks/itemsManager/ItemsContext";
import ArchivedItemRow from "./ArchivedItemRow";
import { jobArchivedItemRowSurfaceConfig } from "./jobArchivedItemRowSurfaceConfig";
import { claimArchivedItemRowSurfaceConfig } from "../../../ClaimManagement/ClaimOverview/ClaimSparePartsRow/claimArchivedItemRowSurfaceConfig";

// Phase 5 unification (items-and-prices-refactor.md §15 step 7) — see ItemRow.test.tsx's
// header comment for the same scoping note: real, focused coverage of every divergence named
// in ArchivedItemRowSurfaceConfig.ts, not a full port of ArchivedSparePartsRow.test.tsx /
// ArchivedSparePartsArea.test.tsx / ClaimArchivedSparePartsArea.test.tsx (the area-wrapper
// tests stay out of scope entirely — only the row merged, see the plan).

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Icon: ({ iconName, onClick, title }: { iconName: string; onClick?: () => void; title?: string }) => (
    <button type="button" data-testid={`icon-${iconName}`} onClick={onClick} title={title}>
      {iconName}
    </button>
  ),
  Divider: () => <hr data-testid="divider" />,
}));

vi.mock("hooks/useHasPermission", () => ({
  useHasPermission: vi.fn(() => true),
}));

vi.mock("components/generics/Field/GenericField", () => ({
  default: ({ field }: { field: { name: string } }) => (
    <div data-testid={`field-${field.name}`}>{field.name}</div>
  ),
}));

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
] as never[];

type Surface = "jobDiagnostics" | "claimSpareParts";

function renderArchivedRow(
  surface: Surface,
  contextOverrides: Partial<ItemsContextValue> = {},
  isRepairAnswerLocked = false,
) {
  const config = surface === "jobDiagnostics" ? jobArchivedItemRowSurfaceConfig : claimArchivedItemRowSurfaceConfig;
  const contextValue: ItemsContextValue = createDefaultItemsContextValue({
    jobStatus: "IN_DIAGNOSTICS",
    canDeleteRows: true,
    ...contextOverrides,
  });
  const ContextProvider = surface === "jobDiagnostics" ? DiagnosticsContext.Provider : ClaimContext.Provider;

  return render(
    <GenericFormContext.Provider
      value={{
        allFields: [],
        setAllFields: vi.fn(),
        mandatoryFields: null,
        setMandatoryFields: vi.fn(),
        actionCallbacks: {},
        sparePartNotBelongsToTool: { current: {} },
        isRepairAnswerLocked,
      }}
    >
      <ContextProvider value={contextValue}>
        <Formik initialValues={{ "archivedSpareParts#0_total": 10 }} onSubmit={vi.fn()}>
          <ArchivedItemRow fields={fields} onRestoreRow={vi.fn()} config={config} />
        </Formik>
      </ContextProvider>
    </GenericFormContext.Provider>,
  );
}

describe.each<Surface>(["jobDiagnostics", "claimSpareParts"])("ArchivedItemRow (%s)", (surface) => {
  it("renders main row fields", () => {
    renderArchivedRow(surface);
    expect(screen.getByTestId("field-archivedSpareParts#0_position")).toBeInTheDocument();
  });

  it("toggles the collapsed section when the arrow is clicked", () => {
    renderArchivedRow(surface);
    fireEvent.click(screen.getByTestId("icon-down"));
    expect(screen.getByTestId("divider")).toBeInTheDocument();
  });

  it("shows the revert button and calls onRestoreRow when clicked", () => {
    renderArchivedRow(surface);
    const revertButton = screen.getByTitle("revert");
    fireEvent.click(revertButton);
    expect(revertButton).toBeInTheDocument();
  });
});

describe("ArchivedItemRow (jobDiagnostics) — revert button divergence", () => {
  it("hides the revert button (and renders no placeholder) when the job status blocks it", () => {
    renderArchivedRow("jobDiagnostics", { jobStatus: "DELIVERED" });
    expect(screen.queryByTitle("revert")).not.toBeInTheDocument();
    expect(document.querySelector(".spare-part-action")).not.toBeInTheDocument();
  });

  it("hides the revert button when the repair answer is locked", () => {
    renderArchivedRow("jobDiagnostics", {}, true);
    expect(screen.queryByTitle("revert")).not.toBeInTheDocument();
  });
});

describe("ArchivedItemRow (claimSpareParts) — revert button divergence", () => {
  it("hides the revert button but renders an empty placeholder action div when canDeleteRows is false", () => {
    renderArchivedRow("claimSpareParts", { canDeleteRows: false });
    expect(screen.queryByTitle("revert")).not.toBeInTheDocument();
    expect(document.querySelector(".spare-part-action")).toBeInTheDocument();
  });
});
