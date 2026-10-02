import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import ClaimOverview from "./ClaimOverview";
import { MessagesContext } from "contexts/messagescontext";
import { scrollToTop } from "utils/scrollToError";
import type Section from "components/generics/Section/GenericSection.types";
import type Area from "components/generics/Area/GenericArea.types";
import type Field from "components/generics/Field/GenericField.types";

type AnyFn = (...args: unknown[]) => unknown;

interface ClaimCtxLike {
  markRowDirty: AnyFn;
  onAddRow: AnyFn;
  onAddMaterials: AnyFn;
  onDeleteRow: AnyFn;
  onDeleteArchivedRow: AnyFn;
  onRestoreRow: AnyFn;
  setSummaryTypeOptions: AnyFn;
  arePricesValidated: boolean;
  isArchivedExpanded: boolean;
  canDeleteRows: boolean;
  isClaimPending: boolean;
  hasPricesPopulated: boolean;
}

interface ManagerArgs {
  claimMaterials?: unknown;
  claimArchivedMaterials?: unknown;
  readOnly: boolean;
  currentActionType: string;
  currentJobType: string;
  skipFormResetRef: { current: boolean };
}

interface DiagArgs {
  diagnosticData?: unknown;
  readOnly: boolean;
}

interface ClaimPayload {
  materials: Array<Record<string, unknown>>;
  claimPriceSummary: Record<string, number>;
  archivedMaterials: unknown[];
  [key: string]: unknown;
}

interface Captured {
  claimCtx: ClaimCtxLike | null;
  formCtx: {
    actionCallbacks: Record<string, AnyFn>;
    setAllFields: AnyFn;
    radioSourceCallbacks: Record<string, AnyFn>;
    sparePartNotBelongsToTool: { current: Record<string, boolean> };
    onDeleteStart: () => void;
    onDeleteEnd: () => void;
  } | null;
  diagCtx: Record<string, unknown> | null;
}

const h = vi.hoisted(() => {
  const state = {
    params: { claimId: "C-1" } as Record<string, string | undefined>,
    user: { countryCode: "ZA", permissions: [] } as Record<string, unknown> | undefined,
    claimForm: null as unknown,
    claimCache: { jobId: "J-1" } as Record<string, unknown> | undefined,
    formInit: {
      initialFormValues: {} as Record<string, unknown>,
      setInitialFormValues: vi.fn(),
      allFields: [] as unknown[] | null,
      setAllFields: vi.fn(),
      mandatoryFields: null as unknown,
      tabs: [] as unknown[],
      setTabs: vi.fn(),
    },
    manager: {} as Record<string, unknown>,
    managerCalls: [] as ManagerArgs[],
    diagCalls: [] as DiagArgs[],
    sectionEditing: {
      editingSections: new Set<string>(),
      setEditingSections: vi.fn(),
    },
    allActionsDisabled: false,
    mutation: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false },
    mutationOptions: null as Record<string, AnyFn> | null,
    updatePrices: { mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false },
    requestApproval: { mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false },
    trackNoteAdded: vi.fn(),
    setMessages: vi.fn(),
    actionDependencyCalls: [] as Array<{ actions: unknown; ctx: Record<string, unknown> }>,
    captured: { claimCtx: null, formCtx: null, diagCtx: null } as Captured,
    formik: null as null | { values: Record<string, unknown> },
    mapped: {} as Record<string, unknown>,
  };
  return state;
});

const useClaimByIdMock = vi.hoisted(() => vi.fn());
const invalidateQueriesMock = vi.hoisted(() => vi.fn());

vi.mock("@bosch/react-frok", () => ({
  TabNavigation: ({
    children,
    selectedValue,
    onTabSelect,
  }: {
    children: ReactNode;
    selectedValue?: string;
    onTabSelect: (e: unknown, data: { value: string }) => void;
  }) => (
    <div data-testid="tab-nav" data-selected={selectedValue}>
      {children}
      <button type="button" onClick={() => onTabSelect(null, { value: "notes" })}>
        select-notes-tab
      </button>
    </div>
  ),
  Tab: ({ children, value }: { children: ReactNode; value: string }) => (
    <span data-testid={`tab-${value}`}>{children}</span>
  ),
}));

vi.mock("react-router-dom", () => ({
  useParams: () => h.params,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/analytics", () => ({
  useAnalytics: () => ({ trackNoteAdded: h.trackNoteAdded }),
  toClaimStatus: (status: string) => `status:${status}`,
  NoteContext: { CLAIM: "CLAIM" },
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    getQueryData: (key: unknown[]) => {
      if (key[0] === "user") return h.user;
      if (key[0] === "UIConfiguration") {
        return h.claimForm ? { forms: [h.claimForm] } : { forms: [] };
      }
      if (key[0] === "claim") return h.claimCache;
      return undefined;
    },
    invalidateQueries: invalidateQueriesMock,
  }),
  useMutation: (options: Record<string, AnyFn>) => {
    h.mutationOptions = options;
    return h.mutation;
  },
}));

