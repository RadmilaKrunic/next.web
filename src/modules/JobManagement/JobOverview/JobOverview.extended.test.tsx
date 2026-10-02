import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import JobOverview from "./JobOverview";
import { MessagesContext } from "contexts/messagescontext";
import { scrollToTop } from "utils/scrollToError";
import { useBreadcrumbs } from "hooks/useBreadcrumbs";
import { getCostEstimationPdf } from "api/services/jobs/action";
import {
  CUSTOMER_ANSWER_EXCHANGE_OPTIONS,
  CUSTOMER_ANSWER_REPAIR_OPTIONS,
} from "./AnswerModal/AnswerModal.constants";
import type Section from "components/generics/Section/GenericSection.types";
import type Area from "components/generics/Area/GenericArea.types";
import type Field from "components/generics/Field/GenericField.types";

type AnyFn = (...args: unknown[]) => unknown;

interface MutationMock {
  mutate: ReturnType<typeof vi.fn>;
  mutateAsync: ReturnType<typeof vi.fn>;
  isPending: boolean;
  data?: unknown;
}

interface DiagCtxLike {
  materials: unknown[];
  arePricesValidated: boolean;
  setArePricesValidated: (value: boolean) => void;
  isValidating: boolean;
  jobStatus: string;
  canArchiveOnDelete: boolean;
  hasPricesPopulated: boolean;
  summaryTypeOptions: Array<{ label: string; value: string }>;
  setSummaryTypeOptions: AnyFn;
  getExistingMaterialsAsPositionItems: () => unknown[];
  isArchivedExpanded: boolean;
  setIsArchivedExpanded: AnyFn;
}

interface WarrantyPanelLike {
  supportedWarrantyType: string;
  isIneligible: boolean;
  hasPurchaseDate: boolean;
  infoPayload: { reasonKey?: string } & Record<string, unknown>;
  [key: string]: unknown;
}

interface FormCtxLike {
  allFields: Field[];
  setAllFields: AnyFn;
  setMandatoryFields: AnyFn;
  actionCallbacks: Record<string, AnyFn>;
  radioSourceCallbacks: Record<string, AnyFn>;
  onAreaValueChange: (areaName: string, values?: Record<string, unknown>) => void;
  onDeleteStart: () => void;
  onDeleteEnd: () => void;
  autocompleteValidation: { current: Record<string, boolean> };
  sparePartNotBelongsToTool: { current: Record<string, boolean> };
  warrantyPanelInfo: WarrantyPanelLike;
  isRepairAnswerLocked: boolean;
}

interface ManagerArgs {
  diagnosticData?: unknown;
  currentActionType: string;
  currentJobType: string;
  jobStatus: string;
}

interface ApiPayload {
  order?: { customer: { useBillingAddressForDelivery: boolean; name: string } };
  job?: { asset: { hasAccessories: boolean; accessories: unknown[] } };
  diagnostic?: Record<string, unknown>;
}

interface ValidatePayload {
  materials: Array<Record<string, unknown>>;
  status?: unknown;
  priceSummary?: unknown;
  priceSummaryDetailed?: unknown;
  archivedMaterials?: unknown;
  changes?: unknown;
}

const h = vi.hoisted(() => {
  const mutations: Record<string, MutationMock> = {};
  const keys = [
    "postMessage",
    "patchJob",
    "postCustomer",
    "startDiagnostic",
    "toggleHold",
    "validateAndSave",
    "repairApproval",
    "internalApproval",
    "startReview",
    "startRepair",
    "finishRepair",
    "toolDelivered",
    "createCostEstimate",
    "customerAnswer",
    "recalculate",
    "updateApproval",
    "warranty",
  ];
  keys.forEach((key) => {
    mutations[key] = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, data: undefined };
  });

  const state = {
    params: { jobId: "J-1" } as Record<string, string | undefined>,
    location: { state: null } as { state: { from?: string } | null },
    navigate: vi.fn(),
    user: { countryCode: "ZA", permissions: [] } as Record<string, unknown> | undefined,
    jobForm: null as unknown,
    jobCache: undefined as Record<string, unknown> | undefined,
    hasSendForReview: false,
    mutations,
    hookOptions: {} as Record<string, Record<string, AnyFn>>,
    use: (key: string, options?: Record<string, AnyFn>) => {
      state.hookOptions[key] = options ?? {};
      return mutations[key];
    },
    queryClient: {
      getQueryData: vi.fn(),
      invalidateQueries: vi.fn(),
      refetchQueries: vi.fn(async () => undefined),
      setQueryData: vi.fn(),
    },
    jobQuery: { data: undefined as unknown, isLoading: false, error: null as Error | null },
    diagnostic: {
      diagnosticData: undefined as unknown,
      diagnosticLoading: false,
      shouldFetchDiagnostic: false,
    },
    formInit: {
      initialFormValues: {} as Record<string, unknown>,
      setInitialFormValues: vi.fn(),
      allFields: [] as unknown[] | null,
      setAllFields: vi.fn(),
      mandatoryFields: null as unknown,
      tabs: [] as unknown[],
      setTabs: vi.fn(),
    },
    sectionEditing: {
      editingSections: new Set<string>(),
      enableSectionEditing: vi.fn(),
      disableSectionEditing: vi.fn(),
      setEditingSections: vi.fn(),
    },
    manager: {} as Record<string, unknown>,
    managerCalls: [] as unknown[],
    bosch: { pendingTypeFields: [] as unknown[], hasBoschInternalPending: false },
    chargeable: { pendingTypeFields: [] as unknown[], hasChargeablePending: false },
    hasWarrantyItems: false,
    allActionsDisabled: false,
    actionDependencyCalls: [] as Array<{ actions: unknown; ctx: Record<string, AnyFn> }>,
    uploadErrors: [] as string[],
    apiPayload: {} as ApiPayload,
    mapped: {} as Record<string, unknown>,
    accessoriesCalls: [] as unknown[],
    accessories: { assetsAccessories: [] as unknown[], setAssetsAccessories: vi.fn() },
    track: {
      trackNoteAdded: vi.fn(),
      trackRepairStarted: vi.fn(),
      trackRepairFinished: vi.fn(),
      trackJobCompleted: vi.fn(),
      trackJobSubmittedForReview: vi.fn(),
      trackJobApprovedForRepair: vi.fn(),
      trackPreApprovalRequested: vi.fn(),
      trackDiagnosticValidated: vi.fn(),
      trackPreApprovalReviewed: vi.fn(),
    },
    setMessages: vi.fn(),
    captured: {
      diagCtx: null as unknown,
      formCtx: null as unknown,
      createJobCtx: null as unknown,
    },
    formik: null as null | { values: Record<string, unknown> },
  };
  return state;
});

const useJobByIdMock = vi.hoisted(() => vi.fn());

vi.mock("@/analytics", () => ({
  useAnalytics: () => h.track,
  toJobType: (value?: string) => (value ? `jt:${value}` : undefined),
  toJobStatus: (value?: string) => (value ? `js:${value}` : undefined),
  toPreApprovalAction: (status: string) =>
    ({ APPROVED: "approved", REJECTED: "rejected", REVISED: "revised" })[status],
  NoteContext: { JOB: "JOB" },
  CompletionType: { DELIVERED: "DELIVERED" },
}));

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
      <button type="button" onClick={() => onTabSelect(null, { value: "diagnosticData" })}>
        select-diagnostic-tab
      </button>
      <button type="button" onClick={() => onTabSelect(null, { value: "assetData" })}>
        select-asset-tab
      </button>
    </div>
  ),
  Tab: ({ children, value }: { children: ReactNode; value: string }) => (
    <span data-testid={`tab-${value}`}>{children}</span>
  ),
  Notification: ({ children }: { children: ReactNode }) => (
    <div data-testid="on-hold-banner">{children}</div>
  ),
}));

vi.mock("react-router-dom", () => ({
  useParams: () => h.params,
  useNavigate: () => h.navigate,
  useLocation: () => h.location,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => h.queryClient,
  useMutation: (options: Record<string, AnyFn>) => h.use("postMessage", options),
}));
vi.mock("hooks/useHasPermission", () => ({ useHasPermission: () => h.hasSendForReview }));
vi.mock("hooks/useBreadcrumbs", () => ({ useBreadcrumbs: vi.fn() }));
vi.mock("hooks/useAccessoriesManager", () => ({
  useAccessoriesManager: (args: unknown) => {
    h.accessoriesCalls.push(args);
    return h.accessories;
  },
}));
vi.mock("hooks/useDiagnosticData", () => ({ useDiagnosticData: () => h.diagnostic }));
vi.mock("hooks/useFormInitialization", () => ({ useFormInitialization: () => h.formInit }));
vi.mock("hooks/useActionWithValidation", () => ({
  useActionWithValidation: () => async (_a: string, _b: unknown, _c: unknown, onValid: AnyFn) =>
    onValid(),
}));
vi.mock("hooks/usePositionDropdownSync", () => ({ usePositionDropdownSync: vi.fn() }));
vi.mock("hooks/useSectionEditing", () => ({ useSectionEditing: () => h.sectionEditing }));
vi.mock("hooks/useDiagnosticsManager", () => ({
  useDiagnosticsManager: (args: unknown) => {
    h.managerCalls.push(args);
    return h.manager;
  },
  getBoschInternalPending: () => h.bosch,
  getChargeablePendingInfo: () => h.chargeable,
  hasWarrantyOrProServiceItems: () => h.hasWarrantyItems,
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
  setSectionDisabledState: vi.fn((section: Section, disabled?: boolean) => ({
    ...section,
    isDisabled: disabled === undefined ? "auto" : disabled,
  })),
  mapValuesToAPI: vi.fn(() => structuredClone(h.apiPayload)),
}));
vi.mock("components/generics/Form/formValidation", () => ({
  getUploadFieldErrors: vi.fn(() => h.uploadErrors),
}));
vi.mock("components/generics/Action/actionDependency", () => ({
  areAllActionsDisabled: (actions: unknown, ctx: Record<string, AnyFn>) => {
    h.actionDependencyCalls.push({ actions, ctx });
    return h.allActionsDisabled;
  },
}));
vi.mock("utils/scrollToError", () => ({ scrollToTop: vi.fn() }));
vi.mock("../CreateJob/CreateJob.warranty.utils", () => ({
  buildWarrantyCheckPayloadFromFieldNames: vi.fn(
    (values: Record<string, unknown>, _names: unknown, country?: string) =>
      values.purchaseDate
        ? {
            brand: values.brand,
            country,
            bareToolNumber: values.baretoolNumber,
            serialNumber: values.serialNumber,
            purchaseDate: values.purchaseDate,
          }
        : null,
  ),
  getAllowedWarrantyTypes: (response: { allowed?: string[] }) => new Set(response.allowed ?? []),
  updateWarrantyFields: vi.fn((fields: Field[]) => fields),
}));
vi.mock("../warranty.utils", () => ({
  buildWarrantyInfoContent: vi.fn(() => ({ reasonKey: "WARRANTY_EXPIRED" })),
  formatWarrantyDate: (value?: string) => (value ? `fmt:${value}` : ""),
  getWarrantyRecommendationText: (a?: string, b?: string) => `rec:${a}:${b}`,
  getWarrantyUnavailableMessage: (key: string) => `unavailable:${key}`,
  INELIGIBLE_JOB_TYPES: new Set<string>(),
}));
vi.mock("api/services/jobs/action", () => ({
  postMessage: vi.fn(),
  getCostEstimationPdf: vi.fn(),
}));
vi.mock("api/services/orders/hooks", () => ({
  usePostWarrantyCheck: () => h.mutations.warranty,
}));
vi.mock("api/services/approvals/hooks", () => ({
  useUpdateApprovalStatus: (options: Record<string, AnyFn>) => h.use("updateApproval", options),
}));
vi.mock("api/services/jobs/hooks", () => ({
  useJobById: useJobByIdMock,
  usePatchJobById: (o: Record<string, AnyFn>) => h.use("patchJob", o),
  usePostCustomerData: (o: Record<string, AnyFn>) => h.use("postCustomer", o),
  usePostJobStatusStartDiagnostic: (o: Record<string, AnyFn>) => h.use("startDiagnostic", o),
  useToggleJobHold: (o: Record<string, AnyFn>) => h.use("toggleHold", o),
  usePostValidateAndSave: (o: Record<string, AnyFn>) => h.use("validateAndSave", o),
  usePostRepairApproval: (o: Record<string, AnyFn>) => h.use("repairApproval", o),
  usePostInternalApprovalRequest: (o: Record<string, AnyFn>) => h.use("internalApproval", o),
  usePostStartReview: (o: Record<string, AnyFn>) => h.use("startReview", o),
  usePostStartRepair: (o: Record<string, AnyFn>) => h.use("startRepair", o),
  usePostFinishRepair: (o: Record<string, AnyFn>) => h.use("finishRepair", o),
  usePostToolDelivered: (o: Record<string, AnyFn>) => h.use("toolDelivered", o),
  usePostCreateCostEstimate: (o: Record<string, AnyFn>) => h.use("createCostEstimate", o),
  usePostCustomerAnswer: (o: Record<string, AnyFn>) => h.use("customerAnswer", o),
  usePostRecalculatePrices: (o: Record<string, AnyFn>) => h.use("recalculate", o),
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
  const { GenericFormContext } = await import("components/generics/Form/GenericForm.context");
  const { DiagnosticsContext } = await import("./DiagnosticsContext");
  const { CreateJobContext } = await import("../CreateJob/CreateJob.context");
  return {
    default: function ActionProbe({
      actions,
      onActionClick,
      currentMode,
      isGloballyDisabled,
      isOnHold,
    }: {
      actions: Array<{ name?: string; onAction?: string }>;
      onActionClick: (action: string | undefined) => void;
      currentMode?: string;
      isGloballyDisabled?: boolean;
      isOnHold?: boolean;
    }) {
      const formik = useFormikContext<Record<string, unknown>>();
      h.formik = formik;
      h.captured.diagCtx = useContext(DiagnosticsContext);
      h.captured.formCtx = useContext(GenericFormContext);
      h.captured.createJobCtx = useContext(CreateJobContext);
      return (
        <div
          data-testid="generic-action"
          data-mode={currentMode}
          data-disabled={String(Boolean(isGloballyDisabled))}
          data-on-hold={String(Boolean(isOnHold))}
        >
          <pre data-testid="form-values">{JSON.stringify(formik.values)}</pre>
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
vi.mock("./JobOverviewHeader/JobOverviewHeader", () => ({
  default: () => <div>job-overview-header</div>,
}));
vi.mock("./AddSpecialMaterialModal/AddSpecialMaterialModal", () => ({
  default: ({
    isOpen,
    existingPartNumbers,
    onAddMaterials,
    jobId,
  }: {
    isOpen: boolean;
    existingPartNumbers: Set<string>;
    onAddMaterials: (items: Array<Record<string, unknown>>) => void;
    jobId?: string;
  }) => (
    <div
      data-testid="special-modal"
      data-open={String(isOpen)}
      data-job={jobId}
      data-existing={Array.from(existingPartNumbers).join(",")}
    >
      <button
        type="button"
        onClick={() => onAddMaterials([{ partNumber: "S1", partName: "Special", unitPrice: 12 }])}
      >
        submit-special
      </button>
    </div>
  ),
}));
vi.mock("./AnswerModal/AnswerModal", () => ({
  default: ({
    isOpen,
    onClose,
    onSave,
    options,
    title,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (answer: string) => void;
    options?: Array<{ value: string }>;
    title?: string;
  }) => (
    <div
      data-testid="answer-modal"
      data-open={String(isOpen)}
      data-title={title}
      data-options={options?.map((o) => o.value).join(",")}
    >
      <button type="button" onClick={() => onSave("REPAIR")}>
        answer-save
      </button>
      <button type="button" onClick={onClose}>
        answer-close
      </button>
    </div>
  ),
}));
vi.mock("./ExplosionDiagram/ExplosionDrawingModal", () => ({
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
vi.mock(
  "../../ClaimManagement/ApprovalList/ApprovalListTable/ApprovalDecisionModal/ApprovalDecisionModal",
  () => ({
    default: ({
      isOpen,
      onClose,
      onConfirm,
      title,
      decisionType,
      jobId,
    }: {
      isOpen: boolean;
      onClose: () => void;
      onConfirm: (comments: string) => void;
      title: string;
      decisionType: string | null;
      jobId?: string;
    }) => (
      <div
        data-testid="decision-modal"
        data-open={String(isOpen)}
        data-title={title}
        data-decision={String(decisionType)}
        data-job={jobId}
      >
        <button type="button" onClick={() => onConfirm("my comment")}>
          decision-confirm
        </button>
        <button type="button" onClick={() => onConfirm("")}>
          decision-confirm-empty
        </button>
        <button type="button" onClick={onClose}>
          decision-close
        </button>
      </div>
    ),
  }),
);
vi.mock("../../../components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay", () => ({
  default: () => <div>loading-indicator</div>,
}));

// ── fixtures ────────────────────────────────────────────────────────────────

const field = (name: string, subtype?: string, extra: Partial<Field> = {}): Field => ({
  name,
  label: name,
  type: "text",
  subtype,
  ...extra,
});

const area = (name: string, fields: Field[] = [], extra: Partial<Area> = {}): Area => ({
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
  position: number,
  extra: Partial<Section> = {},
  areas: Area[] = [],
): Section => ({
  name,
  isHidden: false,
  label: name,
  dependFieldCondition: "AND",
  position,
  areas,
  actions: null,
  isSubSection: false,
  isAccordion: false,
  isTab: true,
  ...extra,
});

const editableActions = [{ name: "Save", mode: "primary", onAction: "onSaveAsset" }] as never;

const buildTabs = (): Section[] => [
  section("assetData", 1, { actions: editableActions }),
  section("diagnosticData", 2),
  section("history", 3, { hiddenForStatuses: ["IN_DIAGNOSTICS"] }),
];

const ACTION_NAMES = [
  "onHold",
  "onGoToNextStep",
  "onCustomerAnswer",
  "onSaveCustomer",
  "onCancelSaveCustomer",
  "onSaveAsset",
  "onCancelEditAsset",
  "onAddSparePart",
  "onAddSpecialMaterials",
  "onProductDetails",
  "onValidate",
  "onApproveForRepair",
  "onRequestInternalApproval",
  "onSubmitForReview",
  "onStartRepair",
  "onFinishRepair",
  "onToolDelivered",
  "onCreateCostEstimate",
  "onApprovePreApproval",
  "onRejectPreApproval",
  "onRevisePreApproval",
];

const makeJob = (
  job: Record<string, unknown> = {},
  order: Record<string, unknown> = {},
): Record<string, unknown> => ({
  order: { orderId: "O-1", countryCode: "ZA", ...order },
  job: { jobStatus: "IN_DIAGNOSTICS", isOnHold: false, pendingApprovals: [], ...job },
});

const makeManager = (overrides: Record<string, unknown> = {}) => ({
  materials: [],
  priceSummaryDetailedByJobType: [],
  apiMaterialsLoaded: true,
  apiMaterialsEmpty: false,
  hasExistingDiagnostic: true,
  setMaterials: vi.fn(),
  setPriceSummaryDetailedByJobType: vi.fn(),
  allowedPositions: [],
  addSpecialMaterialsAllowed: false,
  positionDropdownOptions: [],
  getPositionConfig: vi.fn(),
  onAddRow: vi.fn(),
  onDeleteRow: vi.fn(),
  onRestoreRow: vi.fn(),
  onAddMaterials: vi.fn(),
  getExistingPartNumbers: vi.fn(() => new Set<string>()),
  markAllValidated: vi.fn(),
  markRowDirty: vi.fn(),
  enableValidate: vi.fn(() => true),
  setRevisedRejectedRowPending: vi.fn(),
  canArchiveOnDelete: true,
  discountBase: "NET_PRICE",
  automaticRows: [],
  ...overrides,
});

const useJob = (data: Record<string, unknown> | undefined) => {
  h.jobQuery = { data, isLoading: false, error: null };
  useJobByIdMock.mockReturnValue(h.jobQuery);
  h.jobCache = data;
};

const useTabs = (tabs: Section[] = buildTabs()) => {
  h.formInit.tabs = tabs;
  h.formInit.allFields = tabs.flatMap((tab) => tab.areas.flatMap((a) => a.fields));
  return tabs;
};

const resetState = () => {
  h.params = { jobId: "J-1" };
  h.location = { state: null };
  h.user = { countryCode: "ZA", permissions: [] };
  h.jobForm = {
    name: "JobOverview",
    actions: [
      ...ACTION_NAMES.map((onAction) => ({ name: onAction, onAction })),
      { name: "unknown-action", onAction: "doesNotExist" },
      { name: "no-action" },
    ],
    sections: [],
  };
  h.hasSendForReview = false;
  Object.values(h.mutations).forEach((mutation) => {
    mutation.mutate.mockReset();
    mutation.mutateAsync.mockReset();
    mutation.isPending = false;
    mutation.data = undefined;
  });
  h.hookOptions = {};
  h.diagnostic = {
    diagnosticData: undefined,
    diagnosticLoading: false,
    shouldFetchDiagnostic: false,
  };
  h.formInit.initialFormValues = {};
  h.formInit.allFields = [];
  h.formInit.tabs = [];
  h.formInit.mandatoryFields = null;
  h.sectionEditing.editingSections = new Set<string>();
  h.manager = makeManager();
  h.managerCalls.length = 0;
  h.bosch = { pendingTypeFields: [], hasBoschInternalPending: false };
  h.chargeable = { pendingTypeFields: [], hasChargeablePending: false };
  h.hasWarrantyItems = false;
  h.allActionsDisabled = false;
  h.actionDependencyCalls.length = 0;
  h.uploadErrors = [];
  h.apiPayload = {
    order: { customer: { useBillingAddressForDelivery: false, name: "Customer" } },
    job: { asset: { hasAccessories: true, accessories: [{ id: 1 }] } },
    diagnostic: {},
  };
  h.mapped = {};
  h.accessoriesCalls.length = 0;
  h.accessories = { assetsAccessories: [], setAssetsAccessories: vi.fn() };
  h.captured.diagCtx = null;
  h.captured.formCtx = null;
  h.captured.createJobCtx = null;
  h.formik = null;
  h.queryClient.getQueryData.mockImplementation((key: unknown[]) => {
    if (key[0] === "user") return h.user;
    if (key[0] === "UIConfiguration") return h.jobForm ? { forms: [h.jobForm] } : { forms: [] };
    if (key[0] === "job") return h.jobCache;
    return undefined;
  });
  useJob(makeJob());
  globalThis.location.hash = "";
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <MessagesContext.Provider value={{ messages: [], setMessages: h.setMessages as never }}>
    {children}
  </MessagesContext.Provider>
);

let mountedView: { unmount: () => void } | null = null;

// Several tests render the page more than once; unmount the previous tree so that only the
// latest instance writes into the captured contexts.
const renderJob = () => {
  mountedView?.unmount();
  const view = render(<JobOverview />, { wrapper });
  mountedView = view;
  return view;
};
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const diagCtx = () => h.captured.diagCtx as DiagCtxLike;
const formCtx = () => h.captured.formCtx as FormCtxLike;
const callbacks = () => formCtx().actionCallbacks;
const hook = (key: string) => h.hookOptions[key];
const run = async (fn: () => unknown) => {
  await act(async () => {
    await fn();
  });
};
const formValues = () => JSON.parse(screen.getByTestId("form-values").textContent || "{}");

const messages = (): Array<{ text: string; type: string; duration?: number }> => {
  let current: Array<{ text: string; type: string; duration?: number }> = [];
  for (const call of h.setMessages.mock.calls) {
    const update = call[0] as typeof current | ((prev: typeof current) => typeof current);
    current = typeof update === "function" ? update(current) : update;
  }
  return current;
};

const actionHelpers = () => ({
  setErrors: vi.fn(),
  setTouched: vi.fn(async () => undefined),
  setFieldValue: vi.fn(),
});

const setValidated = async (value = true) => {
  await run(() => diagCtx().setArePricesValidated(value));
};

beforeEach(() => {
  vi.clearAllMocks();
  mountedView = null;
  resetState();
});

afterEach(() => {
  globalThis.location.hash = "";
});

describe("JobOverview extended", () => {
  describe("mount behaviour", () => {
    it("invalidates the job and diagnostic queries", () => {
      renderJob();

      expect(h.queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["job", "J-1"] });
      expect(h.queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["diagnostic", "J-1"],
      });
    });

    it("skips invalidation and uses an empty id without a job id", () => {
      h.params = {};
      renderJob();

      expect(h.queryClient.invalidateQueries).not.toHaveBeenCalled();
      expect(useJobByIdMock).toHaveBeenCalledWith("");
      expect(useBreadcrumbs).toHaveBeenCalledWith([
        { label: "jobList", href: "/job-list" },
        { label: "", href: "" },
      ]);
    });

    it("uses the approval list breadcrumb when opened from the approval list", () => {
      h.location = { state: { from: "approval-list" } };
      renderJob();

      expect(useBreadcrumbs).toHaveBeenCalledWith([
        { label: "approvalList", href: "/approval-list" },
        { label: "J-1", href: "" },
      ]);
    });

    it("shows the on-hold banner for jobs on hold", () => {
      useJob(makeJob({ isOnHold: true }));
      renderJob();

      expect(screen.getByTestId("on-hold-banner")).toHaveTextContent("jobOnHoldBanner");
      expect(screen.getByTestId("generic-action")).toHaveAttribute("data-on-hold", "true");
    });

    it("renders without the form definition", () => {
      h.jobForm = null;
      renderJob();

      expect(screen.queryByRole("button", { name: "onHold" })).not.toBeInTheDocument();
      expect(h.actionDependencyCalls.at(-1)?.actions).toEqual([]);
    });

    it("passes the job accessories to the accessories manager", () => {
      useJob(makeJob({ asset: { accessories: [{ name: "Case" }] } }));
      renderJob();

      expect(h.accessoriesCalls.at(-1)).toMatchObject({
        mode: "view",
        apiJobsAccessories: [{ accessories: [{ name: "Case" }] }],
      });
    });

    it("passes an empty accessories list when the job has no accessories", () => {
      renderJob();

      expect(h.accessoriesCalls.at(-1)).toMatchObject({ apiJobsAccessories: [] });
    });

    it("exposes the accessories manager state through the create job context", () => {
      h.accessories = { assetsAccessories: [{ id: "a" }], setAssetsAccessories: vi.fn() };
      renderJob();

      expect(h.captured.createJobCtx).toMatchObject({ assetsAccessories: [{ id: "a" }] });
    });

    it("derives the action and job type for the diagnostics manager", async () => {
      h.formInit.initialFormValues = { actionType: "REPAIR", jobType: "WARRANTY" };
      renderJob();

      await waitFor(() => {
        expect((h.managerCalls.at(-1) as ManagerArgs).currentActionType).toBe("REPAIR");
      });
      expect((h.managerCalls.at(-1) as ManagerArgs).currentJobType).toBe("WARRANTY");
      expect((h.managerCalls.at(-1) as ManagerArgs).jobStatus).toBe("IN_DIAGNOSTICS");
    });

    it("only passes diagnostic data to the manager once tabs exist", () => {
      h.diagnostic.diagnosticData = { jobId: "J-1" };
      renderJob();
      expect((h.managerCalls.at(-1) as ManagerArgs).diagnosticData).toBeUndefined();

      useTabs();
      renderJob();
      expect((h.managerCalls.at(-1) as ManagerArgs).diagnosticData).toEqual({ jobId: "J-1" });
    });
  });

  describe("tabs", () => {
    it("selects the first visible tab and hides tabs for the current status", () => {
      useTabs();
      renderJob();

      expect(screen.getByTestId("tab-nav")).toHaveAttribute("data-selected", "assetData");
      expect(screen.getByTestId("section-assetData")).toBeInTheDocument();
      expect(screen.queryByTestId("tab-history")).not.toBeInTheDocument();
      expect(screen.getByTestId("tab-diagnosticData")).toHaveTextContent("diagnosticData");
    });

    it("selects the tab from the location hash", () => {
      globalThis.location.hash = "#diagnosticData";
      useTabs();
      renderJob();

      expect(screen.getByTestId("section-diagnosticData")).toBeInTheDocument();
    });

    it("applies a hash tab that only becomes visible later", async () => {
      globalThis.location.hash = "#diagnosticData";
      useTabs([section("assetData", 1)]);
      const { rerender } = renderJob();
      expect(screen.getByTestId("section-assetData")).toBeInTheDocument();

      useTabs([section("assetData", 1), section("diagnosticData", 2)]);
      rerender(<JobOverview />);

      await waitFor(() => {
        expect(screen.getByTestId("section-diagnosticData")).toBeInTheDocument();
      });
    });

    it("does not re-apply the hash after the user picked another tab", () => {
      globalThis.location.hash = "#assetData";
      useTabs();
      const { rerender } = renderJob();

      click("select-diagnostic-tab");
      useTabs(buildTabs());
      rerender(<JobOverview />);

      expect(screen.getByTestId("section-diagnosticData")).toBeInTheDocument();
    });

    it("switches the visible section when another tab is selected", () => {
      useTabs();
      renderJob();

      click("select-diagnostic-tab");

      expect(screen.getByTestId("section-diagnosticData")).toBeInTheDocument();
      expect(screen.queryByTestId("section-assetData")).not.toBeInTheDocument();
    });

    it("shows hidden tabs for other statuses", () => {
      useJob(makeJob({ jobStatus: "READY_FOR_DIAGNOSTIC" }));
      useTabs();
      renderJob();

      expect(screen.getByTestId("tab-history")).toBeInTheDocument();
    });
  });

  describe("section rendering", () => {
    it("opens tabs in edit mode while they are being edited", () => {
      h.sectionEditing.editingSections = new Set(["assetData"]);
      useTabs();
      renderJob();

      const sectionEl = screen.getByTestId("section-assetData");
      expect(sectionEl).toHaveAttribute("data-disabled", "false");
      expect(sectionEl).toHaveAttribute("data-mode", "edit");
      expect(screen.getByTestId("generic-action")).toHaveAttribute("data-mode", "edit");
    });

    it("locks sections with editable actions when every action is disabled", () => {
      h.allActionsDisabled = true;
      useTabs();
      renderJob();

      expect(screen.getByTestId("section-assetData")).toHaveAttribute("data-disabled", "true");
    });

    it("does not lock sections without editable actions when every action is disabled", () => {
      h.allActionsDisabled = true;
      globalThis.location.hash = "#diagnosticData";
      useTabs();
      renderJob();

      expect(screen.getByTestId("section-diagnosticData")).toHaveAttribute("data-disabled", "auto");
    });

    it("locks sections of jobs on hold", () => {
      useJob(makeJob({ isOnHold: true }));
      globalThis.location.hash = "#diagnosticData";
      useTabs();
      renderJob();

      expect(screen.getByTestId("section-diagnosticData")).toHaveAttribute("data-disabled", "true");
    });

    it("lets sections with actions be edited while ready for diagnostic", () => {
      useJob(makeJob({ jobStatus: "READY_FOR_DIAGNOSTIC" }));
      useTabs();
      renderJob();

      click("edit-assetData");

      expect(h.sectionEditing.enableSectionEditing).toHaveBeenCalledWith("assetData");
    });

    it("does not enable section editing without a job id", () => {
      h.params = {};
      useJob(makeJob({ jobStatus: "READY_FOR_DIAGNOSTIC" }));
      useTabs();
      renderJob();

      click("edit-assetData");

      expect(h.sectionEditing.enableSectionEditing).not.toHaveBeenCalled();
    });

    it.each([
      ["not ready for diagnostic", { jobStatus: "IN_DIAGNOSTICS" }],
      ["on hold", { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: true }],
    ])("does not offer editing when the job is %s", (_label, job) => {
      useJob(makeJob(job));
      useTabs();
      renderJob();

      expect(screen.getByTestId("section-assetData")).toHaveAttribute("data-editable", "false");
    });

    it("does not offer editing for sections without actions", () => {
      useJob(makeJob({ jobStatus: "READY_FOR_DIAGNOSTIC" }));
      globalThis.location.hash = "#diagnosticData";
      useTabs();
      renderJob();

      expect(screen.getByTestId("section-diagnosticData")).toHaveAttribute(
        "data-editable",
        "false",
      );
    });

    it("shows a loading indicator while the diagnostic is being fetched", () => {
      h.diagnostic = {
        diagnosticData: undefined,
        diagnosticLoading: true,
        shouldFetchDiagnostic: true,
      };
      globalThis.location.hash = "#diagnosticData";
      useTabs();
      renderJob();

      expect(screen.getByText("loading-indicator")).toBeInTheDocument();
      expect(screen.queryByTestId("section-diagnosticData")).not.toBeInTheDocument();
    });

    it("builds the action dependency context from the current job", () => {
      h.user = { countryCode: "ZA", permissions: ["P"] };
      renderJob();

      const ctx = h.actionDependencyCalls.at(-1)!.ctx;
      expect(ctx.currentMode).toBe("view");
      expect(ctx.currentStatus).toBe("IN_DIAGNOSTICS");
      expect(ctx.user).toEqual({ countryCode: "ZA", permissions: ["P"] });
    });

    it("evaluates callbacks lazily in the action dependency context", () => {
      renderJob();

      const ctx = h.actionDependencyCalls.at(-1)!.ctx;
      expect(ctx.actionCallbacks.enableHold()).toBe(true);
      expect(ctx.actionCallbacks.showAddRow()).toBe(true);
    });

    it("reports edit mode in the action dependency context while editing", () => {
      h.sectionEditing.editingSections = new Set(["assetData"]);
      renderJob();

      expect(h.actionDependencyCalls.at(-1)!.ctx.currentMode).toBe("edit");
    });

    it("treats jobs on hold as read-only", () => {
      useJob(makeJob({ isOnHold: true }));
      useTabs();
      renderJob();

      expect(screen.getByTestId("section-assetData")).toHaveAttribute("data-disabled", "true");
    });
  });

  describe("route and form data sync", () => {
    it("maps the loaded job into the form values", async () => {
      h.mapped = { faultCode: "F1", other: 1 };
      h.formInit.allFields = [field("a")];
      renderJob();

      await waitFor(() => expect(h.formInit.setInitialFormValues).toHaveBeenCalled());
      const updater = h.formInit.setInitialFormValues.mock.calls[0][0] as (
        prev: Record<string, unknown>,
      ) => Record<string, unknown>;
      expect(updater({ prev: true })).toEqual({
        prev: true,
        faultCode: "F1",
        faultCodeDropdown: "F1",
        other: 1,
        discountBase: "NET_PRICE",
      });
    });

    it("does not add a fault code dropdown when the job has no fault code", async () => {
      h.formInit.allFields = [field("a")];
      renderJob();

      await waitFor(() => expect(h.formInit.setInitialFormValues).toHaveBeenCalled());
      const updater = h.formInit.setInitialFormValues.mock.calls[0][0] as (
        prev: Record<string, unknown>,
      ) => Record<string, unknown>;
      expect(updater({})).toEqual({ discountBase: "NET_PRICE" });
    });

    it("does not map the job before the form fields exist", () => {
      renderJob();

      expect(h.formInit.setInitialFormValues).not.toHaveBeenCalled();
    });

    it("synchronises the discount base into the form values", async () => {
      h.manager = makeManager({ discountBase: "GROSS_PRICE" });
      renderJob();

      await waitFor(() => {
        expect(formValues().discountBase).toBe("GROSS_PRICE");
      });
    });

    it("marks explosion drawing parts as belonging to the tool", () => {
      h.formInit.allFields = [
        field("row0_partNumber", "diagnosticPartNumber"),
        field("row1_partNumber", "diagnosticPartNumber"),
      ];
      h.manager = makeManager({
        materials: [
          { origin: "explosionDrawing" },
          { origin: "specialMaterial" },
          { origin: "explosionDrawing" },
        ],
      });
      renderJob();

      expect(formCtx().sparePartNotBelongsToTool.current).toEqual({ row0_partNumber: false });
    });

    it("skips the belongs-to-tool marking without form fields or materials", () => {
      h.manager = makeManager({ materials: [{ origin: "explosionDrawing" }] });
      h.formInit.allFields = null;
      renderJob();

      expect(formCtx().sparePartNotBelongsToTool.current).toEqual({});
    });
  });

  describe("simple mutations", () => {
    it("reports saved asset data", () => {
      renderJob();

      act(() => hook("patchJob").onSuccess());
      act(() => hook("patchJob").onError());

      expect(h.queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["job", "J-1"] });
      expect(messages().map((m) => m.text)).toEqual(["successSaveAssetData", "errorSaveAssetData"]);
    });

    it("reports the job status update", () => {
      renderJob();

      act(() => hook("startDiagnostic").onSuccess());
      act(() => hook("startDiagnostic").onError());

      expect(h.queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["jobs"] });
      expect(messages().map((m) => m.text)).toEqual([
        "successUpdateJobStatus",
        "errorUpdateJobStatus",
      ]);
    });

    it("reports customer data updates", () => {
      renderJob();

      act(() => hook("postCustomer").onSuccess());
      act(() => hook("postCustomer").onError());

      expect(h.queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["order", "O-1"] });
      expect(h.queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["autocomplete"],
      });
      expect(messages().map((m) => m.text)).toEqual([
        "successCustomerDataUpdate",
        "errorUpdateCustomerData",
      ]);
    });

    it("reports a toggled hold and scrolls to top", () => {
      renderJob();

      act(() => hook("toggleHold").onSuccess());
      act(() => hook("toggleHold").onError());

      expect(messages().map((m) => m.text)).toEqual(["successToggleJobHold", "errorToggleJobHold"]);
      expect(scrollToTop).toHaveBeenCalled();
    });

    it("reports a resumed hold when the job was on hold before toggling", () => {
      useJob(makeJob({ isOnHold: true }));
      renderJob();

      click("onHold");
      act(() => hook("toggleHold").onSuccess());

      expect(messages().at(-1)?.text).toBe("successResumeJobHold");
    });

    it("reports note saving results", () => {
      h.formInit.initialFormValues = { jobType: "WARRANTY" };
      renderJob();

      act(() => hook("postMessage").onSuccess());
      act(() => hook("postMessage").onError());

      expect(h.queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["messages", "J-1"],
      });
      expect(h.track.trackNoteAdded).toHaveBeenCalledWith({
        noteContext: "JOB",
        jobStatus: "js:IN_DIAGNOSTICS",
        jobType: "jt:WARRANTY",
      });
      expect(messages().map((m) => m.text)).toEqual(["successAddNote", "errorAddNote"]);
    });

    it("reports customer answer results", async () => {
      renderJob();

      await run(() => hook("customerAnswer").onSuccess());
      act(() => hook("customerAnswer").onError());

      expect(h.queryClient.refetchQueries).toHaveBeenCalledWith({ queryKey: ["job", "J-1"] });
      expect(messages().map((m) => m.text)).toEqual([
        "successSubmitCustomerAnswer",
        "errorSubmitCustomerAnswer",
      ]);
    });

    it("reports the approval request error with the API message", () => {
      renderJob();

      act(() => hook("internalApproval").onError(new Error("x")));

      expect(messages().at(-1)).toMatchObject({
        text: "errorRequestInternalApproval",
        type: "error",
        duration: 5000,
      });
      expect(scrollToTop).toHaveBeenCalled();
    });
  });

  describe("workflow mutations with analytics", () => {
    const cases: Array<[string, string, string, string, string?]> = [
      ["startRepair", "successStartRepair", "errorStartRepair", "trackRepairStarted"],
      ["finishRepair", "successFinishRepair", "errorFinishRepair", "trackRepairFinished"],
      [
        "startReview",
        "successSubmitForReview",
        "errorSubmitForReview",
        "trackJobSubmittedForReview",
      ],
      [
        "repairApproval",
        "successApproveForRepair",
        "errorApproveForRepair",
        "trackJobApprovedForRepair",
      ],
      [
        "internalApproval",
        "successRequestInternalApproval",
        "errorRequestInternalApproval",
        "trackPreApprovalRequested",
      ],
    ];

    it.each(cases)(
      "%s refreshes data, reports and tracks analytics",
      async (key, ok, _err, track) => {
        h.formInit.initialFormValues = { jobType: "WARRANTY" };
        renderJob();

        await run(() => hook(key).onSuccess());

        expect(h.queryClient.refetchQueries).toHaveBeenCalledTimes(4);
        expect(h.queryClient.refetchQueries).toHaveBeenCalledWith({
          queryKey: ["messages", "J-1"],
        });
        expect(messages().at(-1)).toMatchObject({ text: ok, type: "success" });
        expect(h.track[track as keyof typeof h.track]).toHaveBeenCalledWith({
          jobType: "jt:WARRANTY",
          jobStatus: "js:IN_DIAGNOSTICS",
        });
      },
    );

    it.each(cases.filter(([key]) => key !== "internalApproval"))(
      "%s reports its error",
      (key, _ok, err) => {
        renderJob();

        act(() => hook(key).onError());

        expect(messages().at(-1)).toMatchObject({ text: err, type: "error" });
      },
    );

    it("does not track analytics without a job type", async () => {
      renderJob();

      await run(() => hook("startRepair").onSuccess());

      expect(h.track.trackRepairStarted).not.toHaveBeenCalled();
    });

    it("does not track analytics without a cached job status", async () => {
      h.formInit.initialFormValues = { jobType: "WARRANTY" };
      renderJob();
      h.jobCache = undefined;

      await run(() => hook("startRepair").onSuccess());

      expect(h.track.trackRepairStarted).not.toHaveBeenCalled();
    });

    it("tracks a completed job when the tool is delivered", async () => {
      h.formInit.initialFormValues = { jobType: "WARRANTY" };
      renderJob();

      await run(() => hook("toolDelivered").onSuccess());
      act(() => hook("toolDelivered").onError());

      expect(h.track.trackJobCompleted).toHaveBeenCalledWith({
        jobType: "jt:WARRANTY",
        jobStatus: "js:IN_DIAGNOSTICS",
        completionType: "DELIVERED",
      });
      expect(messages().map((m) => m.text)).toEqual(["successToolDelivered", "errorToolDelivered"]);
    });
  });

  describe("cost estimate", () => {
    const createObjectURL = vi.fn(() => "blob:cost");
    const revokeObjectURL = vi.fn();
    const revokeCallbacks: Array<() => void> = [];
    const realSetTimeout = globalThis.setTimeout;

    beforeEach(() => {
      createObjectURL.mockClear();
      revokeObjectURL.mockClear();
      revokeCallbacks.length = 0;
      (globalThis.URL as unknown as Record<string, unknown>).createObjectURL = createObjectURL;
      (globalThis.URL as unknown as Record<string, unknown>).revokeObjectURL = revokeObjectURL;
      vi.spyOn(globalThis, "setTimeout").mockImplementation(((
        callback: () => void,
        delay?: number,
        ...args: unknown[]
      ) => {
        if (delay === 1000) {
          revokeCallbacks.push(callback);
          return 0;
        }
        return realSetTimeout(callback, delay, ...args);
      }) as unknown as typeof setTimeout);
    });

    afterEach(() => {
      vi.mocked(globalThis.setTimeout).mockRestore();
    });

    it("opens the generated PDF and revokes the URL afterwards", async () => {
      vi.mocked(getCostEstimationPdf).mockResolvedValue(new Blob(["pdf"]));
      const openSpy = vi.spyOn(window, "open").mockReturnValue({} as Window);
      renderJob();

      await run(() => hook("createCostEstimate").onSuccess());

      expect(createObjectURL).toHaveBeenCalled();
      expect(openSpy).toHaveBeenCalledWith("blob:cost", "_blank");
      expect(revokeObjectURL).not.toHaveBeenCalled();
      expect(revokeCallbacks).toHaveLength(1);

      revokeCallbacks[0]();

      expect(revokeObjectURL).toHaveBeenCalledWith("blob:cost");
      expect(messages().at(-1)?.text).toBe("successCreateCostEstimate");
      openSpy.mockRestore();
    });

    it("does not schedule a revoke when the window was blocked", async () => {
      vi.mocked(getCostEstimationPdf).mockResolvedValue(new Blob(["pdf"]));
      const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
      renderJob();

      await run(() => hook("createCostEstimate").onSuccess());

      expect(revokeCallbacks).toHaveLength(0);
      expect(revokeObjectURL).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });

    it("skips opening when no PDF was returned", async () => {
      vi.mocked(getCostEstimationPdf).mockResolvedValue(undefined as never);
      const openSpy = vi.spyOn(window, "open").mockReturnValue({} as Window);
      renderJob();

      await run(() => hook("createCostEstimate").onSuccess());

      expect(openSpy).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });

    it("skips the PDF download without a job id", async () => {
      h.params = {};
      renderJob();

      await run(() => hook("createCostEstimate").onSuccess());

      expect(getCostEstimationPdf).not.toHaveBeenCalled();
    });

    it("reports a failed cost estimate", () => {
      renderJob();

      act(() => hook("createCostEstimate").onError());

      expect(messages().at(-1)?.text).toBe("errorCreateCostEstimate");
    });
  });

  describe("pre-approval decisions", () => {
    const preApprovalFields = [
      field("row0_preApprovalCheckbox", "x", {
        fieldMapping: { originalName: "preApprovalCheckbox" },
      }),
      field("row1_preApprovalCheckbox", "x", {
        fieldMapping: { originalName: "preApprovalCheckbox" },
      }),
      field("row2_preApprovalCheckbox", "x", {
        fieldMapping: { originalName: "preApprovalCheckbox" },
      }),
      field("other", "x"),
    ];

    beforeEach(() => {
      h.formInit.allFields = preApprovalFields;
      h.formInit.initialFormValues = {
        jobType: "WARRANTY",
        row0_preApprovalCheckbox: true,
        row0_materialId: "M0",
        row1_preApprovalCheckbox: false,
        row1_materialId: "M1",
        row2_preApprovalCheckbox: true,
        row2_materialId: "",
      };
    });

    it.each([
      ["onApprovePreApproval", "approved", "approvePreApproval"],
      ["onRejectPreApproval", "rejected", "rejectPreApproval"],
      ["onRevisePreApproval", "revised", "revisePreApproval"],
    ])("opens the decision modal for %s", (action, decision, title) => {
      renderJob();
      expect(screen.getByTestId("decision-modal")).toHaveAttribute("data-open", "false");

      click(action);

      expect(screen.getByTestId("decision-modal")).toHaveAttribute("data-open", "true");
      expect(screen.getByTestId("decision-modal")).toHaveAttribute("data-decision", decision);
      expect(screen.getByTestId("decision-modal")).toHaveAttribute("data-title", title);
      expect(screen.getByTestId("decision-modal")).toHaveAttribute("data-job", "J-1");

      click("decision-close");
      expect(screen.getByTestId("decision-modal")).toHaveAttribute("data-open", "false");
      expect(screen.getByTestId("decision-modal")).toHaveAttribute("data-title", "");
    });

    it.each([
      ["onApprovePreApproval", "APPROVED"],
      ["onRejectPreApproval", "REJECTED"],
      ["onRevisePreApproval", "REVISED"],
    ])("submits %s with the selected materials", (action, status) => {
      renderJob();
      click(action);

      click("decision-confirm");

      expect(h.mutations.updateApproval.mutate).toHaveBeenCalledWith(
        { jobId: "J-1", materialIds: ["M0"], approvalStatus: status, message: "my comment" },
        expect.any(Object),
      );
      expect(screen.getByTestId("decision-modal")).toHaveAttribute("data-open", "false");
    });

    it("sends a null message for empty comments", () => {
      renderJob();
      click("onApprovePreApproval");

      click("decision-confirm-empty");

      expect(h.mutations.updateApproval.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ message: null }),
        expect.any(Object),
      );
    });

    it("ignores a confirmation when no decision is pending", () => {
      renderJob();

      click("decision-confirm");

      expect(h.mutations.updateApproval.mutate).not.toHaveBeenCalled();
    });

    it("tracks the reviewed pre-approval after a successful decision", () => {
      renderJob();
      click("onApprovePreApproval");
      click("decision-confirm");

      const options = h.mutations.updateApproval.mutate.mock.calls[0][1] as Record<string, AnyFn>;
      options.onSuccess();

      expect(h.track.trackPreApprovalReviewed).toHaveBeenCalledWith({
        jobType: "jt:WARRANTY",
        jobStatus: "js:IN_DIAGNOSTICS",
        preApprovalAction: "approved",
      });
    });

    it("does not track a review without a job type", () => {
      h.formInit.initialFormValues = {};
      renderJob();
      click("onApprovePreApproval");
      click("decision-confirm");

      const options = h.mutations.updateApproval.mutate.mock.calls[0][1] as Record<string, AnyFn>;
      options.onSuccess();

      expect(h.track.trackPreApprovalReviewed).not.toHaveBeenCalled();
    });

    it("ignores decisions without a job id", () => {
      h.params = {};
      renderJob();

      click("onApprovePreApproval");
      click("onRejectPreApproval");
      click("onRevisePreApproval");

      expect(screen.getByTestId("decision-modal")).toHaveAttribute("data-open", "false");
    });

    it("navigates to the approval list once no internal approval is pending", async () => {
      renderJob();

      await run(() => hook("updateApproval").onSuccess());

      expect(messages().at(-1)?.text).toBe("successfulJobPreApprovalDecision");
      expect(h.navigate).toHaveBeenCalledWith("/approval-list");
      expect(scrollToTop).toHaveBeenCalled();
    });

    it("stays on the page while an internal approval is still pending", async () => {
      useJob(makeJob({ pendingApprovals: ["BOSCH_INTERNAL"] }));
      renderJob();

      await run(() => hook("updateApproval").onSuccess());

      expect(h.navigate).not.toHaveBeenCalled();
      expect(scrollToTop).toHaveBeenCalled();
    });

    it("reports a failed decision", () => {
      renderJob();

      act(() => hook("updateApproval").onError());

      expect(messages().at(-1)).toMatchObject({
        text: "errorJobPreApprovalDecision",
        type: "error",
      });
      expect(scrollToTop).toHaveBeenCalled();
    });
  });

  describe("workflow actions", () => {
    it("holds the job and clears the editing sections", () => {
      renderJob();

      click("onHold");

      expect(h.sectionEditing.setEditingSections).toHaveBeenCalledWith(new Set());
      expect(h.mutations.toggleHold.mutate).toHaveBeenCalledWith({ jobId: "J-1" });
    });

    it("moves to the next step and opens the diagnostic tab afterwards", () => {
      useTabs();
      renderJob();

      click("onGoToNextStep");
      const [payload, options] = h.mutations.startDiagnostic.mutate.mock.calls[0] as [
        unknown,
        Record<string, AnyFn>,
      ];
      expect(payload).toEqual({ jobId: "J-1" });
      act(() => options.onSuccess());

      expect(screen.getByTestId("section-diagnosticData")).toBeInTheDocument();
    });

    it.each([
      ["onApproveForRepair", "repairApproval"],
      ["onRequestInternalApproval", "internalApproval"],
      ["onSubmitForReview", "startReview"],
      ["onStartRepair", "startRepair"],
      ["onToolDelivered", "toolDelivered"],
      ["onCreateCostEstimate", "createCostEstimate"],
      ["onFinishRepair", "finishRepair"],
    ])("%s triggers its mutation", (action, key) => {
      renderJob();

      click(action);

      expect(h.mutations[key].mutate).toHaveBeenCalledWith({ jobId: "J-1" });
    });

    it("does nothing for any workflow action without a job id", () => {
      h.params = {};
      renderJob();

      ACTION_NAMES.filter((name) =>
        [
          "onHold",
          "onGoToNextStep",
          "onApproveForRepair",
          "onRequestInternalApproval",
          "onSubmitForReview",
          "onStartRepair",
          "onFinishRepair",
          "onToolDelivered",
          "onCreateCostEstimate",
        ].includes(name),
      ).forEach(click);

      Object.entries(h.mutations).forEach(([, mutation]) => {
        expect(mutation.mutate).not.toHaveBeenCalled();
      });
    });

    it("ignores unknown actions", () => {
      renderJob();

      click("unknown-action");
      click("no-action");

      Object.values(h.mutations).forEach((mutation) => {
        expect(mutation.mutate).not.toHaveBeenCalled();
      });
    });

    it("asks the customer for an answer with repair options", () => {
      h.formInit.initialFormValues = { actionType: "REPAIR" };
      renderJob();

      click("onCustomerAnswer");

      expect(screen.getByTestId("answer-modal")).toHaveAttribute("data-open", "true");
      expect(screen.getByTestId("answer-modal")).toHaveAttribute(
        "data-options",
        CUSTOMER_ANSWER_REPAIR_OPTIONS.map((o) => o.value).join(","),
      );
      expect(screen.getByTestId("answer-modal")).toHaveAttribute("data-title", "customerAnswer");
    });

    it("offers exchange options for other action types", () => {
      h.formInit.initialFormValues = { actionType: "NEW_TOOL_EXCHANGE" };
      renderJob();

      expect(screen.getByTestId("answer-modal")).toHaveAttribute(
        "data-options",
        CUSTOMER_ANSWER_EXCHANGE_OPTIONS.map((o) => o.value).join(","),
      );
    });

    it("submits the customer answer and closes the modal on success", () => {
      renderJob();
      click("onCustomerAnswer");

      click("answer-save");
      const [payload, options] = h.mutations.customerAnswer.mutate.mock.calls[0] as [
        unknown,
        Record<string, AnyFn>,
      ];
      expect(payload).toEqual({ jobId: "J-1", answer: "REPAIR" });
      act(() => options.onSuccess());

      expect(screen.getByTestId("answer-modal")).toHaveAttribute("data-open", "false");
    });

    it("closes the answer modal on cancel", () => {
      renderJob();
      click("onCustomerAnswer");

      click("answer-close");

      expect(screen.getByTestId("answer-modal")).toHaveAttribute("data-open", "false");
    });

    it("does not submit a customer answer without a job id", () => {
      h.params = {};
      renderJob();

      click("answer-save");

      expect(h.mutations.customerAnswer.mutate).not.toHaveBeenCalled();
    });

    it("adds a spare part row with the current form values", () => {
      h.formInit.initialFormValues = { jobType: "WARRANTY" };
      renderJob();

      click("onAddSparePart");

      expect(h.manager.onAddRow).toHaveBeenCalledWith({ jobType: "WARRANTY" });
    });
  });

  describe("special materials and product details", () => {
    it("warns and keeps the modal closed when special materials are not allowed", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      renderJob();

      click("onAddSpecialMaterials");

      expect(warn).toHaveBeenCalled();
      expect(screen.getByTestId("special-modal")).toHaveAttribute("data-open", "false");
      warn.mockRestore();
    });

    it("silently ignores missing form values when special materials are allowed", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      h.manager = makeManager({ addSpecialMaterialsAllowed: true });
      renderJob();

      act(() => callbacks().onAddSpecialMaterials(undefined));

      expect(warn).not.toHaveBeenCalled();
      expect(screen.getByTestId("special-modal")).toHaveAttribute("data-open", "false");
      warn.mockRestore();
    });

    it("opens the special material modal with the existing part numbers", () => {
      h.manager = makeManager({
        addSpecialMaterialsAllowed: true,
        getExistingPartNumbers: vi.fn(() => new Set(["X", "Y"])),
      });
      renderJob();

      click("onAddSpecialMaterials");

      expect(screen.getByTestId("special-modal")).toHaveAttribute("data-open", "true");
      expect(screen.getByTestId("special-modal")).toHaveAttribute("data-existing", "X,Y");
      expect(screen.getByTestId("special-modal")).toHaveAttribute("data-job", "J-1");
    });

    it("adds special materials as spare parts of the current job type", () => {
      h.formInit.initialFormValues = { jobType: "WARRANTY" };
      renderJob();

      click("submit-special");

      expect(h.manager.onAddMaterials).toHaveBeenCalledWith(
        [
          {
            position: "SP",
            partNumber: "S1",
            description: "Special",
            type: "WARRANTY",
            quantity: 1,
            unitPrice: 12,
            origin: "specialMaterial",
          },
        ],
        expect.any(Function),
      );
    });

    it("falls back to an empty job type for special materials", () => {
      renderJob();

      click("submit-special");

      expect(h.manager.onAddMaterials).toHaveBeenCalledWith(
        [expect.objectContaining({ type: "" })],
        expect.any(Function),
      );
    });

    it("opens the explosion drawing and adds only parts with a part number", () => {
      h.formInit.initialFormValues = { jobType: "WARRANTY" };
      h.manager = makeManager({ materials: [{ position: "SP" }] });
      renderJob();
      expect(screen.queryByTestId("explosion-modal")).not.toBeInTheDocument();

      click("onProductDetails");
      expect(screen.getByTestId("explosion-modal")).toHaveAttribute("data-existing", "1");
      click("submit-explosion");

      expect(h.manager.onAddMaterials).toHaveBeenCalledWith(
        [
          {
            position: "SP",
            partNumber: "E1",
            notBelongsToTool: false,
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

    it("falls back to an empty job type for explosion drawing parts", () => {
      renderJob();
      click("onProductDetails");

      click("submit-explosion");

      expect(h.manager.onAddMaterials).toHaveBeenCalledWith(
        [expect.objectContaining({ type: "" })],
        expect.any(Function),
      );
    });

    it("maps current materials to position items for the diagnostics context", () => {
      h.manager = makeManager({
        materials: [
          {
            position: "SP",
            partNumber: "P1",
            description: "Part",
            type: "WARRANTY",
            quantity: 2,
            unitPrice: 5,
          },
        ],
      });
      renderJob();

      expect(diagCtx().getExistingMaterialsAsPositionItems()).toEqual([
        {
          position: "SP",
          partNumber: "P1",
          partName: "Part",
          type: "WARRANTY",
          positionType: "",
          quantity: 2,
          unitPrice: 5,
        },
      ]);
    });
  });

  describe("customer and asset saving", () => {
    it("saves customer data and closes the section", () => {
      renderJob();

      click("onSaveCustomer");

      expect(h.mutations.postCustomer.mutate).toHaveBeenCalledWith(
        {
          orderId: "O-1",
          payload: { useBillingAddressForDelivery: false, name: "Customer" },
        },
        { onSuccess: expect.any(Function), onError: expect.any(Function) },
      );
      expect(h.sectionEditing.disableSectionEditing).toHaveBeenCalledWith("customerAndPaymentData");
    });

    it("clears the delivery address when the billing address is reused", async () => {
      h.apiPayload.order!.customer.useBillingAddressForDelivery = true;
      renderJob();

      click("onSaveCustomer");

      await waitFor(() => expect(h.mutations.postCustomer.mutate).toHaveBeenCalled());
      expect(h.mutations.postCustomer.mutate.mock.calls[0][0].payload.deliveryAddress).toBeNull();
    });

    it("reports save errors and closes the section on success", async () => {
      renderJob();
      click("onSaveCustomer");
      await waitFor(() => expect(h.mutations.postCustomer.mutate).toHaveBeenCalled());
      const options = h.mutations.postCustomer.mutate.mock.calls[0][1] as Record<string, AnyFn>;
      h.sectionEditing.disableSectionEditing.mockClear();

      act(() => options.onSuccess());
      act(() => options.onError());

      expect(h.sectionEditing.disableSectionEditing).toHaveBeenCalledWith("customerAndPaymentData");
      expect(messages().at(-1)).toMatchObject({ text: "errorUpdateCustomerData", type: "error" });
    });

    it("does not save customer data without an order id", () => {
      useJob({ job: { jobStatus: "IN_DIAGNOSTICS" } });
      renderJob();

      click("onSaveCustomer");

      expect(h.mutations.postCustomer.mutate).not.toHaveBeenCalled();
    });

    it("does not save customer data without form fields", () => {
      h.formInit.allFields = null;
      renderJob();

      click("onSaveCustomer");

      expect(h.mutations.postCustomer.mutate).not.toHaveBeenCalled();
    });

    it("cancels customer and asset editing", () => {
      renderJob();

      click("onCancelSaveCustomer");
      click("onCancelEditAsset");

      expect(h.sectionEditing.disableSectionEditing).toHaveBeenCalledWith(
        "customerAndPaymentData",
        true,
      );
      expect(h.sectionEditing.disableSectionEditing).toHaveBeenCalledWith("assetData", true);
    });

    it("saves the asset including accessories", async () => {
      renderJob();

      click("onSaveAsset");

      await waitFor(() => expect(h.mutations.patchJob.mutate).toHaveBeenCalled());
      expect(h.mutations.patchJob.mutate.mock.calls[0][0]).toEqual({
        jobId: "J-1",
        data: { asset: { hasAccessories: true, accessories: [{ id: 1 }] } },
      });
      const options = h.mutations.patchJob.mutate.mock.calls[0][1] as Record<string, AnyFn>;
      act(() => options.onSuccess());
      expect(h.sectionEditing.disableSectionEditing).toHaveBeenCalledWith("assetData", true);
    });

    it("drops accessories when the asset has none", async () => {
      h.apiPayload.job!.asset.hasAccessories = false;
      renderJob();

      click("onSaveAsset");

      await waitFor(() => expect(h.mutations.patchJob.mutate).toHaveBeenCalled());
      expect(h.mutations.patchJob.mutate.mock.calls[0][0].data.asset.accessories).toBeNull();
    });

    it("saves an asset even when the mapped payload has no job", async () => {
      h.apiPayload = {};
      renderJob();

      click("onSaveAsset");

      await waitFor(() => expect(h.mutations.patchJob.mutate).toHaveBeenCalled());
      expect(h.mutations.patchJob.mutate.mock.calls[0][0].data).toEqual({
        asset: { accessories: null },
      });
    });

    it("saves the asset directly through the form callback without helpers", async () => {
      renderJob();

      await run(() => callbacks().onSaveAsset({ a: 1 }));

      expect(h.mutations.patchJob.mutate).toHaveBeenCalledTimes(1);
    });

    it("does not save the asset without form values or a job id", async () => {
      renderJob();
      await run(() => callbacks().onSaveAsset(undefined));
      expect(h.mutations.patchJob.mutate).not.toHaveBeenCalled();
    });

    it("does not save the asset without a job id", async () => {
      h.params = {};
      renderJob();

      await run(() => callbacks().onSaveAsset({ a: 1 }));

      expect(h.mutations.patchJob.mutate).not.toHaveBeenCalled();
    });
  });

  describe("notes", () => {
    it("posts a trimmed note and closes the editor", () => {
      renderJob();
      const helpers = actionHelpers();

      act(() => callbacks().onSaveNewNote({ note: "  hello  " }, helpers));

      expect(h.mutations.postMessage.mutate).toHaveBeenCalledWith({
        jobId: "J-1",
        messageId: null,
        messageType: "GENERAL",
        decision: null,
        message: "hello",
      });
      expect(helpers.setFieldValue).toHaveBeenCalledWith("note", "");
      const updater = h.sectionEditing.setEditingSections.mock.calls.at(-1)![0] as (
        prev: Set<string>,
      ) => Set<string>;
      expect(Array.from(updater(new Set(["notes", "x"])))).toEqual(["x"]);
    });

    it("ignores blank notes and missing job ids", () => {
      renderJob();
      act(() => callbacks().onSaveNewNote({ note: "  " }, actionHelpers()));
      act(() => callbacks().onSaveNewNote(undefined, actionHelpers()));
      expect(h.mutations.postMessage.mutate).not.toHaveBeenCalled();

      h.params = {};
      renderJob();
      act(() => callbacks().onSaveNewNote({ note: "x" }, actionHelpers()));
      expect(h.mutations.postMessage.mutate).not.toHaveBeenCalled();
    });

    it("cancels a note without a field helper", () => {
      renderJob();

      act(() => callbacks().onCancelNewNote({}, undefined));

      expect(h.sectionEditing.setEditingSections).toHaveBeenCalled();
    });
  });

  describe("finish repair validation", () => {
    const uploadField = field("upload_field", "x", {
      type: "upload",
      fieldMapping: { originalName: "upload" },
    });

    it("blocks finishing when the upload field has errors", () => {
      h.formInit.allFields = [uploadField];
      h.uploadErrors = ["uploadError"];
      renderJob();

      click("onFinishRepair");

      expect(h.mutations.finishRepair.mutate).not.toHaveBeenCalled();
      expect(messages().at(-1)).toMatchObject({ text: "uploadError", type: "error" });
      expect(scrollToTop).toHaveBeenCalled();
    });

    it("requires an invoice for warranty items with a purchase date", () => {
      h.formInit.allFields = [uploadField];
      h.formInit.initialFormValues = { purchaseDate: "2024-01-01" };
      h.hasWarrantyItems = true;
      useJob(makeJob({ asset: { attachments: [{ type: "Manual" }] } }));
      renderJob();

      click("onFinishRepair");

      expect(h.mutations.finishRepair.mutate).not.toHaveBeenCalled();
      expect(messages().map((m) => m.text)).toContain("InvoiceWarrantyValidation");
    });

    it("finishes when an invoice attachment exists", () => {
      h.formInit.allFields = [uploadField];
      h.formInit.initialFormValues = { purchaseDate: "2024-01-01" };
      h.hasWarrantyItems = true;
      useJob(makeJob({ asset: { attachments: [{ type: "INVOICE" }, null] } }));
      renderJob();

      click("onFinishRepair");

      expect(h.mutations.finishRepair.mutate).toHaveBeenCalledWith({ jobId: "J-1" });
    });

    it("finishes without an invoice when there is no purchase date or warranty item", () => {
      h.formInit.allFields = [uploadField];
      renderJob();

      click("onFinishRepair");

      expect(h.mutations.finishRepair.mutate).toHaveBeenCalledWith({ jobId: "J-1" });
    });
  });

  describe("validate and recalculate", () => {
    const partFields = [
      field("row0_partNumber", "diagnosticPartNumber"),
      field("row1_partNumber", "diagnosticPartNumber"),
    ];

    const validatePayload = () =>
      (h.mutations.validateAndSave.mutate.mock.calls.at(-1)![0] as { payload: ValidatePayload })
        .payload;

    it("normalises materials before validating", async () => {
      h.formInit.allFields = partFields;
      h.apiPayload.diagnostic = {
        materials: [
          { id: "m1", order: "3", partNumber: "AB-12 x" },
          null,
          { id: "m2", order: "abc", partNumber: "CD 34" },
        ],
        archivedMaterials: [{ partNumber: "A1" }, { partNumber: "" }, null],
      };
      renderJob();
      formCtx().sparePartNotBelongsToTool.current.row0_partNumber = true;
      formCtx().sparePartNotBelongsToTool.current.row1_partNumber = false;

      click("onValidate");

      await waitFor(() => expect(h.mutations.validateAndSave.mutate).toHaveBeenCalled());
      const payload = validatePayload();
      expect(payload.materials).toEqual([
        { id: "m2", order: 2, partNumber: "CD34", notBelongsToTool: true },
        { id: "m1", order: 3, partNumber: "AB12x", notBelongsToTool: false },
      ]);
      expect(payload.archivedMaterials).toEqual([{ partNumber: "A1" }]);
      expect(payload.changes).toEqual([]);
      expect(h.mutations.validateAndSave.mutate.mock.calls[0][0].jobId).toBe("J-1");
    });

    it("resets prices when a material has not been saved yet", async () => {
      h.formInit.allFields = partFields;
      h.apiPayload.diagnostic = {
        materials: [
          { id: "m1", order: 1, price: { a: 1 } },
          { order: 2, price: { a: 2 } },
        ],
      };
      renderJob();

      click("onValidate");

      await waitFor(() => expect(h.mutations.validateAndSave.mutate).toHaveBeenCalled());
      const payload = validatePayload();
      expect(payload.status).toBe("DRAFT");
      expect(payload.priceSummary).toBeNull();
      expect(payload.priceSummaryDetailed).toBeNull();
      expect(payload.materials.map((m) => m.price)).toEqual([null, null]);
      expect("archivedMaterials" in payload).toBe(false);
    });

    it("keeps prices when every material has an id", async () => {
      h.apiPayload.diagnostic = { materials: [{ id: "m1", order: 1, price: { a: 1 } }] };
      renderJob();

      click("onValidate");

      await waitFor(() => expect(h.mutations.validateAndSave.mutate).toHaveBeenCalled());
      expect(validatePayload().materials[0].price).toEqual({ a: 1 });
      expect(validatePayload().status).toBeUndefined();
    });

    it("handles payloads without materials", async () => {
      h.apiPayload = {};
      renderJob();

      click("onValidate");

      await waitFor(() => expect(h.mutations.validateAndSave.mutate).toHaveBeenCalled());
      expect(validatePayload()).toEqual({ changes: [] });
    });

    it("validates through the form callback without helpers", async () => {
      renderJob();

      await run(() => callbacks().onValidate({ a: 1 }));

      expect(h.mutations.validateAndSave.mutate).toHaveBeenCalledTimes(1);
    });

    it("does not validate without values, fields or a job id", async () => {
      renderJob();
      await run(() => callbacks().onValidate(undefined));
      expect(h.mutations.validateAndSave.mutate).not.toHaveBeenCalled();

      h.formInit.allFields = null;
      renderJob();
      await run(() => callbacks().onValidate({ a: 1 }));
      expect(h.mutations.validateAndSave.mutate).not.toHaveBeenCalled();

      h.formInit.allFields = [];
      h.params = {};
      renderJob();
      await run(() => callbacks().onValidate({ a: 1 }));
      expect(h.mutations.validateAndSave.mutate).not.toHaveBeenCalled();
    });

    describe("recalculating prices", () => {
      const rowFields = [
        field("row0_discount", "diagnosticDiscount", {
          fieldMapping: { originalName: "discount", nameStartsWith: "row0" },
        }),
        field("row0_discountMaterial", "diagnosticDiscountMaterial", {
          fieldMapping: { originalName: "discountMaterial", nameStartsWith: "row0" },
        }),
        field("row0_materialId", "diagnosticMaterialId", {
          fieldMapping: { originalName: "materialId", nameStartsWith: "row0" },
        }),
        field("row0_unitPrice", "diagnosticUnitPrice", {
          type: "price",
          fieldMapping: { originalName: "unitPrice", nameStartsWith: "row0" },
        }),
        field("row0_status", "diagnosticMaterialStatus", {
          fieldMapping: { originalName: "status", nameStartsWith: "row0" },
        }),
        field("row1_discount", "diagnosticDiscount", {
          fieldMapping: { originalName: "discount", nameStartsWith: "row1" },
        }),
      ];

      beforeEach(() => {
        h.formInit.allFields = rowFields;
        h.formInit.initialFormValues = {
          row0_materialId: "M0",
          row0_unitPrice: 9,
          row0_status: "APPROVED",
        };
        h.apiPayload.diagnostic = { materials: [{ id: "m1", order: 1 }] };
      });

      it("recalculates a plain field change", async () => {
        renderJob();

        act(() => callbacks().onRecalculatePrices("row0_discount", 5));

        expect(h.mutations.recalculate.mutate).toHaveBeenCalledTimes(1);
        const payload = h.mutations.recalculate.mutate.mock.calls[0][0];
        expect(payload.countryCode).toBe("ZA");
        expect(payload.changes).toEqual([
          { type: "discount", lineId: "M0", value: 5, scope: null },
        ]);
        expect(diagCtx().arePricesValidated).toBe(false);
      });

      it("scopes material field changes to chargeable spare parts", () => {
        renderJob();

        act(() => callbacks().onRecalculatePrices("row0_discountMaterial", 7));

        expect(h.mutations.recalculate.mutate.mock.calls[0][0].changes).toEqual([
          {
            type: "discount",
            lineId: "M0",
            value: 7,
            scope: { positions: ["SP", "PN", "AC"], jobTypes: ["CHARGEABLE"] },
          },
        ]);
      });

      it("ignores empty material values", () => {
        renderJob();

        act(() => callbacks().onRecalculatePrices("row0_discountMaterial", 0));

        expect(h.mutations.recalculate.mutate).not.toHaveBeenCalled();
      });

      it("uses an empty line id when the row has no material id field", () => {
        renderJob();

        act(() => callbacks().onRecalculatePrices("row1_discount", 3));

        expect(h.mutations.recalculate.mutate.mock.calls[0][0].changes[0].lineId).toBeUndefined();
      });

      it("ignores unknown fields, missing form fields and pending requests", () => {
        renderJob();
        act(() => callbacks().onRecalculatePrices("unknown", 1));
        expect(h.mutations.recalculate.mutate).not.toHaveBeenCalled();

        h.mutations.recalculate.isPending = true;
        renderJob();
        act(() => callbacks().onRecalculatePrices("row0_discount", 1));
        expect(h.mutations.recalculate.mutate).not.toHaveBeenCalled();

        h.mutations.recalculate.isPending = false;
        h.formInit.allFields = null;
        renderJob();
        act(() => callbacks().onRecalculatePrices("row0_discount", 1));
        expect(h.mutations.recalculate.mutate).not.toHaveBeenCalled();
      });

      it("sends the accumulated changes with the next validation", async () => {
        renderJob();
        act(() => callbacks().onRecalculatePrices("row0_discount", 5));

        click("onValidate");

        await waitFor(() => expect(h.mutations.validateAndSave.mutate).toHaveBeenCalled());
        expect(validatePayload().changes).toEqual([
          { type: "discount", lineId: "M0", value: 5, scope: null },
        ]);
      });

      it("resets the row when a non-price field changes", async () => {
        renderJob();

        act(() => callbacks().onNonPriceFieldChange("row0_discount"));

        await waitFor(() => {
          expect(formValues().row0_materialId).toBeNull();
        });
        expect(formValues().row0_unitPrice).toBe(0);
        expect(formValues().row0_status).toBe("PENDING");
        expect(diagCtx().arePricesValidated).toBe(false);
      });

      it("ignores non-price changes for unknown fields, missing fields and pending requests", async () => {
        renderJob();
        act(() => callbacks().onNonPriceFieldChange("unknown"));
        expect(formValues().row0_status).toBe("APPROVED");

        h.mutations.recalculate.isPending = true;
        renderJob();
        act(() => callbacks().onNonPriceFieldChange("row0_discount"));
        expect(formValues().row0_status).toBe("APPROVED");

        h.mutations.recalculate.isPending = false;
        h.formInit.allFields = null;
        renderJob();
        act(() => callbacks().onNonPriceFieldChange("row0_discount"));
        expect(formValues().row0_status).toBe("APPROVED");
      });
    });
  });

  describe("validate and recalculate responses", () => {
    const diagnostic = { jobId: "J-1", status: "DRAFT", materials: [] };

    beforeEach(() => {
      h.mapped = { faultCode: "FC" };
      h.formInit.allFields = [field("a")];
    });

    it("stores the validated diagnostic and reports success", async () => {
      h.formInit.initialFormValues = { jobType: "WARRANTY" };
      renderJob();
      await waitFor(() => expect(h.formInit.setInitialFormValues).toHaveBeenCalled());
      h.formInit.setInitialFormValues.mockClear();

      await run(() => hook("validateAndSave").onSuccess({ diagnostic }));

      expect(h.queryClient.setQueryData).toHaveBeenCalledWith(["diagnostic", "J-1"], diagnostic);
      expect(h.formInit.setInitialFormValues).toHaveBeenCalled();
      expect(h.manager.markAllValidated).toHaveBeenCalled();
      expect(messages().at(-1)).toMatchObject({ text: "successValidateAndSave", type: "success" });
      expect(h.queryClient.refetchQueries).toHaveBeenCalledWith({ queryKey: ["job", "J-1"] });
      expect(h.track.trackDiagnosticValidated).toHaveBeenCalledWith({
        jobType: "jt:WARRANTY",
        jobStatus: "js:IN_DIAGNOSTICS",
      });
    });

    it("derives the diagnostic from top-level response data", async () => {
      renderJob();

      await run(() => hook("validateAndSave").onSuccess({ materials: [], actionType: "REPAIR" }));

      expect(h.queryClient.setQueryData).toHaveBeenCalledWith(["diagnostic", "J-1"], {
        materials: [],
        actionType: "REPAIR",
        jobId: "J-1",
      });
    });

    it.each([
      ["archived materials", { archivedMaterials: [] }],
      ["a price summary", { priceSummary: { total: 1 } }],
      ["a detailed price summary", { priceSummaryDetailed: { total: 1 } }],
      ["a job type", { jobType: "WARRANTY" }],
    ])("recognises responses with %s", async (_label, response) => {
      renderJob();

      await run(() => hook("validateAndSave").onSuccess(response));

      expect(h.queryClient.setQueryData).toHaveBeenCalledTimes(1);
    });

    it("ignores responses without any diagnostic data", async () => {
      renderJob();

      await run(() => hook("validateAndSave").onSuccess({}));

      expect(h.queryClient.setQueryData).not.toHaveBeenCalled();
      expect(h.manager.markAllValidated).toHaveBeenCalled();
    });

    it("ignores top-level response data without a job id", async () => {
      h.params = {};
      renderJob();

      await run(() => hook("validateAndSave").onSuccess({ materials: [] }));

      expect(h.queryClient.setQueryData).not.toHaveBeenCalled();
    });

    it("lists the unique price errors without the ignored key", async () => {
      renderJob();

      await run(() =>
        hook("validateAndSave").onSuccess({
          errorMessages: [{ key: "2004" }, { key: "3001" }, { key: "3001" }, { key: "3002" }],
        }),
      );

      expect(messages().at(-1)).toMatchObject({
        text: "priceNotAvailable: 3001, 3002",
        type: "error",
        duration: 5000,
      });
      expect(h.manager.markAllValidated).not.toHaveBeenCalled();
      expect(scrollToTop).toHaveBeenCalled();
    });

    it("reports a failed order simulation when only the ignored key is returned", async () => {
      renderJob();

      await run(() => hook("validateAndSave").onSuccess({ errorMessages: [{ key: "2004" }] }));

      expect(messages().at(-1)?.text).toBe("orderSimulationFailed");
    });

    it("does not track a validation without a job type", async () => {
      renderJob();

      await run(() => hook("validateAndSave").onSuccess({ diagnostic }));

      expect(h.track.trackDiagnosticValidated).not.toHaveBeenCalled();
    });

    it("reports validation errors and resets the price validation", async () => {
      renderJob();
      await setValidated(true);
      expect(diagCtx().arePricesValidated).toBe(true);

      act(() => hook("validateAndSave").onError(new Error("x")));

      expect(messages().at(-1)).toMatchObject({
        text: "errorValidateAndSave",
        type: "error",
        duration: 8000,
      });
      expect(diagCtx().arePricesValidated).toBe(false);
      expect(scrollToTop).toHaveBeenCalled();
    });

    it("applies recalculated prices to the form", async () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      h.formInit.initialFormValues = { jobType: "WARRANTY" };
      renderJob();

      act(() => hook("recalculate").onSuccess({ diagnostic }));

      expect(h.queryClient.setQueryData).toHaveBeenCalledWith(["diagnostic", "J-1"], diagnostic);
      expect(h.formInit.setInitialFormValues).toHaveBeenCalled();
      expect(h.track.trackDiagnosticValidated).toHaveBeenCalledWith({
        jobType: "jt:WARRANTY",
        jobStatus: "js:IN_DIAGNOSTICS",
      });
      log.mockRestore();
    });

    it("syncs even when the recalculation returns no diagnostic", () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      renderJob();

      act(() => hook("recalculate").onSuccess({}));

      expect(h.queryClient.setQueryData).not.toHaveBeenCalled();
      expect(h.formInit.setInitialFormValues).toHaveBeenCalled();
      log.mockRestore();
    });

    it("reports recalculation price errors", () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      renderJob();

      act(() => hook("recalculate").onSuccess({ errorMessages: [{ key: "3001" }] }));
      act(() => hook("recalculate").onSuccess({ errorMessages: [{ key: "2004" }] }));

      expect(messages().map((m) => m.text)).toEqual([
        "priceNotAvailable: 3001",
        "orderSimulationFailed",
      ]);
      expect(h.track.trackDiagnosticValidated).not.toHaveBeenCalled();
      log.mockRestore();
    });

    it("reports recalculation errors", async () => {
      renderJob();
      await setValidated(true);

      act(() => hook("recalculate").onError(new Error("x")));

      expect(messages().at(-1)).toMatchObject({
        text: "errorRecalculatePrices",
        type: "error",
        duration: 8000,
      });
      expect(diagCtx().arePricesValidated).toBe(false);
    });
  });

  describe("asset warranty check", () => {
    const assetTab = section("assetData", 1, {}, [
      area("customerWish"),
      area("warrantyDetails"),
      area("other"),
    ]);
    const values = {
      brand: "BOSCH",
      baretoolNumber: "BT-1",
      serialNumber: "SN-1",
      purchaseDate: "2024-01-01",
    };

    beforeEach(() => {
      useTabs([assetTab, section("diagnosticData", 2)]);
      h.sectionEditing.editingSections = new Set(["assetData"]);
    });

    afterEach(async () => {
      const { updateWarrantyFields } = await import("../CreateJob/CreateJob.warranty.utils");
      vi.mocked(updateWarrantyFields).mockImplementation((fields) => fields as never);
    });

    it("checks the warranty when the asset area changes while editing", async () => {
      h.mutations.warranty.mutateAsync.mockResolvedValue({ evaluationStatus: "ELIGIBLE" });
      renderJob();

      act(() => formCtx().onAreaValueChange("asset", values));

      await waitFor(() => expect(h.mutations.warranty.mutateAsync).toHaveBeenCalledTimes(1));
      expect(h.mutations.warranty.mutateAsync).toHaveBeenCalledWith({
        brand: "BOSCH",
        country: "ZA",
        bareToolNumber: "BT-1",
        serialNumber: "SN-1",
        purchaseDate: "2024-01-01",
      });
    });

    it("does not repeat an identical warranty check", async () => {
      h.mutations.warranty.mutateAsync.mockResolvedValue({ evaluationStatus: "ELIGIBLE" });
      renderJob();

      act(() => formCtx().onAreaValueChange("asset", values));
      await waitFor(() => expect(h.mutations.warranty.mutateAsync).toHaveBeenCalledTimes(1));
      act(() => formCtx().onAreaValueChange("asset", values));

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(h.mutations.warranty.mutateAsync).toHaveBeenCalledTimes(1);
    });

    it("skips the check when the payload cannot be built", async () => {
      renderJob();

      act(() => formCtx().onAreaValueChange("asset", { brand: "BOSCH" }));

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(h.mutations.warranty.mutateAsync).not.toHaveBeenCalled();
    });

    it("skips the check when the section is not being edited", async () => {
      h.sectionEditing.editingSections = new Set<string>();
      renderJob();

      act(() => formCtx().onAreaValueChange("asset", values));

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(h.mutations.warranty.mutateAsync).not.toHaveBeenCalled();
    });

    it("skips the check for other areas", async () => {
      renderJob();

      act(() => formCtx().onAreaValueChange("customer", values));

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(h.mutations.warranty.mutateAsync).not.toHaveBeenCalled();
    });

    it("ignores an empty warranty response", async () => {
      h.mutations.warranty.mutateAsync.mockResolvedValue(undefined);
      renderJob();

      act(() => formCtx().onAreaValueChange("asset", values));

      await waitFor(() => expect(h.mutations.warranty.mutateAsync).toHaveBeenCalled());
      expect(h.formInit.setAllFields).not.toHaveBeenCalled();
    });

    it("retries after a failed check", async () => {
      h.mutations.warranty.mutateAsync.mockRejectedValueOnce(new Error("fail"));
      h.mutations.warranty.mutateAsync.mockResolvedValue({ evaluationStatus: "ELIGIBLE" });
      renderJob();

      act(() => formCtx().onAreaValueChange("asset", values));
      await waitFor(() => expect(h.mutations.warranty.mutateAsync).toHaveBeenCalledTimes(1));
      await new Promise((resolve) => setTimeout(resolve, 10));
      act(() => formCtx().onAreaValueChange("asset", values));

      await waitFor(() => expect(h.mutations.warranty.mutateAsync).toHaveBeenCalledTimes(2));
    });

    it("drops stale warranty responses", async () => {
      let resolveFirst: (value: unknown) => void = () => {};
      h.mutations.warranty.mutateAsync
        .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
        .mockResolvedValue({ evaluationStatus: "ELIGIBLE" });
      renderJob();

      act(() => formCtx().onAreaValueChange("asset", values));
      act(() => formCtx().onAreaValueChange("asset", { ...values, serialNumber: "SN-2" }));
      await waitFor(() => expect(h.formInit.setAllFields).toHaveBeenCalledTimes(1));
      h.formInit.setAllFields.mockClear();

      await run(() => resolveFirst({ evaluationStatus: "ELIGIBLE" }));

      expect(h.mutations.warranty.mutateAsync).toHaveBeenCalledTimes(2);
      expect(h.formInit.setAllFields).not.toHaveBeenCalled();
    });

    it("marks ineligible tools as chargeable without a warranty type", async () => {
      h.formInit.initialFormValues = { customerWish: "WARRANTY", warrantyType: "STANDARD" };
      h.mutations.warranty.mutateAsync.mockResolvedValue({ evaluationStatus: "INELIGIBLE" });
      renderJob();

      act(() => formCtx().onAreaValueChange("asset", values));

      await waitFor(() => expect(formValues().customerWish).toBe("CHARGEABLE"));
      expect(formValues().warrantyType).toBe("");
    });

    it("clears a warranty type that is no longer allowed", async () => {
      h.formInit.initialFormValues = { warrantyType: "OTHER" };
      h.mutations.warranty.mutateAsync.mockResolvedValue({
        evaluationStatus: "ELIGIBLE",
        allowed: ["STANDARD"],
      });
      renderJob();

      act(() => formCtx().onAreaValueChange("asset", values));

      await waitFor(() => expect(formValues().warrantyType).toBe(""));
    });

    it("keeps a warranty type that is still allowed", async () => {
      h.formInit.initialFormValues = { warrantyType: "STANDARD" };
      h.mutations.warranty.mutateAsync.mockResolvedValue({
        evaluationStatus: "ELIGIBLE",
        allowed: ["STANDARD"],
      });
      renderJob();

      act(() => formCtx().onAreaValueChange("asset", values));

      await waitFor(() => expect(h.formInit.setAllFields).toHaveBeenCalled());
      expect(formValues().warrantyType).toBe("STANDARD");
    });

    it("updates the asset tab areas with the warranty result", async () => {
      h.mutations.warranty.mutateAsync.mockResolvedValue({ evaluationStatus: "ELIGIBLE" });
      const { updateWarrantyFields } = await import("../CreateJob/CreateJob.warranty.utils");
      renderJob();

      act(() => formCtx().onAreaValueChange("asset", values));
      await waitFor(() => expect(h.formInit.setTabs).toHaveBeenCalled());

      const updater = h.formInit.setTabs.mock.calls.at(-1)![0] as (prev: Section[]) => Section[];
      const other = section("diagnosticData", 2);
      vi.mocked(updateWarrantyFields).mockClear();
      const result = updater([assetTab, other]);

      expect(vi.mocked(updateWarrantyFields)).toHaveBeenCalledTimes(2);
      expect(result[1]).toBe(other);
      expect(result[0].areas[2]).toBe(assetTab.areas[2]);
    });

    it("falls back to the original fields when no warranty fields are updated", async () => {
      h.mutations.warranty.mutateAsync.mockResolvedValue({ evaluationStatus: "ELIGIBLE" });
      const { updateWarrantyFields } = await import("../CreateJob/CreateJob.warranty.utils");
      renderJob();

      act(() => formCtx().onAreaValueChange("asset", values));
      await waitFor(() => expect(h.formInit.setTabs).toHaveBeenCalled());

      vi.mocked(updateWarrantyFields).mockReturnValue(null as never);
      const updater = h.formInit.setTabs.mock.calls.at(-1)![0] as (prev: Section[]) => Section[];
      const result = updater([assetTab]);

      expect(result[0].areas[0].fields).toBe(assetTab.areas[0].fields);
      vi.mocked(updateWarrantyFields).mockImplementation((fields) => fields as never);
    });
  });

  describe("price validation reset", () => {
    it("resets validated prices when a diagnostics area changes", async () => {
      renderJob();
      await setValidated(true);

      act(() => formCtx().onAreaValueChange("diagnosticData_row"));

      expect(diagCtx().arePricesValidated).toBe(false);
    });

    it("keeps validated prices for other areas", async () => {
      renderJob();
      await setValidated(true);

      act(() => formCtx().onAreaValueChange("customer"));

      expect(diagCtx().arePricesValidated).toBe(true);
    });

    it("ignores diagnostics changes while prices are not validated", () => {
      renderJob();

      act(() => formCtx().onAreaValueChange("diagnosticData_row"));

      expect(diagCtx().arePricesValidated).toBe(false);
    });
  });

  describe("warranty panel info", () => {
    const asset = (overrides: Record<string, unknown> = {}) => ({
      purchaseDate: "2024-01-01",
      ...overrides,
    });

    it("uses the stored warranty information", () => {
      useJob(
        makeJob({
          asset: asset({
            warrantyInformation: {
              warrantyType: "STANDARD",
              evaluation: { status: "ELIGIBLE" },
              validityExpirationDate: "2026-01-01",
              usedWarrantyRepairCount: 1,
              allowedWarrantyRepairCount: 3,
              proServiceType: "PRO",
              extendedType: "EXT",
            },
          }),
        }),
      );
      renderJob();

      expect(formCtx().warrantyPanelInfo).toMatchObject({
        supportedWarrantyType: "STANDARD",
        isIneligible: false,
        hasPurchaseDate: true,
        validityExpirationDate: "fmt:2026-01-01",
        unavailableMessage: "",
        infoPayload: {
          reasonKey: undefined,
          usedWarrantyRepairCount: 1,
          allowedWarrantyRepairCount: 3,
          recommendation: "rec:PRO:EXT",
          validityExpirationDate: "fmt:2026-01-01",
        },
      });
    });

    it("flags ineligible warranties with their reason", () => {
      useJob(
        makeJob({
          asset: asset({
            warrantyInformation: {
              warrantyType: null,
              evaluation: { status: "INELIGIBLE", ineligibleReason: "WARRANTY_EXPIRED" },
            },
          }),
        }),
      );
      renderJob();

      expect(formCtx().warrantyPanelInfo).toMatchObject({
        supportedWarrantyType: "NONE",
        isIneligible: true,
        unavailableMessage: "unavailable:WARRANTY_EXPIRED",
        infoPayload: { reasonKey: "WARRANTY_EXPIRED", usedWarrantyRepairCount: 0 },
      });
    });

    it("treats unknown reasons as untyped", () => {
      useJob(
        makeJob({
          asset: asset({
            warrantyInformation: {
              warrantyType: null,
              evaluation: { status: "INELIGIBLE", ineligibleReason: "SOMETHING_ELSE" },
            },
          }),
        }),
      );
      renderJob();

      expect(formCtx().warrantyPanelInfo.infoPayload.reasonKey).toBeUndefined();
    });

    it("treats a missing warranty type as ineligible unless evaluation was skipped", () => {
      useJob(
        makeJob({
          asset: asset({
            warrantyInformation: { warrantyType: null, evaluation: { status: "SKIPPED" } },
          }),
        }),
      );
      renderJob();

      expect(formCtx().warrantyPanelInfo.isIneligible).toBe(false);
    });

    it("is ineligible without a purchase date", () => {
      useJob(makeJob({ asset: { warrantyInformation: { warrantyType: "STANDARD" } } }));
      renderJob();

      expect(formCtx().warrantyPanelInfo).toMatchObject({
        isIneligible: true,
        hasPurchaseDate: false,
      });
    });

    it("uses the warranty check result when no warranty information is stored", () => {
      useJob(makeJob({ asset: asset() }));
      h.mutations.warranty.data = {
        evaluationStatus: "INELIGIBLE",
        reasonKey: "ALLOWED_REPAIR_COUNT_EXCEEDED",
        validityExpirationDate: "2025-01-01",
        usedWarrantyRepairCount: 4,
        allowedWarrantyRepairCount: 3,
        proServiceType: "P",
        extendedType: "E",
      };
      renderJob();

      expect(formCtx().warrantyPanelInfo).toMatchObject({
        supportedWarrantyType: "NONE",
        isIneligible: true,
        unavailableMessage: "unavailable:ALLOWED_REPAIR_COUNT_EXCEEDED",
        infoPayload: {
          reasonKey: "ALLOWED_REPAIR_COUNT_EXCEEDED",
          usedWarrantyRepairCount: 4,
          allowedWarrantyRepairCount: 3,
          recommendation: "rec:P:E",
        },
      });
    });

    it("uses an eligible warranty check result", () => {
      useJob(makeJob({ asset: asset() }));
      h.mutations.warranty.data = {
        evaluationStatus: "ELIGIBLE",
        supportedWarrantyType: "EXTENDED",
      };
      renderJob();

      expect(formCtx().warrantyPanelInfo).toMatchObject({
        supportedWarrantyType: "EXTENDED",
        isIneligible: false,
        unavailableMessage: "",
        infoPayload: { reasonKey: undefined },
      });
    });

    it("treats unknown reasons of a check result as untyped", () => {
      useJob(makeJob({ asset: asset() }));
      h.mutations.warranty.data = { evaluationStatus: "INELIGIBLE", reasonKey: "OTHER" };
      renderJob();

      expect(formCtx().warrantyPanelInfo.infoPayload.reasonKey).toBeUndefined();
    });

    it("runs a warranty check for complete assets without warranty information", () => {
      useJob(
        makeJob({
          asset: {
            brand: "BOSCH",
            bareToolNumber: "BT-1",
            serialNumber: "SN-1",
            purchaseDate: "2024-01-01",
          },
        }),
      );
      renderJob();

      expect(h.mutations.warranty.mutate).toHaveBeenCalledWith({
        brand: "BOSCH",
        country: "ZA",
        bareToolNumber: "BT-1",
        serialNumber: "SN-1",
        purchaseDate: "2024-01-01",
      });
    });

    it("skips the automatic warranty check for incomplete assets", () => {
      useJob(makeJob({ asset: { brand: "BOSCH", purchaseDate: "2024-01-01" } }));
      renderJob();

      expect(h.mutations.warranty.mutate).not.toHaveBeenCalled();
    });

    it("skips the automatic warranty check when the order has no country", () => {
      useJob(
        makeJob(
          {
            asset: {
              brand: "BOSCH",
              bareToolNumber: "BT-1",
              serialNumber: "SN-1",
              purchaseDate: "2024-01-01",
            },
          },
          { countryCode: undefined },
        ),
      );
      renderJob();

      expect(h.mutations.warranty.mutate).not.toHaveBeenCalled();
    });
  });

  describe("enable and show callbacks", () => {
    const typeField = (name: string) => field(name, "diagnosticType");

    it("enableValidate follows pending state, status and the manager", () => {
      h.chargeable = { pendingTypeFields: [typeField("t0")], hasChargeablePending: true };
      renderJob();
      expect(callbacks().enableValidate()).toBe(true);

      h.manager = makeManager({ enableValidate: vi.fn(() => false) });
      renderJob();
      expect(callbacks().enableValidate()).toBe(false);

      h.manager = makeManager();
      h.chargeable = { pendingTypeFields: [], hasChargeablePending: false };
      renderJob();
      expect(callbacks().enableValidate()).toBe(false);

      h.chargeable = { pendingTypeFields: [typeField("t0")], hasChargeablePending: true };
      h.mutations.validateAndSave.isPending = true;
      renderJob();
      expect(callbacks().enableValidate()).toBe(false);

      h.mutations.validateAndSave.isPending = false;
      useJob(makeJob({ jobStatus: "CUSTOMER_APPROVAL_PENDING" }));
      renderJob();
      expect(callbacks().enableValidate()).toBe(false);
    });

    it("enableAddingSparePart checks the remaining capacity per position", () => {
      h.formInit.allFields = [
        field("row0_position", "diagnosticPosition"),
        field("row1_position", "diagnosticPosition"),
      ];
      h.formInit.initialFormValues = { row0_position: "SP", row1_position: "SP" };
      h.manager = makeManager({ allowedPositions: [] });
      renderJob();
      expect(callbacks().enableAddingSparePart()).toBe(false);

      h.manager = makeManager({ allowedPositions: [{ position: "SP", maxCount: 2 }] });
      renderJob();
      expect(callbacks().enableAddingSparePart()).toBe(false);

      h.manager = makeManager({ allowedPositions: [{ position: "SP", maxCount: 3 }] });
      renderJob();
      expect(callbacks().enableAddingSparePart()).toBe(true);
    });

    it("enableAddingSparePart handles missing form fields", () => {
      h.formInit.allFields = null;
      h.manager = makeManager({ allowedPositions: [{ position: "SP", maxCount: 1 }] });
      renderJob();

      expect(callbacks().enableAddingSparePart()).toBe(true);
      expect(callbacks().enableProductDetails()).toBe(true);
    });

    it("enableProductDetails checks the SP capacity", () => {
      h.formInit.allFields = [field("row0_position", "diagnosticPosition")];
      h.formInit.initialFormValues = { row0_position: "SP" };
      h.manager = makeManager({ allowedPositions: [{ position: "LA", maxCount: 1 }] });
      renderJob();
      expect(callbacks().enableProductDetails()).toBe(false);

      h.manager = makeManager({ allowedPositions: [{ position: "SP", maxCount: 1 }] });
      renderJob();
      expect(callbacks().enableProductDetails()).toBe(false);

      h.manager = makeManager({ allowedPositions: [{ position: "SP", maxCount: 2 }] });
      renderJob();
      expect(callbacks().enableProductDetails()).toBe(true);
    });

    it("locks product details and add row while the repair answer is locked", async () => {
      h.diagnostic.diagnosticData = { customerAnswer: "REPAIR" };
      h.manager = makeManager({ allowedPositions: [{ position: "SP", maxCount: 5 }] });
      useJob(makeJob({ jobStatus: "CUSTOMER_APPROVAL_PENDING" }));
      renderJob();

      await waitFor(() => expect(formCtx().isRepairAnswerLocked).toBe(true));
      expect(callbacks().showProductDetails()).toBe(false);
      expect(callbacks().showAddRow()).toBe(false);
      expect(callbacks().enableProductDetails()).toBe(false);
    });

    it("keeps product details visible when the repair answer is not locked", () => {
      renderJob();

      expect(formCtx().isRepairAnswerLocked).toBe(false);
      expect(callbacks().showProductDetails()).toBe(true);
      expect(callbacks().showAddRow()).toBe(true);
    });

    it("mirrors the special materials permission", () => {
      h.manager = makeManager({ addSpecialMaterialsAllowed: true });
      renderJob();

      expect(callbacks().enableAddingSpecialMaterials()).toBe(true);
    });

    it.each([
      ["enableGoToNextStep", "startDiagnostic"],
      ["enableHold", "toggleHold"],
      ["enableStartRepair", "startRepair"],
      ["enableFinishRepair", "finishRepair"],
      ["enableToolDelivered", "toolDelivered"],
      ["enableSaveCustomer", "postCustomer"],
      ["enableSaveAsset", "patchJob"],
      ["enableSaveNote", "postMessage"],
    ])("%s is disabled while its request is pending", (callback, key) => {
      renderJob();
      expect(callbacks()[callback]()).toBe(true);

      h.mutations[key].isPending = true;
      renderJob();
      expect(callbacks()[callback]()).toBe(false);
    });

    it("enableSubmitForReview needs validated prices and no pending request", async () => {
      renderJob();
      expect(callbacks().enableSubmitForReview()).toBe(false);

      await setValidated(true);
      expect(callbacks().enableSubmitForReview()).toBe(true);

      h.mutations.startReview.isPending = true;
      renderJob();
      await setValidated(true);
      expect(callbacks().enableSubmitForReview()).toBe(false);
    });

    it("showStartRepair depends on pending types and permission", () => {
      renderJob();
      expect(callbacks().showStartRepair()).toBe(true);

      h.chargeable = { pendingTypeFields: [typeField("t0")], hasChargeablePending: true };
      h.formInit.initialFormValues = { t0: "CHARGEABLE" };
      renderJob();
      expect(callbacks().showStartRepair()).toBe(false);

      h.hasSendForReview = true;
      renderJob();
      expect(callbacks().showStartRepair()).toBe(true);

      h.hasSendForReview = false;
      h.formInit.initialFormValues = { t0: "WARRANTY" };
      renderJob();
      expect(callbacks().showStartRepair()).toBe(true);

      h.formInit.initialFormValues = { t0: "SERVICE_OFFERING" };
      renderJob();
      expect(callbacks().showStartRepair()).toBe(true);
    });

    it("enableApproveForRepair depends on the pending types and validation", async () => {
      renderJob();
      expect(callbacks().enableApproveForRepair()).toBe(true);

      h.chargeable = { pendingTypeFields: [typeField("t0")], hasChargeablePending: true };
      h.formInit.initialFormValues = { t0: "WARRANTY" };
      renderJob();
      expect(callbacks().enableApproveForRepair()).toBe(false);

      await setValidated(true);
      expect(callbacks().enableApproveForRepair()).toBe(true);

      h.formInit.initialFormValues = { t0: "CHARGEABLE" };
      renderJob();
      await setValidated(true);
      expect(callbacks().enableApproveForRepair()).toBe(false);

      h.mutations.repairApproval.isPending = true;
      renderJob();
      expect(callbacks().enableApproveForRepair()).toBe(false);
    });

    it("enableRequestApproval covers the default flow", async () => {
      h.bosch = { pendingTypeFields: [], hasBoschInternalPending: true };
      renderJob();
      expect(callbacks().enableRequestApproval()).toBe(false);

      await setValidated(true);
      expect(callbacks().enableRequestApproval()).toBe(true);

      h.mutations.internalApproval.isPending = true;
      renderJob();
      await setValidated(true);
      expect(callbacks().enableRequestApproval()).toBe(false);
    });

    it("enableRequestApproval is false when materials need revision or approval is pending", async () => {
      h.bosch = { pendingTypeFields: [], hasBoschInternalPending: true };
      h.manager = makeManager({ materials: [{ status: "REVISED" }] });
      renderJob();
      await setValidated(true);
      expect(callbacks().enableRequestApproval()).toBe(false);

      h.manager = makeManager({ materials: [{ status: "REJECTED" }] });
      renderJob();
      await setValidated(true);
      expect(callbacks().enableRequestApproval()).toBe(false);

      h.manager = makeManager();
      useJob(makeJob({ pendingApprovals: ["BOSCH_INTERNAL"] }));
      renderJob();
      await setValidated(true);
      expect(callbacks().enableRequestApproval()).toBe(false);
    });

    it.each(["REVISED", "REJECTED"])("enableRequestApproval for %s jobs", async (status) => {
      h.bosch = { pendingTypeFields: [], hasBoschInternalPending: true };
      h.manager = makeManager({ materials: [{ status: "PENDING" }] });
      useJob(makeJob({ jobStatus: status }));
      renderJob();
      await setValidated(true);
      expect(callbacks().enableRequestApproval()).toBe(true);

      h.bosch = { pendingTypeFields: [], hasBoschInternalPending: false };
      renderJob();
      await setValidated(true);
      expect(callbacks().enableRequestApproval()).toBe(false);
    });

    it("showRequestApproval follows the Bosch internal pending state", () => {
      h.bosch = { pendingTypeFields: [], hasBoschInternalPending: true };
      renderJob();
      expect(callbacks().showRequestApproval()).toBe(true);

      useJob(makeJob({ pendingApprovals: ["BOSCH_INTERNAL"] }));
      renderJob();
      expect(callbacks().showRequestApproval()).toBe(false);

      useJob(makeJob({ jobStatus: "REVISED", pendingApprovals: ["BOSCH_INTERNAL"] }));
      renderJob();
      expect(callbacks().showRequestApproval()).toBe(true);

      useJob(makeJob({ jobStatus: "REJECTED" }));
      h.bosch = { pendingTypeFields: [], hasBoschInternalPending: false };
      renderJob();
      expect(callbacks().showRequestApproval()).toBe(false);
    });

    it("showApproveForRepair hides while an approval request is possible", async () => {
      h.bosch = { pendingTypeFields: [], hasBoschInternalPending: true };
      h.chargeable = { pendingTypeFields: [], hasChargeablePending: true };
      renderJob();
      await setValidated(true);
      expect(callbacks().showApproveForRepair()).toBe(false);

      useJob(makeJob({ pendingApprovals: ["BOSCH_INTERNAL"] }));
      renderJob();
      await setValidated(true);
      expect(callbacks().showApproveForRepair()).toBe(false);

      h.chargeable = { pendingTypeFields: [], hasChargeablePending: false };
      renderJob();
      expect(callbacks().showApproveForRepair()).toBe(true);

      h.chargeable = { pendingTypeFields: [], hasChargeablePending: true };
      h.bosch = { pendingTypeFields: [], hasBoschInternalPending: false };
      renderJob();
      expect(callbacks().showApproveForRepair()).toBe(true);
    });

    it("cost estimate callbacks depend on chargeable pending rows", async () => {
      h.chargeable = { pendingTypeFields: [], hasChargeablePending: true };
      renderJob();
      expect(callbacks().showCreateCostEstimate()).toBe(true);
      expect(callbacks().enableCreateCostEstimate()).toBe(false);

      await setValidated(true);
      expect(callbacks().enableCreateCostEstimate()).toBe(true);

      h.mutations.createCostEstimate.isPending = true;
      renderJob();
      await setValidated(true);
      expect(callbacks().enableCreateCostEstimate()).toBe(false);

      h.mutations.createCostEstimate.isPending = false;
      useJob(makeJob({ pendingApprovals: ["CUSTOMER"] }));
      renderJob();
      await setValidated(true);
      expect(callbacks().showCreateCostEstimate()).toBe(false);
      expect(callbacks().enableCreateCostEstimate()).toBe(false);
    });

    it("customer answer callbacks follow the status and pending approvals", () => {
      renderJob();
      expect(callbacks().showCustomerAnswer()).toBe(false);
      expect(callbacks().enableCustomerAnswer()).toBe(false);

      useJob(makeJob({ jobStatus: "CUSTOMER_APPROVAL_PENDING" }));
      renderJob();
      expect(callbacks().showCustomerAnswer()).toBe(true);
      expect(callbacks().enableCustomerAnswer()).toBe(true);

      useJob(makeJob({ jobStatus: "MULTIPLE_APPROVAL_PENDING" }));
      renderJob();
      expect(callbacks().showCustomerAnswer()).toBe(true);
      expect(callbacks().enableCustomerAnswer()).toBe(true);

      h.location = { state: { from: "approval-list" } };
      renderJob();
      expect(callbacks().showCustomerAnswer()).toBe(false);
      expect(callbacks().enableCustomerAnswer()).toBe(false);

      h.location = { state: null };
      h.chargeable = { pendingTypeFields: [], hasChargeablePending: true };
      useJob(makeJob({ pendingApprovals: ["CUSTOMER"] }));
      renderJob();
      expect(callbacks().showCustomerAnswer()).toBe(true);
      expect(callbacks().enableCustomerAnswer()).toBe(true);

      h.mutations.customerAnswer.isPending = true;
      renderJob();
      expect(callbacks().enableCustomerAnswer()).toBe(false);
    });
  });

  describe("contexts", () => {
    it("wraps setAllFields so functional updates receive an empty list for missing state", () => {
      renderJob();

      act(() => formCtx().setAllFields((prev: Field[]) => [...prev, field("added")]));
      const updater = h.formInit.setAllFields.mock.calls.at(-1)![0] as (
        prev: Field[] | undefined,
      ) => Field[];
      expect(updater(undefined).map((f) => f.name)).toEqual(["added"]);

      const direct = [field("direct")];
      act(() => formCtx().setAllFields(direct));
      expect(h.formInit.setAllFields).toHaveBeenLastCalledWith(direct);
    });

    it("exposes the summary type options to radio sources and the diagnostics context", () => {
      renderJob();
      expect(formCtx().radioSourceCallbacks.getRadioButtonsForSummaryType()).toEqual([
        { value: "totalSummary", label: "totalSummary" },
      ]);

      act(() => diagCtx().setSummaryTypeOptions([{ label: "a", value: "a" }]));

      expect(formCtx().radioSourceCallbacks.getRadioButtonsForSummaryType()).toEqual([
        { label: "a", value: "a" },
      ]);
      expect(diagCtx().summaryTypeOptions).toEqual([{ label: "a", value: "a" }]);
    });

    it("keeps setMandatoryFields as a no-op", () => {
      renderJob();

      expect(() => formCtx().setMandatoryFields()).not.toThrow();
    });

    it("disables the action bar while a file is being deleted", () => {
      renderJob();

      act(() => formCtx().onDeleteStart());
      expect(screen.getByTestId("generic-action")).toHaveAttribute("data-disabled", "true");

      act(() => formCtx().onDeleteEnd());
      expect(screen.getByTestId("generic-action")).toHaveAttribute("data-disabled", "false");
    });

    it("tracks validation in progress in the diagnostics context", () => {
      renderJob();
      expect(diagCtx().isValidating).toBe(false);

      h.mutations.validateAndSave.isPending = true;
      renderJob();
      expect(diagCtx().isValidating).toBe(true);

      h.mutations.validateAndSave.isPending = false;
      h.mutations.recalculate.isPending = true;
      renderJob();
      expect(diagCtx().isValidating).toBe(true);
    });

    it("exposes the job status and archive capability", () => {
      h.manager = makeManager({ canArchiveOnDelete: false });
      renderJob();

      expect(diagCtx().jobStatus).toBe("IN_DIAGNOSTICS");
      expect(diagCtx().canArchiveOnDelete).toBe(false);
    });

    it("reports populated prices based on the materials", () => {
      h.manager = makeManager({
        materials: [{ unitPrice: 0, netAmount: 0, grossAmount: 0, totalAmount: 5 }],
      });
      renderJob();

      expect(diagCtx().hasPricesPopulated).toBe(true);
    });

    it("reports unpopulated prices when every amount is zero", () => {
      h.manager = makeManager({
        materials: [{ unitPrice: 0, netAmount: 0, grossAmount: 0, totalAmount: 0 }],
      });
      renderJob();

      expect(diagCtx().hasPricesPopulated).toBe(false);
    });

    it("renders the loading, error and empty states", () => {
      h.jobQuery = { data: undefined, isLoading: true, error: null };
      useJobByIdMock.mockReturnValue(h.jobQuery);
      renderJob();
      expect(screen.getByText("loading-indicator")).toBeInTheDocument();

      h.jobQuery = { data: undefined, isLoading: false, error: new Error("boom") };
      useJobByIdMock.mockReturnValue(h.jobQuery);
      renderJob();
      expect(screen.getByText(/boom/)).toBeInTheDocument();

      h.jobQuery = { data: undefined, isLoading: false, error: null };
      useJobByIdMock.mockReturnValue(h.jobQuery);
      renderJob();
      expect(screen.getByText("noJobFound")).toBeInTheDocument();
    });
  });
});