vi.mock("utils/scrollToError", () => ({ scrollToTop: vi.fn() }));
vi.mock("hooks/useBreadcrumbs", () => ({ useBreadcrumbs: vi.fn() }));
vi.mock("hooks/useFormInitialization", () => ({
  useFormInitialization: () => h.formInit,
}));
vi.mock("hooks/useActionWithValidation", () => ({
  useActionWithValidation: () => async (_a: string, _b: unknown, _c: unknown, onValid: AnyFn) =>
    onValid(),
}));
vi.mock("hooks/useSectionEditing", () => ({
  useSectionEditing: () => h.sectionEditing,
}));
vi.mock("hooks/useClaimDecisionPermissions", () => ({
  useClaimDecisionPermissions: () => ({ canChangeClaimDecision: true }),
}));
vi.mock("hooks/useDiagnosticsManager", () => ({
  useDiagnosticsManager: (args: DiagArgs) => {
    h.diagCalls.push(args);
  },
}));
vi.mock("hooks/useClaimMaterialsManager", () => ({
  useClaimMaterialsManager: (args: ManagerArgs) => {
    h.managerCalls.push(args);
    return h.manager;
  },
}));
vi.mock("components/generics/Form/useFormValidation", () => ({
  useFormValidation: () => ({
    validate: vi.fn(),
    validateByAction: vi.fn(),
    startValidation: vi.fn(),
    stopValidation: vi.fn(),
    setCurrentAction: vi.fn(),
  }),
}));
vi.mock("components/generics/utils", () => ({
  convertAPIDataToFormValues: vi.fn(() => ({ ...h.mapped })),
  setSectionDisabledState: vi.fn((section: Section, disabled?: boolean) => {
    if (disabled === undefined) return { ...section, isDisabled: "auto" };
    return {
      ...section,
      isDisabled: disabled,
      areas: section.areas.map((area) => ({
        ...area,
        isDisabled: disabled,
        fields: area.fields.map((field) => ({ ...field, isDisabled: disabled })),
      })),
    };
  }),
}));
vi.mock("components/generics/Action/actionDependency", () => ({
  areAllActionsDisabled: (actions: unknown, ctx: Record<string, unknown>) => {
    h.actionDependencyCalls.push({ actions, ctx });
    return h.allActionsDisabled;
  },
}));
vi.mock("components/generics/Section/GenericSection", () => ({
  default: function SectionProbe({
    section,
    onEdit,
    currentMode,
    currentStatus,
  }: {
    section: Section;
    onEdit?: () => void;
    currentMode?: string;
    currentStatus?: string;
  }) {
    return (
      <div
        data-testid={`section-${section.name}`}
        data-disabled={String(section.isDisabled)}
        data-mode={currentMode}
        data-status={currentStatus}
        data-editable={String(Boolean(onEdit))}
        data-areas={section.areas.map((a) => `${a.name}:${String(a.isDisabled)}`).join("|")}
        data-fields-disabled={section.areas
          .flatMap((a) => a.fields.map((f) => `${f.name}:${String(f.isDisabled)}`))
          .join("|")}
      >
        {onEdit && (
          <button type="button" onClick={onEdit}>
            edit-{section.name}
          </button>
        )}
      </div>
    );
  },
}));
vi.mock("components/generics/Action/GenericAction", async () => {
  const { useContext } = await import("react");
  const { useFormikContext } = await import("formik");
  const { ClaimContext } = await import("./ClaimContext");
  const { GenericFormContext } = await import("components/generics/Form/GenericForm.context");
  const { DiagnosticsContext } =
    await import("modules/JobManagement/JobOverview/DiagnosticsContext");
  return {
    default: function ActionProbe({
      actions,
      onActionClick,
      currentMode,
      isGloballyDisabled,
    }: {
      actions: Array<{ name?: string; onAction?: string }>;
      onActionClick: (action: string | undefined) => void;
      currentMode?: string;
      isGloballyDisabled?: boolean;
    }) {
      const formik = useFormikContext<Record<string, unknown>>();
      h.formik = formik;
      h.captured.claimCtx = useContext(ClaimContext) as unknown as ClaimCtxLike;
      h.captured.formCtx = useContext(GenericFormContext) as unknown as Captured["formCtx"];
      h.captured.diagCtx = useContext(DiagnosticsContext) as unknown as Record<string, unknown>;
      return (
        <div
          data-testid="generic-action"
          data-mode={currentMode}
          data-disabled={String(Boolean(isGloballyDisabled))}
        >
          <span data-testid="form-note">{String(formik.values.note ?? "")}</span>
          <span data-testid="form-discount-base">{String(formik.values.discountBase ?? "")}</span>
          {actions.map((action) => (
            <button key={action.name} type="button" onClick={() => onActionClick(action.onAction)}>
              {action.name}
            </button>
          ))}
        </div>
      );
    },
  };
});
vi.mock("./ClaimOverviewHeader/ClaimOverviewHeader", () => ({
  default: () => <div>claim-overview-header</div>,
}));
vi.mock("./ClaimNoteModal/ClaimNoteModal", () => ({
  default: ({
    action,
    claimId,
    jobId,
    isOpen,
    setIsOpen,
  }: {
    action: string;
    claimId?: string;
    jobId: string;
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
  }) => (
    <div
      data-testid="claim-note-modal"
      data-action={action}
      data-claim={claimId}
      data-job={jobId}
      data-open={String(isOpen)}
    >
      <button type="button" onClick={() => setIsOpen(false)}>
        close-note-modal
      </button>
    </div>
  ),
}));
vi.mock(
  "modules/JobManagement/JobOverview/AddSpecialMaterialModal/AddSpecialMaterialModal",
  () => ({
    default: ({
      isOpen,
      existingPartNumbers,
      onAddMaterials,
      jobId,
    }: {
      isOpen: boolean;
      existingPartNumbers: Set<string>;
      onAddMaterials: (items: Array<{ partNumber: string }>) => void;
      jobId: string;
    }) => (
      <div
        data-testid="special-material-modal"
        data-open={String(isOpen)}
        data-job={jobId}
        data-existing={Array.from(existingPartNumbers).join(",")}
      >
        <button type="button" onClick={() => onAddMaterials([{ partNumber: "S1" }])}>
          submit-special
        </button>
      </div>
    ),
  }),
);
vi.mock("modules/JobManagement/JobOverview/ExplosionDiagram/ExplosionDrawingModal", () => ({
  default: ({
    onSubmitParts,
    setIsOpen,
    existingMaterials,
  }: {
    onSubmitParts: (parts: Array<Record<string, unknown>>) => void;
    setIsOpen: (value: boolean) => void;
    existingMaterials: unknown[];
  }) => (
    <div data-testid="explosion-modal" data-existing={existingMaterials.length}>
      <button
        type="button"
        onClick={() =>
          onSubmitParts([
            { partNumber: "E1", partName: "Part one", quantity: 2 },
            { partNumber: "", partName: "Skipped", quantity: 1 },
          ])
        }
      >
        submit-explosion
      </button>
      <button type="button" onClick={() => setIsOpen(false)}>
        close-explosion
      </button>
    </div>
  ),
}));
vi.mock("../../../components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay", () => ({
  default: () => <div>loading-indicator</div>,
}));
vi.mock("api/services/claims/hooks", () => ({
  useClaimById: useClaimByIdMock,
  useUpdateClaimPrices: () => h.updatePrices,
  useClaimRequestApproval: () => h.requestApproval,
}));
vi.mock("api/services/jobs/action", () => ({ postMessage: vi.fn() }));

const CS = (i: number) => `claims_claimSpareParts#${i}`;

const field = (name: string, subtype?: string): Field => ({
  name,
  label: name,
  type: "text",
  subtype,
});

const spareFields = (i: number): Field[] => [
  field(`${CS(i)}_position`, "diagnosticPosition"),
  field(`${CS(i)}_partNumber`, "diagnosticPartNumber"),
  field(`${CS(i)}_description`, "diagnosticDescription"),
  field(`${CS(i)}_type`, "diagnosticType"),
  field(`${CS(i)}_quantity`, "diagnosticQuantity"),
  field(`${CS(i)}_order`, "diagnosticOrder"),
  field(`${CS(i)}_unitPrice`, "diagnosticUnitPrice"),
  field(`${CS(i)}_suggestedNetPrice`, "diagnosticSuggestedNetPrice"),
  field(`${CS(i)}_netAmount`, "diagnosticNetAmount"),
  field(`${CS(i)}_tax`, "diagnosticTax"),
  field(`${CS(i)}_taxAmount`, "diagnosticTaxAmount"),
  field(`${CS(i)}_grossAmount`, "diagnosticGrossAmount"),
  field(`${CS(i)}_totalAmount`, "diagnosticTotalAmount"),
];

const area = (name: string, fields: Field[], extra: Partial<Area> = {}): Area => ({
  name,
  label: name,
  position: 1,
  fields,
  dependFieldCondition: "AND",
  dependentFields: [],
  actions: null,
  isSubArea: false,
  ...extra,
});

const section = (
  name: string,
  label: string,
  areas: Area[],
  position: number,
  extra: Partial<Section> = {},
): Section => ({
  name,
  isHidden: false,
  label,
  dependFieldCondition: "AND",
  position,
  areas,
  actions: null,
  isSubSection: false,
  isAccordion: false,
  isTab: true,
  ...extra,
});

const buildTabs = (): Section[] => [
  section(
    "claims",
    "claimDetails",
    [
      area("claimData", [field("claimDataField")]),
      area("claimDiagnosticsSummary", [field("summaryField")]),
      area(CS(0), spareFields(0), { isMultiple: true, index: 0 }),
      area(CS(1), spareFields(1), { isMultiple: true, index: 1 }),
      area("claims_claimArchivedSpareParts#0", [field("archivedPart", "archivedPartNumber")], {
        isMultiple: true,
        index: 0,
      }),
    ],
    1,
  ),
  section("notes", "notes", [], 2, {
    actions: [{ name: "Save note", mode: "primary", onAction: "onSaveNewNote" }] as never,
  }),
  section("history", "history", [], 3, { hiddenForStatuses: ["OPEN"] }),
];

const allFieldsOf = (tabs: Section[]) => tabs.flatMap((tab) => tab.areas.flatMap((a) => a.fields));

const ACTION_NAMES = [
  "onSaveNewNote",
  "onCancelNewNote",
  "onRevise",
  "onReject",
  "onApprove",
  "onEditClaim",
  "onAddRow",
  "onAddSpecialMaterials",
  "onProductDetails",
  "onValidate",
  "onRequestApproval",
];

const makeClaim = (overrides: Record<string, unknown> = {}) => ({
  id: "C-1",
  jobId: "J-1",
  ascId: "ASC-1",
  customerId: "CUS-1",
  ascName: "ASC name",
  diagnosticId: "DIAG-1",
  countryCode: "ZA",
  actionType: "REPAIR",
  jobType: "WARRANTY",
  typeOfUsage: "usage",
  faultCode: "F1",
  faultCodeDescription: "fault",
  faultCodeLabourQuantity: 1,
  exchangeReason: "",
  claimStatus: "OPEN",
  claimNotes: [],
  customer: { name: "Customer" },
  job: { id: "J-1" },
  materials: [{ id: "m0", position: "SP", price: { tax: 3, discount: 7 }, order: 5 }],
  archivedMaterials: [],
  jobDiagnostic: { jobId: "J-1" },
  ...overrides,
});

const makeManager = (overrides: Record<string, unknown> = {}) => ({
  materials: [],
  setMaterials: vi.fn(),
  archivedMaterials: [],
  positionDropdownOptions: [],
  allowedPositions: [],
  automaticRows: [],
  addSpecialMaterialsAllowed: false,
  markAllValidated: vi.fn(),
  markRowDirty: vi.fn(),
  discountBase: "NET_PRICE",
  onAddRow: vi.fn(),
  onDeleteRow: vi.fn(),
  onDeleteArchivedRow: vi.fn(),
  onRestoreRow: vi.fn(),
  onAddMaterials: vi.fn(),
  getExistingPartNumbers: vi.fn(() => new Set<string>()),
  forceRebuildRef: { current: false },
  hasSyncedRef: { current: true },
  ...overrides,
});

const useTabs = (tabs: Section[] = buildTabs()) => {
  h.formInit.tabs = tabs;
  h.formInit.allFields = allFieldsOf(tabs);
  return tabs;
};

const resetState = () => {
  h.params = { claimId: "C-1" };
  h.user = { countryCode: "ZA", permissions: [] };
  h.claimForm = {
    name: "ClaimOverview",
    actions: [
      ...ACTION_NAMES.map((onAction) => ({ name: onAction, onAction })),
      { name: "unknown-action", onAction: "doesNotExist" },
      { name: "no-action" },
    ],
    sections: [],
  };
  h.claimCache = { jobId: "J-1" };
  h.formInit.initialFormValues = {};
  h.formInit.allFields = [];
  h.formInit.tabs = [];
  h.formInit.mandatoryFields = null;
  h.manager = makeManager();
  h.managerCalls.length = 0;
  h.diagCalls.length = 0;
  h.sectionEditing.editingSections = new Set<string>();
  h.allActionsDisabled = false;
  h.mutationOptions = null;
  h.updatePrices.mutateAsync.mockReset();
  h.updatePrices.mutateAsync.mockResolvedValue(undefined);
  h.requestApproval.mutateAsync.mockReset();
  h.requestApproval.mutateAsync.mockResolvedValue(undefined);
  h.actionDependencyCalls.length = 0;
  h.captured.claimCtx = null;
  h.captured.formCtx = null;
  h.captured.diagCtx = null;
  h.formik = null;
  h.mapped = {};
  useClaimByIdMock.mockReturnValue({ data: makeClaim(), isLoading: false, error: null });
  globalThis.location.hash = "";
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <MessagesContext.Provider value={{ messages: [], setMessages: h.setMessages as never }}>
    {children}
  </MessagesContext.Provider>
);

const renderClaim = () => render(<ClaimOverview />, { wrapper });

const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const attr = (testId: string, name: string) => screen.getByTestId(testId).getAttribute(name) ?? "";

const messages = (): Array<{ text: string; type: string }> => {
  let current: Array<{ text: string; type: string }> = [];
  for (const call of h.setMessages.mock.calls) {
    const update = call[0] as
      | Array<{ text: string; type: string }>
      | ((prev: Array<{ text: string; type: string }>) => Array<{ text: string; type: string }>);
    current = typeof update === "function" ? update(current) : update;
  }
  return current;
};

const claimCtx = () => h.captured.claimCtx!;
const formCtx = () => h.captured.formCtx!;
const callbacks = () => formCtx().actionCallbacks;

const validValues = () => ({
  [`${CS(0)}_position`]: "SP",
  [`${CS(0)}_partNumber`]: "P0",
  [`${CS(0)}_description`]: "D0",
  [`${CS(0)}_type`]: "WARRANTY",
  [`${CS(0)}_quantity`]: "2",
  [`${CS(0)}_order`]: "2",
  [`${CS(0)}_unitPrice`]: "10",
  [`${CS(0)}_suggestedNetPrice`]: "20",
  [`${CS(0)}_netAmount`]: "20",
  [`${CS(0)}_tax`]: "5",
  [`${CS(0)}_taxAmount`]: "1",
  [`${CS(0)}_grossAmount`]: "21",
  [`${CS(0)}_totalAmount`]: "21",
  [`${CS(1)}_position`]: "LA",
  [`${CS(1)}_partNumber`]: "P1",
  [`${CS(1)}_order`]: "1",
  [`${CS(1)}_suggestedNetPrice`]: "40",
  [`${CS(1)}_netAmount`]: "30",
  [`${CS(1)}_tax`]: "10",
  [`${CS(1)}_taxAmount`]: "2",
  [`${CS(1)}_grossAmount`]: "35",
  [`${CS(1)}_totalAmount`]: "35",
});

beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});

afterEach(() => {
  globalThis.location.hash = "";
});

describe("ClaimOverview extended", () => {
  describe("routing and layout", () => {
    it("registers breadcrumbs for the claim", async () => {
      const { useBreadcrumbs } = await import("hooks/useBreadcrumbs");
      renderClaim();

      expect(useBreadcrumbs).toHaveBeenCalledWith([
        { label: "claimList", href: "/claim-list" },
        { label: "C-1", href: "" },
      ]);
    });

    it("falls back to an empty claim id when the route has none", async () => {
      h.params = {};
      const { useBreadcrumbs } = await import("hooks/useBreadcrumbs");
      renderClaim();

      expect(useClaimByIdMock).toHaveBeenCalledWith("");
      expect(useBreadcrumbs).toHaveBeenCalledWith([
        { label: "claimList", href: "/claim-list" },
        { label: "", href: "" },
      ]);
    });

    it("passes the claim and job ids to the note and special material modals", () => {
      renderClaim();

      expect(screen.getByTestId("claim-note-modal")).toHaveAttribute("data-claim", "C-1");
      expect(screen.getByTestId("claim-note-modal")).toHaveAttribute("data-job", "J-1");
      expect(screen.getByTestId("special-material-modal")).toHaveAttribute("data-job", "J-1");
    });

    it("renders without actions when the UI configuration has no ClaimOverview form", () => {
      h.claimForm = null;
      renderClaim();

      expect(screen.queryByRole("button", { name: "onValidate" })).not.toBeInTheDocument();
      expect(h.actionDependencyCalls.at(-1)?.actions).toEqual([]);
    });

    it("builds the action dependency context from the current claim state", () => {
      h.user = { countryCode: "ZA", permissions: ["P1"] };
      useClaimByIdMock.mockReturnValue({
        data: makeClaim({ claimStatus: "REVISED" }),
        isLoading: false,
        error: null,
      });
      renderClaim();

      const ctx = h.actionDependencyCalls.at(-1)!.ctx;
      expect(ctx.currentMode).toBe("view");
      expect(ctx.currentStatus).toBe("REVISED");
      expect(ctx.user).toEqual({ countryCode: "ZA", permissions: ["P1"] });
    });

    it("selects the first visible tab by default and hides tabs for the current status", () => {
      useTabs();
      renderClaim();

      expect(screen.getByTestId("tab-nav")).toHaveAttribute("data-selected", "claims");
      expect(screen.getByTestId("tab-claims")).toHaveTextContent("claims");
      expect(screen.getByTestId("tab-notes")).toHaveTextContent("notes");
      expect(screen.queryByTestId("tab-history")).not.toBeInTheDocument();
      expect(screen.getByTestId("section-claims")).toBeInTheDocument();
    });

    it("shows tabs that are not hidden for the current status", () => {
      useTabs();
      useClaimByIdMock.mockReturnValue({
        data: makeClaim({ claimStatus: "REVISED" }),
        isLoading: false,
        error: null,
      });
      renderClaim();

      expect(screen.getByTestId("tab-history")).toBeInTheDocument();
    });

    it("opens the tab named in the location hash", () => {
      globalThis.location.hash = "#notes";
      useTabs();
      renderClaim();

      expect(screen.getByTestId("section-notes")).toBeInTheDocument();
    });

    it("ignores a location hash that does not match a visible tab", () => {
      globalThis.location.hash = "#history";
      useTabs();
      renderClaim();

      expect(screen.getByTestId("section-claims")).toBeInTheDocument();
    });

    it("switches the section when another tab is selected", () => {
      useTabs();
      renderClaim();

      click("select-notes-tab");

      expect(screen.getByTestId("section-notes")).toBeInTheDocument();
      expect(screen.queryByTestId("section-claims")).not.toBeInTheDocument();
    });
  });

  describe("section disabled state", () => {
    it("keeps the claims section enabled but locks its fields outside edit mode", () => {
      useTabs();
      renderClaim();

      const claims = screen.getByTestId("section-claims");
      expect(claims).toHaveAttribute("data-disabled", "false");
      expect(attr("section-claims", "data-areas")).toContain("claimData:true");
      expect(attr("section-claims", "data-areas")).toContain(`${CS(0)}:true`);
      expect(claims).toHaveAttribute("data-mode", "view");
    });

    it("unlocks claim spare parts in edit mode but keeps claim data and summary locked for ZA", () => {
      useTabs();
      renderClaim();

      click("onEditClaim");

      expect(screen.getByTestId("section-claims")).toHaveAttribute("data-mode", "edit");
      const areas = attr("section-claims", "data-areas");
      expect(areas).toContain("claimData:true");
      expect(areas).toContain("claimDiagnosticsSummary:true");
      expect(areas).toContain(`${CS(0)}:false`);
      const fields = attr("section-claims", "data-fields-disabled");
      expect(fields).toContain("claimDataField:true");
      expect(fields).toContain("summaryField:true");
    });

    it("applies the same restriction for TR", () => {
      h.user = { countryCode: "TR", permissions: [] };
      useTabs();
      renderClaim();

      click("onEditClaim");

      expect(attr("section-claims", "data-areas")).toContain("claimData:true");
    });

    it("leaves all claim areas editable in edit mode for other countries", () => {
      h.user = { countryCode: "DE", permissions: [] };
      useTabs();
      renderClaim();

      click("onEditClaim");

      expect(attr("section-claims", "data-areas")).not.toContain(":true");
    });

    it("does not lock the notes tab when every action is disabled", () => {
      h.allActionsDisabled = true;
      useTabs();
      useClaimByIdMock.mockReturnValue({
        data: makeClaim({ claimStatus: "REVISED" }),
        isLoading: false,
        error: null,
      });
      renderClaim();
      click("select-notes-tab");

      expect(screen.getByTestId("section-notes")).toHaveAttribute("data-disabled", "auto");
    });

    it("locks the history tab when every action is disabled", async () => {
      h.allActionsDisabled = true;
      globalThis.location.hash = "#history";
      useTabs();
      useClaimByIdMock.mockReturnValue({
        data: makeClaim({ claimStatus: "REVISED" }),
        isLoading: false,
        error: null,
      });
      renderClaim();

      expect(screen.getByTestId("section-history")).toHaveAttribute("data-disabled", "true");
    });

    it("lets the notes tab become editable while it is being edited", () => {
      h.sectionEditing.editingSections = new Set(["notes"]);
      globalThis.location.hash = "#notes";
      useTabs();
      renderClaim();

      expect(screen.getByTestId("section-notes")).toHaveAttribute("data-disabled", "false");
      expect(screen.getByTestId("section-notes")).toHaveAttribute("data-mode", "edit");
      expect(screen.getByTestId("generic-action")).toHaveAttribute("data-mode", "edit");
    });

    it("exposes the edit handler only for notes that have actions", () => {
      globalThis.location.hash = "#notes";
      useTabs();
      renderClaim();

      expect(screen.getByTestId("section-notes")).toHaveAttribute("data-editable", "true");
    });

    it("exposes the edit handler when only an area defines actions", () => {
      globalThis.location.hash = "#notes";
      const tabs = buildTabs();
      tabs[1] = section(
        "notes",
        "notes",
        [area("noteArea", [], { actions: [{ name: "x", mode: "primary" }] as never })],
        2,
      );
      useTabs(tabs);
      renderClaim();

      expect(screen.getByTestId("section-notes")).toHaveAttribute("data-editable", "true");
    });

    it("does not expose an edit handler for notes without any actions", () => {
      globalThis.location.hash = "#notes";
      const tabs = buildTabs();
      tabs[1] = section("notes", "notes", [area("noteArea", [])], 2);
      useTabs(tabs);
      renderClaim();

      expect(screen.getByTestId("section-notes")).toHaveAttribute("data-editable", "false");
    });

    it("adds notes to the editing sections when the notes edit handler runs", () => {
      globalThis.location.hash = "#notes";
      useTabs();
      renderClaim();

      click("edit-notes");

      const updater = h.sectionEditing.setEditingSections.mock.calls.at(-1)![0] as (
        prev: Set<string>,
      ) => Set<string>;
      expect(Array.from(updater(new Set(["other"])))).toEqual(["other", "notes"]);
    });
  });

  describe("manager wiring", () => {
    it("does not pass claim data to the managers until the tabs are ready", () => {
      renderClaim();

      expect(h.managerCalls.at(-1)!.claimMaterials).toBeUndefined();
      expect(h.managerCalls.at(-1)!.claimArchivedMaterials).toBeUndefined();
      expect(h.diagCalls.at(-1)!.diagnosticData).toBeUndefined();
    });

    it("passes claim data to the managers once the tabs are ready", () => {
      useTabs();
      renderClaim();

      expect(h.managerCalls.at(-1)!.claimMaterials).toEqual(makeClaim().materials);
      expect(h.managerCalls.at(-1)!.readOnly).toBe(true);
      expect(h.diagCalls.at(-1)!.diagnosticData).toEqual({ jobId: "J-1" });
      expect(h.diagCalls.at(-1)!.readOnly).toBe(true);
    });

    it("leaves read-only mode once the claim is in edit mode", () => {
      useTabs();
      renderClaim();

      click("onEditClaim");

      expect(h.managerCalls.at(-1)!.readOnly).toBe(false);
    });

    it("derives the current action and job type from the form values", async () => {
      h.formInit.initialFormValues = { actionType: "EXCHANGE", jobType: "CHARGEABLE" };
      renderClaim();

      await waitFor(() => {
        expect(h.managerCalls.at(-1)!.currentActionType).toBe("EXCHANGE");
      });
      expect(h.managerCalls.at(-1)!.currentJobType).toBe("CHARGEABLE");
    });

    it("falls back to empty action and job types", () => {
      renderClaim();

      expect(h.managerCalls.at(-1)!.currentActionType).toBe("");
      expect(h.managerCalls.at(-1)!.currentJobType).toBe("");
    });

    it("keeps the explosion drawing parts marked as belonging to the tool", () => {
      h.manager = makeManager({
        materials: [
          { origin: "explosionDrawing" },
          { origin: "explosionDrawing" },
          { origin: "specialMaterial" },
          { origin: "explosionDrawing" },
        ],
      });
      const tabs = buildTabs();
      tabs[0].areas = [
        area(CS(0), spareFields(0), { isMultiple: true }),
        area(CS(1), [field(`${CS(1)}_position`, "diagnosticPosition")], { isMultiple: true }),
      ];
      useTabs(tabs);
      renderClaim();

      expect(formCtx().sparePartNotBelongsToTool.current).toEqual({
        [`${CS(0)}_partNumber`]: false,
      });
    });

    it("ignores materials without a matching spare part area", () => {
      useTabs();
      h.manager = makeManager({
        materials: [
          { origin: "specialMaterial" },
          { origin: "specialMaterial" },
          { origin: "explosionDrawing" },
        ],
      });
      renderClaim();

      expect(formCtx().sparePartNotBelongsToTool.current).toEqual({});
    });

    it("auto-expands the archived section when archived rows exist", async () => {
      h.manager = makeManager({ archivedMaterials: [{ partNumber: "A" }] });
      renderClaim();

      await waitFor(() => {
        expect(claimCtx().isArchivedExpanded).toBe(true);
      });
    });

    it("syncs the discount base into the form", async () => {
      h.manager = makeManager({ discountBase: "GROSS_PRICE" });
      renderClaim();

      await waitFor(() => {
        expect(screen.getByTestId("form-discount-base")).toHaveTextContent("GROSS_PRICE");
      });
    });
  });

  describe("form data mapping", () => {
    it("maps claim data into the initial values including fault code dropdowns", () => {
      useTabs();
      h.mapped = { faultCode: "F1", claimFaultCode: "CF1" };
      renderClaim();

      expect(h.formInit.setInitialFormValues).toHaveBeenCalledWith({
        faultCode: "F1",
        claimFaultCode: "CF1",
        faultCodeDropdown: "F1",
        claimFaultCodeDropdown: "CF1",
        discountBase: "NET_PRICE",
      });
    });

    it("skips dropdown values when the claim has no fault codes", () => {
      useTabs();
      renderClaim();

      expect(h.formInit.setInitialFormValues).toHaveBeenCalledWith({ discountBase: "NET_PRICE" });
    });

    it("does not map claim data before the form fields are available", () => {
      renderClaim();

      expect(h.formInit.setInitialFormValues).not.toHaveBeenCalled();
    });

    it("only merges header values when the skip flag is set and the claim data changes", () => {
      useTabs();
      h.mapped = {
        faultCode: "F2",
        [`${CS(0)}_position`]: "SP",
        "diagnosticData_diagnosticsSpareParts#0_position": "SP",
      };
      const { rerender } = renderClaim();
      h.formInit.setInitialFormValues.mockClear();

      h.managerCalls.at(-1)!.skipFormResetRef.current = true;
      useClaimByIdMock.mockReturnValue({
        data: makeClaim({ id: "C-1-updated" }),
        isLoading: false,
        error: null,
      });
      rerender(<ClaimOverview />);

      expect(h.formInit.setInitialFormValues).toHaveBeenCalledTimes(1);
      const updater = h.formInit.setInitialFormValues.mock.calls[0][0] as (
        prev: Record<string, unknown>,
      ) => Record<string, unknown>;
      expect(updater({ existing: true })).toEqual({
        existing: true,
        faultCode: "F2",
        faultCodeDropdown: "F2",
        discountBase: "NET_PRICE",
      });
      expect(h.managerCalls.at(-1)!.skipFormResetRef.current).toBe(false);
    });

    it("only clears the skip flag when the claim data did not change", () => {
      useTabs();
      const { rerender } = renderClaim();
      h.formInit.setInitialFormValues.mockClear();

      h.managerCalls.at(-1)!.skipFormResetRef.current = true;
      h.formInit.allFields = [...(h.formInit.allFields as Field[])];
      rerender(<ClaimOverview />);

      expect(h.formInit.setInitialFormValues).not.toHaveBeenCalled();
      expect(h.managerCalls.at(-1)!.skipFormResetRef.current).toBe(false);
    });
  });

  describe("claim states", () => {
    it("shows the error message of a failed claim query", () => {
      useClaimByIdMock.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error("boom"),
      });
      renderClaim();

      expect(screen.getByText(/boom/)).toBeInTheDocument();
    });
  });

  describe("note handling", () => {
    const helpers = () => ({
      setFieldValue: vi.fn(),
      setErrors: vi.fn(),
      setTouched: vi.fn(async () => undefined),
    });

    it("posts a trimmed note and clears the input", async () => {
      renderClaim();
      const noteHelpers = helpers();

      await act(async () => {
        await callbacks().onSaveNewNote({ note: "  hello  " }, noteHelpers);
      });

      expect(h.mutation.mutate).toHaveBeenCalledWith({
        jobId: "J-1",
        claimId: "C-1",
        messageId: null,
        messageType: "GENERAL_CLAIM",
        decision: null,
        message: "hello",
      });
      expect(noteHelpers.setFieldValue).toHaveBeenCalledWith("note", "");
      const updater = h.sectionEditing.setEditingSections.mock.calls.at(-1)![0] as (
        prev: Set<string>,
      ) => Set<string>;
      expect(Array.from(updater(new Set(["notes", "other"])))).toEqual(["other"]);
    });

    it("ignores blank notes", async () => {
      renderClaim();

      await act(async () => {
        await callbacks().onSaveNewNote({ note: "   " }, helpers());
      });

      expect(h.mutation.mutate).not.toHaveBeenCalled();
    });

    it("ignores notes without form values or helpers", async () => {
      renderClaim();

      await act(async () => {
        await callbacks().onSaveNewNote(undefined, helpers());
        await callbacks().onSaveNewNote({ note: "x" }, undefined);
      });

      expect(h.mutation.mutate).not.toHaveBeenCalled();
    });

    it("closes the notes editor even when no field helper is available", () => {
      renderClaim();

      act(() => {
        callbacks().onCancelNewNote({ note: "x" }, undefined);
      });

      const updater = h.sectionEditing.setEditingSections.mock.calls.at(-1)![0] as (
        prev: Set<string>,
      ) => Set<string>;
      expect(updater(new Set(["notes"])).size).toBe(0);
    });

    it("runs the note actions from the action bar", async () => {
      h.formInit.initialFormValues = { note: "from form" };
      renderClaim();

      expect(screen.getByTestId("form-note")).toHaveTextContent("from form");

      click("onSaveNewNote");
      await waitFor(() => expect(h.mutation.mutate).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(screen.getByTestId("form-note")).toBeEmptyDOMElement());

      click("onCancelNewNote");
      expect(h.sectionEditing.setEditingSections).toHaveBeenCalled();
    });

    it("refreshes messages and tracks analytics after a note is saved", () => {
      useClaimByIdMock.mockReturnValue({
        data: makeClaim({ claimStatus: "REVISED" }),
        isLoading: false,
        error: null,
      });
      renderClaim();

      act(() => {
        h.mutationOptions!.onSuccess();
      });

      expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ["messages", "J-1"] });
      expect(h.trackNoteAdded).toHaveBeenCalledWith({
        noteContext: "CLAIM",
        claimStatus: "status:REVISED",
      });
    });

    it("skips message invalidation when the cached claim has no job id", () => {
      h.claimCache = undefined;
      renderClaim();

      act(() => {
        h.mutationOptions!.onSuccess();
      });

      expect(invalidateQueriesMock).not.toHaveBeenCalled();
      expect(h.trackNoteAdded).toHaveBeenCalled();
    });

    it("logs an error when saving a note fails", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      renderClaim();

      act(() => {
        h.mutationOptions!.onError(new Error("nope"));
      });

      expect(errorSpy).toHaveBeenCalledWith("Failed to post message:", expect.any(Error));
      errorSpy.mockRestore();
    });
  });

  describe("decision actions and modals", () => {
    it.each([
      ["onRevise", "Revise"],
      ["onReject", "Reject"],
      ["onApprove", "Approve"],
    ])("opens the note modal for %s", (actionName, expected) => {
      renderClaim();
      expect(screen.getByTestId("claim-note-modal")).toHaveAttribute("data-open", "false");

      click(actionName);

      expect(screen.getByTestId("claim-note-modal")).toHaveAttribute("data-action", expected);
      expect(screen.getByTestId("claim-note-modal")).toHaveAttribute("data-open", "true");

      click("close-note-modal");
      expect(screen.getByTestId("claim-note-modal")).toHaveAttribute("data-open", "false");
    });

    it("ignores unknown actions and actions without a name", () => {
      renderClaim();

      click("unknown-action");
      click("no-action");

      expect(screen.getByTestId("claim-note-modal")).toHaveAttribute("data-open", "false");
    });

    it("does not open the special material modal when it is not allowed", () => {
      renderClaim();

      click("onAddSpecialMaterials");

      expect(screen.getByTestId("special-material-modal")).toHaveAttribute("data-open", "false");
      expect(h.manager.getExistingPartNumbers).not.toHaveBeenCalled();
    });

    it("opens the special material modal with the existing part numbers", () => {
      h.manager = makeManager({
        addSpecialMaterialsAllowed: true,
        getExistingPartNumbers: vi.fn(() => new Set(["X", "Y"])),
      });
      renderClaim();

      click("onAddSpecialMaterials");

      expect(screen.getByTestId("special-material-modal")).toHaveAttribute("data-open", "true");
      expect(screen.getByTestId("special-material-modal")).toHaveAttribute("data-existing", "X,Y");
    });

    it("adds special materials through the form and marks the claim as changed", async () => {
      h.manager = makeManager({ addSpecialMaterialsAllowed: true });
      renderClaim();
      click("onValidate");
      await waitFor(() => expect(callbacks().arePricesValidated()).toBe(true));

      click("submit-special");

      expect(h.manager.onAddMaterials).toHaveBeenCalledWith(
        [{ partNumber: "S1" }],
        expect.any(Function),
      );
      expect(callbacks().arePricesValidated()).toBe(false);
    });

    it("opens the explosion drawing and adds only parts with a part number", async () => {
      renderClaim();
      expect(screen.queryByTestId("explosion-modal")).not.toBeInTheDocument();

      click("onProductDetails");
      expect(screen.getByTestId("explosion-modal")).toBeInTheDocument();

      click("submit-explosion");

      expect(h.manager.onAddMaterials).toHaveBeenCalledWith(
        [
          {
            position: "SP",
            partNumber: "E1",
            description: "Part one",
            type: "WARRANTY",
            quantity: 2,
            unitPrice: null,
            origin: "explosionDrawing",
          },
        ],
        expect.any(Function),
      );

      click("close-explosion");
      expect(screen.queryByTestId("explosion-modal")).not.toBeInTheDocument();
    });

    it("adds a spare part row and flags unsaved changes", async () => {
      renderClaim();
      click("onValidate");
      await waitFor(() => expect(callbacks().arePricesValidated()).toBe(true));

      click("onAddRow");

      expect(h.manager.onAddRow).toHaveBeenCalledTimes(1);
      expect(callbacks().arePricesValidated()).toBe(false);
    });

    it("uses the form action callbacks for edit, add and product details", () => {
      renderClaim();

      act(() => {
        callbacks().onAddRow({ a: 1 });
        callbacks().onProductDetails();
        callbacks().onEditClaim();
      });

      expect(h.manager.onAddRow).toHaveBeenCalledWith({ a: 1 });
      expect(screen.getByTestId("explosion-modal")).toBeInTheDocument();
      expect(screen.getByTestId("generic-action")).toHaveAttribute("data-mode", "edit");
    });

    it("exposes no-op summary callbacks and the decision permission", () => {
      renderClaim();

      expect(callbacks().onSummaryDiscountChange()).toBeUndefined();
      expect(callbacks().onSummaryTotalAmountChange()).toBeUndefined();
      expect(callbacks().canChangeClaimDecision).toBe(true);
    });

    it("opens the special material modal from the form callbacks", () => {
      h.manager = makeManager({ addSpecialMaterialsAllowed: true });
      renderClaim();

      act(() => {
        callbacks().onAddSpecialMaterials({ a: 1 });
      });

      expect(screen.getByTestId("special-material-modal")).toHaveAttribute("data-open", "true");
    });

    it("disables the action bar while a file is being deleted", () => {
      renderClaim();

      act(() => {
        formCtx().onDeleteStart();
      });
      expect(screen.getByTestId("generic-action")).toHaveAttribute("data-disabled", "true");

      act(() => {
        formCtx().onDeleteEnd();
      });
      expect(screen.getByTestId("generic-action")).toHaveAttribute("data-disabled", "false");
    });
  });

  describe("validate claim", () => {
    beforeEach(() => {
      useTabs();
      h.formInit.initialFormValues = validValues();
      h.manager = makeManager({
        archivedMaterials: [{ partNumber: "ARCH-1" }, { partNumber: "" }],
      });
    });

    it("sends the aggregated claim payload and marks prices as validated", async () => {
      renderClaim();

      click("onValidate");

      await waitFor(() => expect(h.updatePrices.mutateAsync).toHaveBeenCalledTimes(1));
      const { claimId, payload } = h.updatePrices.mutateAsync.mock.calls[0][0] as {
        claimId: string;
        payload: ClaimPayload;
      };
      expect(claimId).toBe("C-1");
      expect(payload).toMatchObject({
        id: "C-1",
        jobId: "J-1",
        ascId: "ASC-1",
        customerId: "CUS-1",
        ascName: "ASC name",
        diagnosticId: "DIAG-1",
        countryCode: "ZA",
        actionType: "REPAIR",
        jobType: "WARRANTY",
        typeOfUsage: "usage",
        faultCode: "F1",
        faultCodeDescription: "fault",
        faultCodeLabourQuantity: 1,
        claimStatus: "OPEN",
        jobDiagnostic: { jobId: "J-1" },
      });
      expect(payload.materials.map((m) => m.partNumber)).toEqual(["P1", "P0"]);
      expect(payload.materials[1]).toMatchObject({
        id: "m0",
        position: "SP",
        description: "D0",
        jobType: "WARRANTY",
        quantity: 2,
        order: 2,
        isPriceSetManually: false,
        price: {
          unitPrice: 10,
          suggestedNetPrice: 20,
          netAmount: 20,
          tax: 5,
          taxAmount: 1,
          grossAmount: 21,
          discount: 7,
          totalAmount: 21,
        },
      });
      expect(payload.materials[0]).toMatchObject({
        position: "LA",
        description: "",
        jobType: "",
        quantity: 1,
        order: 1,
      });
      expect(payload.claimPriceSummary).toEqual({
        netAmount: 50,
        suggestedNetPrice: 60,
        grossAmount: 56,
        discount: 7,
        totalAmount: 56,
        taxAmount: 3,
      });
      expect(payload.archivedMaterials).toEqual([{ partNumber: "ARCH-1" }]);

      await waitFor(() => expect(h.manager.markAllValidated).toHaveBeenCalled());
      expect(h.manager.forceRebuildRef).toEqual({ current: true });
      expect(h.manager.hasSyncedRef).toEqual({ current: false });
      expect(scrollToTop).toHaveBeenCalled();
      expect(messages().at(-1)).toMatchObject({
        text: "claimPricesValidateSuccess",
        type: "success",
      });
      expect(callbacks().arePricesValidated()).toBe(true);
      expect(callbacks().enableRequestApproval()).toBe(true);
      await waitFor(() => expect(claimCtx().arePricesValidated).toBe(true));
    });

    it("suppresses dirty marking right after a successful validation", async () => {
      // markAllValidated runs while the post-validation suppress flag is still set.
      h.manager.markAllValidated = vi.fn(() => {
        claimCtx().markRowDirty(0);
      });
      renderClaim();
      click("onValidate");
      await waitFor(() => expect(h.manager.markAllValidated).toHaveBeenCalled());

      expect(h.manager.markRowDirty).not.toHaveBeenCalled();
      expect(callbacks().arePricesValidated()).toBe(true);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
      });
      act(() => {
        claimCtx().markRowDirty(1);
      });

      expect(h.manager.markRowDirty).toHaveBeenCalledWith(1);
      expect(callbacks().arePricesValidated()).toBe(false);
    });

    it("shows an error when the price validation fails", async () => {
      h.updatePrices.mutateAsync.mockRejectedValue(new Error("fail"));
      renderClaim();

      click("onValidate");

      await waitFor(() =>
        expect(messages().at(-1)).toMatchObject({
          text: "claimPricesValidateError",
          type: "error",
        }),
      );
      expect(scrollToTop).toHaveBeenCalled();
      expect(h.manager.markAllValidated).not.toHaveBeenCalled();
      expect(callbacks().arePricesValidated()).toBe(false);
    });

    it("does nothing without a claim id", () => {
      h.params = {};
      renderClaim();

      click("onValidate");

      expect(h.updatePrices.mutateAsync).not.toHaveBeenCalled();
    });

    it("does nothing while the form fields are not loaded", () => {
      h.formInit.allFields = null;
      renderClaim();

      click("onValidate");

      expect(h.updatePrices.mutateAsync).not.toHaveBeenCalled();
    });

    it("validates through the form action callback", async () => {
      renderClaim();

      act(() => {
        callbacks().onValidate(validValues(), {
          setErrors: vi.fn(),
          setTouched: vi.fn(),
          setFieldValue: vi.fn(),
        });
      });

      await waitFor(() => expect(h.updatePrices.mutateAsync).toHaveBeenCalledTimes(1));
    });

    it("falls back to defaults when the claim has no original materials", async () => {
      useClaimByIdMock.mockReturnValue({
        data: makeClaim({ materials: undefined }),
        isLoading: false,
        error: null,
      });
      h.formInit.initialFormValues = {};
      renderClaim();

      click("onValidate");

      await waitFor(() => expect(h.updatePrices.mutateAsync).toHaveBeenCalledTimes(1));
      const { payload } = h.updatePrices.mutateAsync.mock.calls[0][0] as {
        payload: ClaimPayload;
      };
      expect(payload.materials).toHaveLength(2);
      expect(payload.materials[0]).toMatchObject({
        position: "",
        partNumber: "",
        description: "",
        jobType: "",
        quantity: 1,
        order: 1,
        price: { unitPrice: 0, tax: 0, discount: 0, totalAmount: 0 },
      });
    });

    it("validates when the claims tab has no spare part areas", async () => {
      useTabs([section("notes", "notes", [], 1)]);
      renderClaim();

      click("onValidate");

      await waitFor(() => expect(h.updatePrices.mutateAsync).toHaveBeenCalledTimes(1));
      const { payload } = h.updatePrices.mutateAsync.mock.calls[0][0] as {
        payload: ClaimPayload;
      };
      expect(payload.materials).toEqual([]);
      expect(payload.claimPriceSummary.netAmount).toBe(0);
    });
  });

  describe("request approval", () => {
    it("requests approval and reports success", async () => {
      renderClaim();

      click("onRequestApproval");

      await waitFor(() =>
        expect(h.requestApproval.mutateAsync).toHaveBeenCalledWith({
          claimId: "C-1",
          jobId: "J-1",
        }),
      );
      await waitFor(() =>
        expect(messages().at(-1)).toMatchObject({
          text: "claimRequestApprovalSuccess",
          type: "success",
        }),
      );
      expect(scrollToTop).toHaveBeenCalled();
    });

    it("reports a failed approval request", async () => {
      h.requestApproval.mutateAsync.mockRejectedValue(new Error("fail"));
      renderClaim();

      click("onRequestApproval");

      await waitFor(() =>
        expect(messages().at(-1)).toMatchObject({
          text: "claimRequestApprovalError",
          type: "error",
        }),
      );
    });

    it("does nothing without a claim id", () => {
      h.params = {};
      renderClaim();

      click("onRequestApproval");

      expect(h.requestApproval.mutateAsync).not.toHaveBeenCalled();
    });

    it("requests approval through the form action callback", async () => {
      renderClaim();

      act(() => {
        callbacks().onRequestApproval(
          {},
          {
            setErrors: vi.fn(),
            setTouched: vi.fn(),
            setFieldValue: vi.fn(),
          },
        );
      });

      await waitFor(() => expect(h.requestApproval.mutateAsync).toHaveBeenCalledTimes(1));
    });

    it("keeps approval disabled until prices are validated", () => {
      renderClaim();

      expect(callbacks().enableRequestApproval()).toBe(false);
      expect(callbacks().enableValidate()).toBe(true);
    });
  });

  describe("action availability", () => {
    const positionValues = (positions: string[]) =>
      Object.fromEntries(positions.map((value, i) => [`${CS(i)}_position`, value]));
    const allowed = (position: string, maxCount: number) => ({ position, maxCount });

    it("disables adding rows when no positions are allowed", () => {
      useTabs();
      renderClaim();

      expect(callbacks().enableAddingSparePart()).toBe(false);
    });

    it("disables adding rows when every allowed position is full", () => {
      useTabs();
      h.formInit.initialFormValues = positionValues(["SP", "SP"]);
      h.manager = makeManager({ allowedPositions: [allowed("SP", 2)] });
      renderClaim();

      expect(callbacks().enableAddingSparePart()).toBe(false);
    });

    it("enables adding rows while an allowed position has capacity", () => {
      useTabs();
      h.formInit.initialFormValues = positionValues(["SP", ""]);
      h.manager = makeManager({ allowedPositions: [allowed("SP", 2)] });
      renderClaim();

      expect(callbacks().enableAddingSparePart()).toBe(true);
    });

    it("handles missing form fields when checking capacity", () => {
      h.formInit.allFields = null;
      h.manager = makeManager({ allowedPositions: [allowed("SP", 2)] });
      renderClaim();

      expect(callbacks().enableAddingSparePart()).toBe(true);
      expect(callbacks().enableProductDetails()).toBe(true);
    });

    it("disables product details without an SP position", () => {
      useTabs();
      h.manager = makeManager({ allowedPositions: [allowed("LA", 2)] });
      renderClaim();

      expect(callbacks().enableProductDetails()).toBe(false);
    });

    it("disables product details when SP rows reached the maximum", () => {
      useTabs();
      h.formInit.initialFormValues = positionValues(["SP"]);
      h.manager = makeManager({ allowedPositions: [allowed("SP", 1)] });
      renderClaim();

      expect(callbacks().enableProductDetails()).toBe(false);
    });

    it("enables product details while SP capacity remains", () => {
      useTabs();
      h.formInit.initialFormValues = positionValues(["SP"]);
      h.manager = makeManager({ allowedPositions: [allowed("SP", 2)] });
      renderClaim();

      expect(callbacks().enableProductDetails()).toBe(true);
    });

    it("mirrors the special materials permission", () => {
      h.manager = makeManager({ addSpecialMaterialsAllowed: true });
      renderClaim();

      expect(callbacks().enableAddingSpecialMaterials()).toBe(true);
    });
  });

  describe("contexts", () => {
    it("wraps setAllFields so functional updates receive an empty list for missing state", () => {
      renderClaim();

      act(() => {
        formCtx().setAllFields((prev: Field[]) => [...prev, field("added")]);
      });
      const updater = h.formInit.setAllFields.mock.calls.at(-1)![0] as (
        prev: Field[] | undefined,
      ) => Field[];
      expect(updater(undefined).map((f) => f.name)).toEqual(["added"]);

      const next = [field("direct")];
      act(() => {
        formCtx().setAllFields(next);
      });
      expect(h.formInit.setAllFields).toHaveBeenLastCalledWith(next);
    });

    it("exposes the summary type options to radio sources", () => {
      renderClaim();

      expect(formCtx().radioSourceCallbacks.getRadioButtonsForSummaryType()).toEqual([
        { value: "totalSummary", label: "totalSummary" },
      ]);

      act(() => {
        claimCtx().setSummaryTypeOptions([{ label: "a", value: "a" }]);
      });

      expect(formCtx().radioSourceCallbacks.getRadioButtonsForSummaryType()).toEqual([
        { label: "a", value: "a" },
      ]);
    });

    it("keeps setMandatoryFields as a no-op", () => {
      renderClaim();

      expect(() =>
        (formCtx() as unknown as { setMandatoryFields: AnyFn }).setMandatoryFields(),
      ).not.toThrow();
    });

    it("provides inert read-only stubs for the diagnostics tab", () => {
      renderClaim();

      Object.values(h.captured.diagCtx!).forEach((value) => {
        if (typeof value === "function") {
          expect(() => (value as AnyFn)()).not.toThrow();
        }
      });
      expect(h.captured.diagCtx!.discountBase).toBe("NET_PRICE");
      expect(h.captured.diagCtx!.canArchiveOnDelete).toBe(false);
    });

    it("turns claim row actions into no-ops outside edit mode", () => {
      renderClaim();

      act(() => {
        claimCtx().onAddRow({});
        claimCtx().onAddMaterials([]);
        claimCtx().onDeleteRow("area");
        claimCtx().onDeleteArchivedRow("area");
        claimCtx().onRestoreRow("area");
      });

      expect(h.manager.onAddRow).not.toHaveBeenCalled();
      expect(h.manager.onAddMaterials).not.toHaveBeenCalled();
      expect(h.manager.onDeleteRow).not.toHaveBeenCalled();
      expect(h.manager.onDeleteArchivedRow).not.toHaveBeenCalled();
      expect(h.manager.onRestoreRow).not.toHaveBeenCalled();
      expect(claimCtx().canDeleteRows).toBe(false);
    });

    it("enables claim row actions in edit mode and flags unsaved changes", async () => {
      renderClaim();
      click("onValidate");
      await waitFor(() => expect(callbacks().arePricesValidated()).toBe(true));
      click("onEditClaim");

      act(() => {
        claimCtx().onAddRow({ a: 1 });
        claimCtx().onAddMaterials([{ partNumber: "M" }]);
        claimCtx().onDeleteArchivedRow("arch");
      });
      expect(h.manager.onAddRow).toHaveBeenCalledWith({ a: 1 });
      expect(h.manager.onAddMaterials).toHaveBeenCalledWith([{ partNumber: "M" }]);
      expect(h.manager.onDeleteArchivedRow).toHaveBeenCalledWith("arch");

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
      });
      expect(callbacks().arePricesValidated()).toBe(true);

      act(() => {
        claimCtx().onDeleteRow("area");
      });
      expect(h.manager.onDeleteRow).toHaveBeenCalledWith("area");
      expect(callbacks().arePricesValidated()).toBe(false);
    });

    it("flags unsaved changes when a row is restored", async () => {
      renderClaim();
      click("onValidate");
      await waitFor(() => expect(callbacks().arePricesValidated()).toBe(true));
      click("onEditClaim");

      act(() => {
        claimCtx().onRestoreRow("arch");
      });

      expect(h.manager.onRestoreRow).toHaveBeenCalledWith("arch");
      expect(callbacks().arePricesValidated()).toBe(false);
    });

    it("only allows deleting rows in edit mode for revised claims", () => {
      useClaimByIdMock.mockReturnValue({
        data: makeClaim({ claimStatus: "REVISED" }),
        isLoading: false,
        error: null,
      });
      renderClaim();
      expect(claimCtx().canDeleteRows).toBe(false);

      click("onEditClaim");

      expect(claimCtx().canDeleteRows).toBe(true);
    });

    it("reports pending claims and populated prices", () => {
      useClaimByIdMock.mockReturnValue({
        data: makeClaim({ claimStatus: "PENDING" }),
        isLoading: false,
        error: null,
      });
      h.manager = makeManager({
        materials: [
          { unitPrice: 0, netAmount: 0, grossAmount: 0, totalAmount: 0 },
          { unitPrice: 0, netAmount: 0, grossAmount: 5, totalAmount: 0 },
        ],
      });
      renderClaim();

      expect(claimCtx().isClaimPending).toBe(true);
      expect(claimCtx().hasPricesPopulated).toBe(true);
    });

    it("reports unpopulated prices when every amount is zero", () => {
      h.manager = makeManager({
        materials: [{ unitPrice: 0, netAmount: 0, grossAmount: 0, totalAmount: 0 }],
      });
      renderClaim();

      expect(claimCtx().hasPricesPopulated).toBe(false);
      expect(claimCtx().isClaimPending).toBe(false);
    });
  });
});
